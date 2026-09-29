import {
  isControlId,
} from './ids.mjs';

import {
  isTerminalTaskState,
  parseControlTaskRecord,
} from './task-state.mjs';

const KINDS = new Set([
  'task',
  'cancel',
  'revoke',
]);

const PRIORITY = Object.freeze({
  task: 10,
  cancel: 100,
  revoke: 110,
});

function validTime(value) {
  return (
    Number.isSafeInteger(value)
    && value >= 0
  );
}

function freezeEntry(value) {
  return Object.freeze({
    ...value,
  });
}

export function createResumeCursor(
  {
    deviceId,
    sequence,
    issuedAtMs,
  } = {},
) {
  if (
    !isControlId(
      'device',
      deviceId,
    )
    || !Number.isSafeInteger(sequence)
    || sequence < 0
    || !validTime(issuedAtMs)
  ) {
    return null;
  }

  return Object.freeze({
    protocolVersion: '1.0',
    deviceId,
    sequence,
    issuedAtMs,
  });
}

export function parseResumeCursor(
  input,
) {
  if (
    !input
    || typeof input !== 'object'
    || Array.isArray(input)
    || Object.keys(input).length !== 4
    || input.protocolVersion !== '1.0'
  ) {
    return null;
  }

  return createResumeCursor(input);
}

export function createDeliveryEntry(
  {
    kind,
    deliveryId,
    sequence,
    taskRecord,
    queuedAtMs,
  } = {},
) {
  const record =
    parseControlTaskRecord(
      taskRecord,
    );

  if (
    !KINDS.has(kind)
    || !record
    || !isControlId(
      'delivery',
      deliveryId,
    )
    || !Number.isSafeInteger(sequence)
    || sequence < 1
    || !validTime(queuedAtMs)
    || queuedAtMs < record.createdAtMs
  ) {
    return null;
  }

  if (
    kind === 'task'
    && (
      record.state !== 'delivered'
      || record.currentDeliveryId
        !== deliveryId
      || isTerminalTaskState(
        record.state,
      )
    )
  ) {
    return null;
  }

  if (
    kind === 'cancel'
    && record.state !== 'cancelled'
  ) {
    return null;
  }

  if (
    kind === 'revoke'
    && record.state !== 'revoked'
  ) {
    return null;
  }

  return freezeEntry({
    protocolVersion: '1.0',
    kind,
    priority: PRIORITY[kind],
    sequence,
    deliveryId,
    taskId:
      record.task.taskId,
    accountId:
      record.task.accountId,
    deviceId:
      record.task
        .destinationDeviceId,
    taskRevision:
      record.revision,
    queuedAtMs,
    expiresAtMs:
      record.task.expiresAtMs,
    payloadDigest:
      record.task.payloadDigest,
  });
}

export class BoundedDeliveryQueue {
  constructor({
    maxEntriesPerDevice = 256,
    controlReserve = 16,
    retentionWindow = 256,
    maxCursorAgeMs = 5 * 60 * 1000,
    maxSeenDeliveries = 16_384,
  } = {}) {
    if (
      !Number.isInteger(
        maxEntriesPerDevice,
      )
      || maxEntriesPerDevice < 1
      || maxEntriesPerDevice > 4096
      || !Number.isInteger(
        controlReserve,
      )
      || controlReserve < 1
      || controlReserve > 256
      || !Number.isInteger(
        retentionWindow,
      )
      || retentionWindow < 1
      || retentionWindow > 4096
      || !Number.isInteger(
        maxCursorAgeMs,
      )
      || maxCursorAgeMs < 1_000
      || maxCursorAgeMs
        > 3_600_000
      || !Number.isInteger(
        maxSeenDeliveries,
      )
      || maxSeenDeliveries < 1
      || maxSeenDeliveries
        > 1_000_000
    ) {
      throw new TypeError(
        'Invalid delivery queue limits.',
      );
    }

    this.maxEntriesPerDevice =
      maxEntriesPerDevice;
    this.controlReserve =
      controlReserve;
    this.retentionWindow =
      retentionWindow;
    this.maxCursorAgeMs =
      maxCursorAgeMs;
    this.maxSeenDeliveries =
      maxSeenDeliveries;
    this.devices = new Map();
    this.byDelivery = new Map();
    this.seenDeliveries =
      new Map();
  }

  stateFor(deviceId) {
    if (
      !isControlId(
        'device',
        deviceId,
      )
    ) {
      throw new TypeError(
        'Invalid device id.',
      );
    }

    if (!this.devices.has(deviceId)) {
      this.devices.set(
        deviceId,
        {
          nextSequence: 1,
          entries: [],
          acknowledgedSequence: 0,
        },
      );
    }

    return this.devices.get(deviceId);
  }

