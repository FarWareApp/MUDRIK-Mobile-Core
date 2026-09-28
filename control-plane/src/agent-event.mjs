import crypto from 'node:crypto';

import {
  isControlId,
} from './ids.mjs';

import {
  parseControlTaskRecord,
  transitionControlTask,
} from './task-state.mjs';

const TYPES =
  new Set([
    'delivery_ack',
    'execution_started',
    'execution_blocked',
    'execution_succeeded',
    'execution_failed',
    'cancel_ack',
    'revocation_ack',
  ]);

const KEYS =
  new Set([
    'protocolVersion',
    'eventId',
    'taskId',
    'deviceId',
    'sequence',
    'type',
    'deliveryId',
    'reasonCode',
  ]);

const REASON =
  /^[a-z][a-z0-9_.-]{0,127}$/;

function plainObject(value) {
  return (
    typeof value === 'object'
    && value !== null
    && !Array.isArray(value)
    && (
      Object.getPrototypeOf(value)
        === Object.prototype
      || Object.getPrototypeOf(value)
        === null
    )
  );
}

export function parseAgentTaskEvent(
  input,
) {
  if (
    !plainObject(input)
    || Object.keys(input).length
      !== KEYS.size
    || Object.keys(input).some(
      (key) => !KEYS.has(key),
    )
    || input.protocolVersion
      !== '1.0'
    || !isControlId(
      'event',
      input.eventId,
    )
    || !isControlId(
      'task',
      input.taskId,
    )
    || !isControlId(
      'device',
      input.deviceId,
    )
    || !Number.isSafeInteger(
      input.sequence,
    )
    || input.sequence < 1
    || !TYPES.has(input.type)
    || (
      input.deliveryId !== null
      && !isControlId(
        'delivery',
        input.deliveryId,
      )
    )
    || (
      input.reasonCode !== null
      && (
        typeof input.reasonCode
          !== 'string'
        || !REASON.test(
          input.reasonCode,
        )
      )
    )
  ) {
    return null;
  }

  if (
    [
      'delivery_ack',
      'execution_started',
      'execution_blocked',
      'execution_succeeded',
      'execution_failed',
    ].includes(input.type)
    && input.deliveryId === null
  ) {
    return null;
  }

  if (
    [
      'execution_blocked',
      'execution_failed',
    ].includes(input.type)
    && input.reasonCode === null
  ) {
    return null;
  }

  if (
    ![
      'execution_blocked',
      'execution_failed',
    ].includes(input.type)
    && input.reasonCode !== null
  ) {
    return null;
  }

  return Object.freeze({
    ...input,
  });
}

function digestEvent(event) {
  return crypto
    .createHash('sha256')
    .update(
      JSON.stringify(event),
      'utf8',
    )
    .digest('hex');
}

function appendReceipt(
  record,
  event,
  digest,
  trustedNowMs,
  {
    incrementRevision,
  },
) {
  const receipts = [
    ...record.eventReceipts,
    Object.freeze({
      sequence:
        event.sequence,
      eventId:
        event.eventId,
      digest,
    }),
  ];

  if (receipts.length > 256) {
    receipts.splice(
      0,
      receipts.length - 256,
    );
  }

  return Object.freeze({
    ...record,
    revision:
      incrementRevision
        ? record.revision + 1
        : record.revision,
    updatedAtMs:
      trustedNowMs,
    agentEventSequence:
      event.sequence,
    eventReceipts:
      Object.freeze(receipts),
  });
}

