import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createControlAuditEvent,
  isControlAuditEvent,
} from '../src/control-audit.mjs';

import {
  CoalescingTelemetryBuffer,
  createTelemetryEvent,
} from '../src/telemetry-buffer.mjs';

const DEVICE =
  'dev_6666666666666666';
const TASK =
  'ctask_6666666666666666';
const ACCOUNT =
  'acct_6666666666666666';
const SESSION =
  'sess_6666666666666666';
const NOW = 7_000_000;

test(
  'telemetry events are bounded advisory records without private payload or authority',
  () => {
    const event =
      createTelemetryEvent({
        type: 'task_progress',
        deviceId: DEVICE,
        taskId: TASK,
        code: 'running',
        sequence: 1,
        occurredAtMs: NOW,
        value: 50,
      });

    assert.ok(event);
    assert.equal(
      event.grantsAuthority,
      false,
    );

    assert.equal(
      createTelemetryEvent({
        type: 'task_progress',
        deviceId: DEVICE,
        taskId: TASK,
        code:
          'contains free text payload here',
        sequence: 1,
        occurredAtMs: NOW,
      }),
      null,
    );
  },
);

test(
  'slow-consumer telemetry coalesces latest state and remains bounded',
  () => {
    const buffer =
      new CoalescingTelemetryBuffer({
        maxEntries: 2,
      });

    assert.equal(
      buffer.push({
        type: 'task_progress',
        deviceId: DEVICE,
        taskId: TASK,
        code: 'running',
        sequence: 1,
        occurredAtMs: NOW,
        value: 10,
      }).accepted,
      true,
    );

    const coalesced =
      buffer.push({
        type: 'task_progress',
        deviceId: DEVICE,
        taskId: TASK,
        code: 'running',
        sequence: 2,
        occurredAtMs:
          NOW + 1,
        value: 20,
      });

    assert.equal(
      coalesced.coalesced,
      true,
    );

    buffer.push({
      type: 'presence_state',
      deviceId: DEVICE,
      code: 'online',
      sequence: 1,
      occurredAtMs:
        NOW + 2,
      value: null,
    });

    buffer.push({
      type: 'queue_depth',
      deviceId: DEVICE,
      code: 'pending',
      sequence: 1,
      occurredAtMs:
        NOW + 3,
      value: 3,
    });

    const stats =
      buffer.stats();

    assert.equal(
      stats.queued,
      2,
    );
    assert.equal(
      stats.coalesced,
      1,
    );
    assert.equal(
      stats.dropped,
      1,
    );

    const drained =
      buffer.drain({
        limit: 2,
      });

    assert.equal(
      drained.events.length,
      2,
    );
    assert.equal(
      drained.remaining,
      0,
    );
  },
);

test(
  'telemetry duplicate is idempotent while conflicting same sequence fails',
  () => {
    const buffer =
      new CoalescingTelemetryBuffer();

    const input = {
      type: 'delivery_latency',
      deviceId: DEVICE,
      taskId: TASK,
      code: 'observed',
      sequence: 4,
      occurredAtMs: NOW,
      value: 25,
    };

    assert.equal(
      buffer.push(input).accepted,
      true,
    );
    assert.equal(
      buffer.push(input).duplicate,
      true,
    );

    assert.equal(
      buffer.push({
        ...input,
        value: 26,
      }).reason,
      'telemetry_sequence_conflict',
    );

    assert.equal(
      buffer.push({
        ...input,
        sequence: 3,
      }).reason,
      'telemetry_sequence_conflict',
    );
  },
);

test(
  'control audit event accepts stable ids and reason codes only',
  () => {
    const event =
      createControlAuditEvent({
        type: 'route_accepted',
        accountId: ACCOUNT,
        deviceId: DEVICE,
        sessionId: SESSION,
        taskId: TASK,
        reasonCode: 'authorized',
        occurredAtMs: NOW,
      });

    assert.ok(event);
    assert.equal(
      event.grantsAuthority,
      false,
    );
    assert.equal(
      event.containsPrivatePayload,
      false,
    );
    assert.equal(
      isControlAuditEvent(event),
      true,
    );

    assert.equal(
      createControlAuditEvent({
        type: 'route_rejected',
        accountId: ACCOUNT,
        deviceId: DEVICE,
        taskId: TASK,
        reasonCode:
          'user wrote private free text here',
        occurredAtMs: NOW,
      }),
      null,
    );
  },
);

test(
  'control audit rejects unknown fields copied secrets and malformed ids',
  () => {
    const valid = {
      type: 'rate_limited',
      accountId: ACCOUNT,
      deviceId: DEVICE,
      sessionId: SESSION,
      taskId: TASK,
      approvalId: null,
      deliveryId: null,
      reasonCode: 'device_limit',
      occurredAtMs: NOW,
    };

    assert.ok(
      createControlAuditEvent(valid),
    );

    assert.equal(
      isControlAuditEvent({
        ...createControlAuditEvent(
          valid,
        ),
        secret:
          'must-not-be-logged',
      }),
      false,
    );

    assert.equal(
      createControlAuditEvent({
        ...valid,
        taskId: 'bad-task-id',
      }),
      null,
    );
  },
);