  pruneExpired(
    deviceId,
    trustedNowMs,
  ) {
    const state =
      this.stateFor(deviceId);
    const retained = [];

    for (const entry of state.entries) {
      if (
        entry.expiresAtMs
          > trustedNowMs
      ) {
        retained.push(entry);
      } else {
        this.byDelivery.delete(
          entry.deliveryId,
        );
      }
    }

    state.entries = retained;
  }

  seenBinding(entry) {
    return Object.freeze({
      kind: entry.kind,
      taskId: entry.taskId,
      deviceId: entry.deviceId,
      taskRevision:
        entry.taskRevision,
      payloadDigest:
        entry.payloadDigest,
    });
  }

  remember(entry) {
    if (
      this.seenDeliveries.has(
        entry.deliveryId,
      )
    ) {
      return true;
    }

    if (
      this.seenDeliveries.size
        >= this.maxSeenDeliveries
    ) {
      return false;
    }

    this.seenDeliveries.set(
      entry.deliveryId,
      this.seenBinding(entry),
    );

    return true;
  }

  enqueue(
    kind,
    taskRecord,
    {
      deliveryId,
      trustedNowMs,
    } = {},
  ) {
    const record =
      parseControlTaskRecord(
        taskRecord,
      );

    if (
      !record
      || !validTime(trustedNowMs)
      || trustedNowMs
        < record.updatedAtMs
      || trustedNowMs
        >= record.task.expiresAtMs
    ) {
      return Object.freeze({
        accepted: false,
        reason:
          'delivery_enqueue_invalid',
      });
    }

    const deviceId =
      record.task
        .destinationDeviceId;
    const state =
      this.stateFor(deviceId);

    this.pruneExpired(
      deviceId,
      trustedNowMs,
    );

    const existing =
      this.byDelivery.get(
        deliveryId,
      );
    const seen =
      this.seenDeliveries.get(
        deliveryId,
      );
    const exactBinding = (
      binding,
    ) => (
      binding
      && binding.kind === kind
      && binding.taskId
        === record.task.taskId
      && binding.deviceId
        === deviceId
      && binding.taskRevision
        === record.revision
      && binding.payloadDigest
        === record.task.payloadDigest
    );

    if (existing) {
      if (exactBinding(existing)) {
        return Object.freeze({
          accepted: true,
          duplicate: true,
          entry: existing,
        });
      }

      return Object.freeze({
        accepted: false,
        reason:
          'delivery_id_conflict',
      });
    }

    if (seen) {
      return Object.freeze({
        accepted: false,
        reason:
          exactBinding(seen)
            ? 'delivery_replay_stale'
            : 'delivery_id_conflict',
      });
    }

    const pendingSameTask =
      state.entries
        .filter(
          (entry) =>
            entry.sequence
              > state
                .acknowledgedSequence
            && entry.taskId
              === record.task.taskId,
        )
        .sort(
          (a, b) =>
            a.sequence
              - b.sequence,
        );

    if (pendingSameTask.length > 0) {
      const sequence =
        pendingSameTask[0]
          .sequence;
      const replacement =
        createDeliveryEntry({
          kind,
          deliveryId,
          sequence,
          taskRecord: record,
          queuedAtMs:
            trustedNowMs,
        });

      if (!replacement) {
        return Object.freeze({
          accepted: false,
          reason:
            'delivery_entry_invalid',
        });
      }

      const replacedIds =
        new Set(
          pendingSameTask.map(
            (entry) =>
              entry.deliveryId,
          ),
        );

      state.entries =
        state.entries
          .filter(
            (entry) =>
              !replacedIds.has(
                entry.deliveryId,
              ),
          );

      for (
        const replacedId of
          replacedIds
      ) {
        this.byDelivery.delete(
          replacedId,
        );
      }

      state.entries.push(
        replacement,
      );
      state.entries.sort(
        (a, b) =>
          a.sequence
            - b.sequence,
      );
      if (!this.remember(replacement)) {
        return Object.freeze({
          accepted: false,
          reason:
            'delivery_history_capacity',
        });
      }

      this.byDelivery.set(
        deliveryId,
        replacement,
      );

      return Object.freeze({
        accepted: true,
        duplicate: false,
        superseded: true,
        entry: replacement,
      });
    }

    const unacknowledged =
      state.entries.filter(
        (entry) =>
          entry.sequence
            > state
              .acknowledgedSequence,
      );

    const isControl =
      kind === 'cancel'
      || kind === 'revoke';
    const capacity =
      this.maxEntriesPerDevice
      + (
        isControl
          ? this.controlReserve
          : 0
      );

    if (
      unacknowledged.length
        >= capacity
    ) {
      return Object.freeze({
        accepted: false,
        reason:
          isControl
            ? 'delivery_priority_capacity_exhausted'
            : 'delivery_backpressure',
      });
    }

    const entry =
      createDeliveryEntry({
        kind,
        deliveryId,
        sequence:
          state.nextSequence,
        taskRecord: record,
        queuedAtMs:
          trustedNowMs,
      });

    if (!entry) {
      return Object.freeze({
        accepted: false,
        reason:
          'delivery_entry_invalid',
      });
    }

    if (!this.remember(entry)) {
      return Object.freeze({
        accepted: false,
        reason:
          'delivery_history_capacity',
      });
    }

    state.nextSequence += 1;
    state.entries.push(entry);
    this.byDelivery.set(
      deliveryId,
      entry,
    );

    this.compact(deviceId);

    return Object.freeze({
      accepted: true,
      duplicate: false,
      entry,
    });
  }