export function applyAgentTaskEvent(
  inputRecord,
  inputEvent,
  trustedNowMs,
) {
  const record =
    parseControlTaskRecord(
      inputRecord,
    );
  const event =
    parseAgentTaskEvent(
      inputEvent,
    );

  if (
    !record
    || !event
    || !Number.isSafeInteger(
      trustedNowMs,
    )
    || trustedNowMs < 0
    || trustedNowMs
      < record.updatedAtMs
  ) {
    return Object.freeze({
      accepted: false,
      reason:
        'agent_event_invalid',
    });
  }

  if (
    event.taskId
      !== record.task.taskId
    || event.deviceId
      !== record.task
        .destinationDeviceId
  ) {
    return Object.freeze({
      accepted: false,
      reason:
        'agent_event_binding_mismatch',
    });
  }

  const digest =
    digestEvent(event);
  const existing =
    record.eventReceipts
      .find(
        (receipt) =>
          receipt.sequence
            === event.sequence
          || receipt.eventId
            === event.eventId,
      );

  if (existing) {
    if (
      existing.sequence
        === event.sequence
      && existing.eventId
        === event.eventId
      && existing.digest === digest
    ) {
      return Object.freeze({
        accepted: true,
        duplicate: true,
        record,
      });
    }

    return Object.freeze({
      accepted: false,
      reason:
        'agent_event_conflict',
    });
  }

  if (
    event.sequence
      !== record
        .agentEventSequence + 1
  ) {
    return Object.freeze({
      accepted: false,
      reason:
        event.sequence
          > record
            .agentEventSequence + 1
          ? 'agent_event_gap'
          : 'agent_event_stale',
    });
  }

  let transition = null;

  if (
    event.type === 'delivery_ack'
  ) {
    transition =
      transitionControlTask(
        record,
        'acknowledge',
        {
          expectedRevision:
            record.revision,
          trustedNowMs,
          deliveryId:
            event.deliveryId,
        },
      );
  } else if (
    event.type
      === 'execution_started'
  ) {
    if (
      event.deliveryId
        !== record
          .acknowledgedDeliveryId
    ) {
      return Object.freeze({
        accepted: false,
        reason:
          'agent_event_delivery_mismatch',
      });
    }

    transition =
      transitionControlTask(
        record,
        'start',
        {
          expectedRevision:
            record.revision,
          trustedNowMs,
        },
      );
  } else if (
    event.type
      === 'execution_succeeded'
  ) {
    if (
      event.deliveryId
        !== record
          .acknowledgedDeliveryId
    ) {
      return Object.freeze({
        accepted: false,
        reason:
          'agent_event_delivery_mismatch',
      });
    }

    transition =
      transitionControlTask(
        record,
        'succeed',
        {
          expectedRevision:
            record.revision,
          trustedNowMs,
          reason:
            'agent_succeeded',
        },
      );
  } else if (
    event.type
      === 'execution_failed'
  ) {
    if (
      event.deliveryId
        !== record
          .acknowledgedDeliveryId
    ) {
      return Object.freeze({
        accepted: false,
        reason:
          'agent_event_delivery_mismatch',
      });
    }

    transition =
      transitionControlTask(
        record,
        'fail',
        {
          expectedRevision:
            record.revision,
          trustedNowMs,
          reason:
            event.reasonCode,
        },
      );
  } else if (
    event.type
      === 'execution_blocked'
  ) {
    if (
      event.deliveryId
        !== record
          .acknowledgedDeliveryId
    ) {
      return Object.freeze({
        accepted: false,
        reason:
          'agent_event_delivery_mismatch',
      });
    }

    transition =
      transitionControlTask(
        record,
        'block',
        {
          expectedRevision:
            record.revision,
          trustedNowMs,
          reason:
            event.reasonCode,
        },
      );
  } else if (
    event.type === 'cancel_ack'
  ) {
    if (record.state !== 'cancelled') {
      return Object.freeze({
        accepted: false,
        reason:
          'agent_event_state_mismatch',
      });
    }
  } else if (
    event.type
      === 'revocation_ack'
  ) {
    if (record.state !== 'revoked') {
      return Object.freeze({
        accepted: false,
        reason:
          'agent_event_state_mismatch',
      });
    }
  }

  if (
    transition
    && !transition.accepted
  ) {
    return Object.freeze({
      accepted: false,
      reason:
        transition.reason,
    });
  }

  const base =
    transition
      ? transition.record
      : record;

  const next =
    appendReceipt(
      base,
      event,
      digest,
      trustedNowMs,
      {
        incrementRevision:
          transition === null,
      },
    );

  return Object.freeze({
    accepted: true,
    duplicate: false,
    record: next,
  });
}
