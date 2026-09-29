import {
  isControlId,
} from './ids.mjs';

const TYPES = new Set([
  'task_progress',
  'presence_state',
  'queue_depth',
  'delivery_latency',
]);

const CODE =
  /^[a-z][a-z0-9_-]{0,63}$/;

function time(value) {
  return (
    Number.isSafeInteger(value)
    && value >= 0
  );
}

export function createTelemetryEvent(
  {
    type,
    deviceId,
    taskId = null,
    code,
    sequence,
    occurredAtMs,
    value = null,
  } = {},
) {
  if (
    !TYPES.has(type)
    || !isControlId(
      'device',
      deviceId,
    )
    || (
      taskId !== null
      && !isControlId(
        'task',
        taskId,
      )
    )
    || typeof code !== 'string'
    || !CODE.test(code)
    || !Number.isSafeInteger(
      sequence,
    )
    || sequence < 0
    || !time(occurredAtMs)
    || (
      value !== null
      && (
        !Number.isFinite(value)
        || value < 0
        || value > 1_000_000_000
      )
    )
  ) {
    return null;
  }

  return Object.freeze({
    protocolVersion: '1.0',
    type,
    deviceId,
    taskId,
    code,
    sequence,
    occurredAtMs,
    value,
    grantsAuthority: false,
  });
}

function keyFor(event) {
  return [
    event.type,
    event.deviceId,
    event.taskId ?? '-',
    event.code,
  ].join(':');
}

export class CoalescingTelemetryBuffer {
  constructor({
    maxEntries = 64,
  } = {}) {
    if (
      !Number.isInteger(maxEntries)
      || maxEntries < 1
      || maxEntries > 4096
    ) {
      throw new TypeError(
        'Invalid telemetry buffer.',
      );
    }

    this.maxEntries = maxEntries;
    this.entries = new Map();
    this.order = [];
    this.coalesced = 0;
    this.dropped = 0;
  }

  push(eventInput) {
    const event =
      createTelemetryEvent(
        eventInput,
      );

    if (!event) {
      return Object.freeze({
        accepted: false,
        reason:
          'telemetry_invalid',
      });
    }

    const key = keyFor(event);
    const existing =
      this.entries.get(key);

    if (existing) {
      if (
        event.sequence
          < existing.sequence
        || (
          event.sequence
            === existing.sequence
          && (
            event.occurredAtMs
              !== existing
                .occurredAtMs
            || event.value
              !== existing.value
          )
        )
      ) {
        return Object.freeze({
          accepted: false,
          reason:
            'telemetry_sequence_conflict',
        });
      }

      if (
        event.sequence
          === existing.sequence
      ) {
        return Object.freeze({
          accepted: true,
          duplicate: true,
          coalesced: false,
        });
      }

      this.entries.set(
        key,
        event,
      );
      this.coalesced += 1;

      return Object.freeze({
        accepted: true,
        duplicate: false,
        coalesced: true,
      });
    }

    if (
      this.entries.size
        >= this.maxEntries
    ) {
      const oldest =
        this.order.shift();

      if (oldest !== undefined) {
        this.entries.delete(oldest);
        this.dropped += 1;
      }
    }

    this.entries.set(
      key,
      event,
    );
    this.order.push(key);

    return Object.freeze({
      accepted: true,
      duplicate: false,
      coalesced: false,
    });
  }

  drain({
    limit = this.maxEntries,
  } = {}) {
    if (
      !Number.isInteger(limit)
      || limit < 1
      || limit > this.maxEntries
    ) {
      return null;
    }

    const selected =
      this.order.splice(
        0,
        limit,
      );
    const events = [];

    for (const key of selected) {
      const event =
        this.entries.get(key);

      if (event) {
        events.push(event);
        this.entries.delete(key);
      }
    }

    return Object.freeze({
      events:
        Object.freeze(events),
      remaining:
        this.entries.size,
      coalesced:
        this.coalesced,
      dropped:
        this.dropped,
    });
  }

  stats() {
    return Object.freeze({
      queued: this.entries.size,
      coalesced:
        this.coalesced,
      dropped:
        this.dropped,
    });
  }
}