  acknowledge(
    deviceId,
    sequence,
  ) {
    const state =
      this.stateFor(deviceId);

    if (
      !Number.isSafeInteger(sequence)
      || sequence < 0
      || sequence
        > state.nextSequence - 1
    ) {
      return Object.freeze({
        accepted: false,
        reason:
          'delivery_ack_invalid',
      });
    }

    if (
      sequence
        < state.acknowledgedSequence
    ) {
      return Object.freeze({
        accepted: false,
        reason:
          'delivery_ack_stale',
      });
    }

    if (
      sequence
        === state
          .acknowledgedSequence
    ) {
      return Object.freeze({
        accepted: true,
        duplicate: true,
        sequence,
      });
    }

    state.acknowledgedSequence =
      sequence;
    this.compact(deviceId);

    return Object.freeze({
      accepted: true,
      duplicate: false,
      sequence,
    });
  }

  resume(
    cursorInput,
    trustedNowMs,
    {
      limit = 64,
    } = {},
  ) {
    const cursor =
      parseResumeCursor(
        cursorInput,
      );

    if (
      !cursor
      || !validTime(trustedNowMs)
      || cursor.issuedAtMs
        > trustedNowMs
      || trustedNowMs
        - cursor.issuedAtMs
        > this.maxCursorAgeMs
      || !Number.isInteger(limit)
      || limit < 1
      || limit > 256
    ) {
      return Object.freeze({
        accepted: false,
        reason:
          'resume_cursor_invalid',
      });
    }

    const state =
      this.stateFor(
        cursor.deviceId,
      );

    this.pruneExpired(
      cursor.deviceId,
      trustedNowMs,
    );

    const newest =
      state.nextSequence - 1;
    const oldestRetained =
      state.entries.length > 0
        ? state.entries[0]
          .sequence
        : newest + 1;

    if (cursor.sequence > newest) {
      return Object.freeze({
        accepted: false,
        reason:
          'resume_cursor_future',
      });
    }

    if (
      cursor.sequence
        < oldestRetained - 1
    ) {
      return Object.freeze({
        accepted: false,
        reason:
          'resume_cursor_stale',
      });
    }

    const pending =
      state.entries
        .filter(
          (entry) =>
            entry.sequence
              > cursor.sequence
            && entry.expiresAtMs
              > trustedNowMs,
        )
        .sort(
          (a, b) =>
            a.sequence
              - b.sequence,
        )
        .slice(0, limit);

    return Object.freeze({
      accepted: true,
      deviceId:
        cursor.deviceId,
      cursorSequence:
        cursor.sequence,
      newestSequence: newest,
      entries:
        Object.freeze(pending),
    });
  }

  compact(deviceId) {
    const state =
      this.stateFor(deviceId);
    const minimumSequence =
      Math.max(
        1,
        state.nextSequence
          - this.retentionWindow,
      );

    const retained = [];

    for (const entry of state.entries) {
      if (
        entry.sequence
          >= minimumSequence
        || entry.sequence
          > state
            .acknowledgedSequence
      ) {
        retained.push(entry);
      } else {
        this.byDelivery.delete(
          entry.deliveryId,
        );
      }
    }

    state.entries = retained;
  }

  snapshot(deviceId) {
    const state =
      this.stateFor(deviceId);

    return Object.freeze({
      deviceId,
      nextSequence:
        state.nextSequence,
      acknowledgedSequence:
        state.acknowledgedSequence,
      entries:
        Object.freeze([
          ...state.entries,
        ]),
    });
  }
}
