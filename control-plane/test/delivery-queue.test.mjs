import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BoundedDeliveryQueue,
  createDeliveryEntry,
  createResumeCursor,
  parseResumeCursor,
} from '../src/delivery-queue.mjs';

import {
  createControlTaskRecord,
  transitionControlTask,
} from '../src/task-state.mjs';

import {
  parseRoutedTask,
} from '../src/task-contract.mjs';

const NOW = 3_000_000;
const DESTINATION =
  'dev_9999999999999999';

function digits(index) {
  return String(index).padStart(
    16,
    '0',
  );
}

function task(
  index,
  {
    expiresAtMs =
      NOW + 100_000,
  } = {},
) {
  const id = digits(index);

  return parseRoutedTask({
    protocolVersion: '1.0',
    taskId:
      'ctask_' + id,
    accountId:
      'acct_9999999999999999',
    sourceSessionId:
      'sess_9999999999999999',
    sourceDeviceId:
      'dev_8888888888888888',
    destinationDeviceId:
      DESTINATION,
    issuedAtMs:
      NOW - 100,
    expiresAtMs,
    nonce:
      'nonce_' + id,
    sequence: index,
    requestedCapabilities: [
      'filesystem.read',
    ],
    scopeDigest:
      'a'.repeat(64),
    payloadDigest:
      index
        .toString(16)
        .padStart(64, '0'),
    approvalId: null,
    risk: 'low',
    policyVersion:
      'policy_control.v1',
  });
}

function move(
  record,
  event,
  {
    trustedNowMs,
    deliveryId = null,
    reason = null,
  } = {},
) {
  const result =
    transitionControlTask(
      record,
      event,
      {
        expectedRevision:
          record.revision,
        trustedNowMs:
          trustedNowMs
          ?? record.updatedAtMs + 1,
        deliveryId,
        reason,
      },
    );

  assert.equal(
    result.accepted,
    true,
    result.reason,
  );

  return result.record;
}

function queuedRecord(index) {
  let record =
    createControlTaskRecord(
      task(index),
      NOW,
    );

  for (const event of [
    'authenticate',
    'authorize',
    'queue',
  ]) {
    record = move(
      record,
      event,
    );
  }

  return record;
}

function deliveredRecord(
  index,
  deliveryId,
) {
  return move(
    queuedRecord(index),
    'deliver',
    { deliveryId },
  );
}

function terminalRecord(
  index,
  event,
) {
  return move(
    queuedRecord(index),
    event,
    {
      reason:
        event === 'cancel'
          ? 'user_cancel'
          : 'authorization_revoked',
    },
  );
}

function deliveryId(index) {
  return (
    'cpdelivery_'
    + digits(index)
  );
}

test(
  'resume cursor is strict and device bound',
  () => {
    const cursor =
      createResumeCursor({
        deviceId: DESTINATION,
        sequence: 7,
        issuedAtMs: NOW,
      });

    assert.ok(cursor);
    assert.deepEqual(
      parseResumeCursor(cursor),
      cursor,
    );

    assert.equal(
      parseResumeCursor({
        ...cursor,
        extra: true,
      }),
      null,
    );
    assert.equal(
      createResumeCursor({
        deviceId:
          'dev_bad',
        sequence: 0,
        issuedAtMs: NOW,
      }),
      null,
    );
  },
);

test(
  'delivery entry binds authoritative task revision and payload without mutating task truth',
  () => {
    const id = deliveryId(1);
    const record =
      deliveredRecord(1, id);
    const before =
      JSON.stringify(record);

    const entry =
      createDeliveryEntry({
        kind: 'task',
        deliveryId: id,
        sequence: 1,
        taskRecord: record,
        queuedAtMs:
          record.updatedAtMs + 1,
      });

    assert.ok(entry);
    assert.equal(
      entry.taskRevision,
      record.revision,
    );
    assert.equal(
      entry.payloadDigest,
      record.task.payloadDigest,
    );
    assert.equal(
      JSON.stringify(record),
      before,
    );
  },
);

test(
  'duplicate delivery is idempotent while identity reuse across revisions or tasks conflicts',
  () => {
    const queue =
      new BoundedDeliveryQueue();
    const id = deliveryId(2);
    const record =
      deliveredRecord(2, id);

    const first =
      queue.enqueue(
        'task',
        record,
        {
          deliveryId: id,
          trustedNowMs:
            record.updatedAtMs + 1,
        },
      );

    assert.equal(first.accepted, true);
    assert.equal(first.duplicate, false);

    const duplicate =
      queue.enqueue(
        'task',
        record,
        {
          deliveryId: id,
          trustedNowMs:
            record.updatedAtMs + 2,
        },
      );

    assert.equal(
      duplicate.accepted,
      true,
    );
    assert.equal(
      duplicate.duplicate,
      true,
    );

    const otherId =
      deliveryId(3);
    const other =
      deliveredRecord(
        3,
        otherId,
      );

    const conflict =
      queue.enqueue(
        'task',
        other,
        {
          deliveryId: id,
          trustedNowMs:
            other.updatedAtMs + 1,
        },
      );

    assert.equal(
      conflict.accepted,
      false,
    );
    assert.equal(
      conflict.reason,
      'delivery_id_conflict',
    );
  },
);

test(
  'resume is at-least-once and preserves sequence order across control priority',
  () => {
    const queue =
      new BoundedDeliveryQueue();

    const taskId1 =
      deliveryId(10);
    const taskId2 =
      deliveryId(11);
    const cancelId =
      deliveryId(12);

    const first =
      deliveredRecord(
        10,
        taskId1,
      );
    const second =
      deliveredRecord(
        11,
        taskId2,
      );
    const cancelled =
      terminalRecord(
        12,
        'cancel',
      );

    for (const [
      kind,
      record,
      id,
    ] of [
      ['task', first, taskId1],
      ['task', second, taskId2],
      ['cancel', cancelled, cancelId],
    ]) {
      assert.equal(
        queue.enqueue(
          kind,
          record,
          {
            deliveryId: id,
            trustedNowMs:
              record.updatedAtMs + 1,
          },
        ).accepted,
        true,
      );
    }

    const cursor =
      createResumeCursor({
        deviceId: DESTINATION,
        sequence: 0,
        issuedAtMs: NOW + 10,
      });

    const replay =
      queue.resume(
        cursor,
        NOW + 20,
      );

    assert.equal(
      replay.accepted,
      true,
    );
    assert.deepEqual(
      replay.entries.map(
        (entry) =>
          entry.sequence,
      ),
      [1, 2, 3],
    );
    assert.deepEqual(
      replay.entries.map(
        (entry) => entry.kind,
      ),
      [
        'task',
        'task',
        'cancel',
      ],
    );

    const again =
      queue.resume(
        cursor,
        NOW + 21,
      );

    assert.deepEqual(
      again.entries,
      replay.entries,
    );
  },
);

test(
  'acknowledgement is cumulative idempotent and rejects stale or future values',
  () => {
    const queue =
      new BoundedDeliveryQueue();

    for (
      let index = 20;
      index <= 22;
      index += 1
    ) {
      const id =
        deliveryId(index);
      const record =
        deliveredRecord(
          index,
          id,
        );

      assert.equal(
        queue.enqueue(
          'task',
          record,
          {
            deliveryId: id,
            trustedNowMs:
              record.updatedAtMs + 1,
          },
        ).accepted,
        true,
      );
    }

    const ack =
      queue.acknowledge(
        DESTINATION,
        2,
      );

    assert.equal(ack.accepted, true);
    assert.equal(ack.duplicate, false);

    assert.equal(
      queue.acknowledge(
        DESTINATION,
        2,
      ).duplicate,
      true,
    );

    assert.equal(
      queue.acknowledge(
        DESTINATION,
        1,
      ).reason,
      'delivery_ack_stale',
    );

    assert.equal(
      queue.acknowledge(
        DESTINATION,
        4,
      ).reason,
      'delivery_ack_invalid',
    );

    const resume =
      queue.resume(
        createResumeCursor({
          deviceId: DESTINATION,
          sequence: 2,
          issuedAtMs:
            NOW + 20,
        }),
        NOW + 21,
      );

    assert.deepEqual(
      resume.entries.map(
        (entry) =>
          entry.sequence,
      ),
      [3],
    );
  },
);

test(
  'future and retention-stale resume cursors fail closed',
  () => {
    const queue =
      new BoundedDeliveryQueue({
        retentionWindow: 2,
      });

    for (
      let index = 30;
      index <= 33;
      index += 1
    ) {
      const id =
        deliveryId(index);
      const record =
        deliveredRecord(
          index,
          id,
        );

      queue.enqueue(
        'task',
        record,
        {
          deliveryId: id,
          trustedNowMs:
            record.updatedAtMs + 1,
        },
      );
    }

    queue.acknowledge(
      DESTINATION,
      4,
    );

    const future =
      queue.resume(
        createResumeCursor({
          deviceId: DESTINATION,
          sequence: 5,
          issuedAtMs:
            NOW + 20,
        }),
        NOW + 21,
      );

    assert.equal(
      future.reason,
      'resume_cursor_future',
    );

    const stale =
      queue.resume(
        createResumeCursor({
          deviceId: DESTINATION,
          sequence: 0,
          issuedAtMs:
            NOW + 20,
        }),
        NOW + 21,
      );

    assert.equal(
      stale.reason,
      'resume_cursor_stale',
    );
  },
);

test(
  'ordinary task backpressure preserves reserved capacity for cancel and revoke',
  () => {
    const queue =
      new BoundedDeliveryQueue({
        maxEntriesPerDevice: 2,
        controlReserve: 1,
      });

    for (
      let index = 40;
      index <= 41;
      index += 1
    ) {
      const id =
        deliveryId(index);
      const record =
        deliveredRecord(
          index,
          id,
        );

      assert.equal(
        queue.enqueue(
          'task',
          record,
          {
            deliveryId: id,
            trustedNowMs:
              record.updatedAtMs + 1,
          },
        ).accepted,
        true,
      );
    }

    const overflowId =
      deliveryId(42);
    const overflow =
      deliveredRecord(
        42,
        overflowId,
      );

    assert.equal(
      queue.enqueue(
        'task',
        overflow,
        {
          deliveryId:
            overflowId,
          trustedNowMs:
            overflow.updatedAtMs + 1,
        },
      ).reason,
      'delivery_backpressure',
    );

    const cancelled =
      terminalRecord(
        43,
        'cancel',
      );

    assert.equal(
      queue.enqueue(
        'cancel',
        cancelled,
        {
          deliveryId:
            deliveryId(43),
          trustedNowMs:
            cancelled.updatedAtMs + 1,
        },
      ).accepted,
      true,
    );

    const revoked =
      terminalRecord(
        44,
        'revoke',
      );

    assert.equal(
      queue.enqueue(
        'revoke',
        revoked,
        {
          deliveryId:
            deliveryId(44),
          trustedNowMs:
            revoked.updatedAtMs + 1,
        },
      ).reason,
      'delivery_priority_capacity_exhausted',
    );
  },
);

test(
  'expired deliveries are never replayed and expired records cannot be newly enqueued',
  () => {
    const queue =
      new BoundedDeliveryQueue();
    const id =
      deliveryId(50);
    let record =
      createControlTaskRecord(
        task(
          50,
          {
            expiresAtMs:
              NOW + 20,
          },
        ),
        NOW,
      );

    for (const event of [
      'authenticate',
      'authorize',
      'queue',
    ]) {
      record = move(
        record,
        event,
      );
    }

    record = move(
      record,
      'deliver',
      {
        deliveryId: id,
      },
    );

    assert.equal(
      queue.enqueue(
        'task',
        record,
        {
          deliveryId: id,
          trustedNowMs:
            NOW + 10,
        },
      ).accepted,
      true,
    );

    const replay =
      queue.resume(
        createResumeCursor({
          deviceId: DESTINATION,
          sequence: 0,
          issuedAtMs:
            NOW + 10,
        }),
        NOW + 25,
      );

    assert.equal(
      replay.accepted,
      false,
    );
    assert.equal(
      replay.reason,
      'resume_cursor_stale',
    );

    const expiredId =
      deliveryId(51);
    let expired =
      createControlTaskRecord(
        task(
          51,
          {
            expiresAtMs:
              NOW + 5,
          },
        ),
        NOW,
      );

    for (const event of [
      'authenticate',
      'authorize',
      'queue',
    ]) {
      expired = move(
        expired,
        event,
      );
    }

    expired = move(
      expired,
      'deliver',
      {
        deliveryId:
          expiredId,
      },
    );

    assert.equal(
      queue.enqueue(
        'task',
        expired,
        {
          deliveryId:
            expiredId,
          trustedNowMs:
            NOW + 10,
        },
      ).accepted,
      false,
    );
  },
);


test(
  'resume cursor has a bounded age even when sequence does not move',
  () => {
    const queue =
      new BoundedDeliveryQueue({
        maxCursorAgeMs: 1_000,
      });

    const result =
      queue.resume(
        createResumeCursor({
          deviceId: DESTINATION,
          sequence: 0,
          issuedAtMs: NOW,
        }),
        NOW + 1_001,
      );

    assert.equal(
      result.accepted,
      false,
    );
    assert.equal(
      result.reason,
      'resume_cursor_invalid',
    );
  },
);

test(
  'expired unacknowledged delivery is pruned and cannot permanently consume backpressure capacity',
  () => {
    const queue =
      new BoundedDeliveryQueue({
        maxEntriesPerDevice: 1,
        controlReserve: 1,
      });

    const firstId =
      deliveryId(60);
    let first =
      createControlTaskRecord(
        task(
          60,
          {
            expiresAtMs:
              NOW + 20,
          },
        ),
        NOW,
      );

    for (const event of [
      'authenticate',
      'authorize',
      'queue',
    ]) {
      first = move(
        first,
        event,
      );
    }

    first = move(
      first,
      'deliver',
      {
        deliveryId:
          firstId,
      },
    );

    assert.equal(
      queue.enqueue(
        'task',
        first,
        {
          deliveryId:
            firstId,
          trustedNowMs:
            NOW + 10,
        },
      ).accepted,
      true,
    );

    const secondId =
      deliveryId(61);
    const second =
      deliveredRecord(
        61,
        secondId,
      );

    const accepted =
      queue.enqueue(
        'task',
        second,
        {
          deliveryId:
            secondId,
          trustedNowMs:
            NOW + 21,
        },
      );

    assert.equal(
      accepted.accepted,
      true,
    );
    assert.equal(
      queue.snapshot(
        DESTINATION,
      ).entries.length,
      1,
    );
  },
);


test(
  'cancel supersedes an unacknowledged task delivery at the same sequence',
  () => {
    const queue =
      new BoundedDeliveryQueue();
    const taskDelivery =
      deliveryId(70);
    const delivered =
      deliveredRecord(
        70,
        taskDelivery,
      );

    const first =
      queue.enqueue(
        'task',
        delivered,
        {
          deliveryId:
            taskDelivery,
          trustedNowMs:
            delivered.updatedAtMs + 1,
        },
      );

    assert.equal(
      first.entry.sequence,
      1,
    );

    const cancelled =
      move(
        delivered,
        'cancel',
        {
          reason: 'user_cancel',
          trustedNowMs:
            delivered.updatedAtMs + 2,
        },
      );
    const cancelDelivery =
      deliveryId(71);

    const replacement =
      queue.enqueue(
        'cancel',
        cancelled,
        {
          deliveryId:
            cancelDelivery,
          trustedNowMs:
            cancelled.updatedAtMs + 1,
        },
      );

    assert.equal(
      replacement.accepted,
      true,
    );
    assert.equal(
      replacement.superseded,
      true,
    );
    assert.equal(
      replacement.entry.sequence,
      1,
    );
    assert.equal(
      replacement.entry.kind,
      'cancel',
    );

    const replay =
      queue.resume(
        createResumeCursor({
          deviceId: DESTINATION,
          sequence: 0,
          issuedAtMs:
            NOW + 20,
        }),
        NOW + 21,
      );

    assert.equal(
      replay.entries.length,
      1,
    );
    assert.equal(
      replay.entries[0].kind,
      'cancel',
    );
    assert.equal(
      replay.entries[0]
        .deliveryId,
      cancelDelivery,
    );
  },
);

test(
  'redelivery supersedes the previous pending transport identity without creating another logical queue slot',
  () => {
    const queue =
      new BoundedDeliveryQueue();
    const firstId =
      deliveryId(80);
    let record =
      deliveredRecord(
        80,
        firstId,
      );

    assert.equal(
      queue.enqueue(
        'task',
        record,
        {
          deliveryId: firstId,
          trustedNowMs:
            record.updatedAtMs + 1,
        },
      ).accepted,
      true,
    );

    const secondId =
      deliveryId(81);
    record = move(
      record,
      'deliver',
      {
        deliveryId: secondId,
        trustedNowMs:
          record.updatedAtMs + 2,
      },
    );

    const redelivery =
      queue.enqueue(
        'task',
        record,
        {
          deliveryId: secondId,
          trustedNowMs:
            record.updatedAtMs + 1,
        },
      );

    assert.equal(
      redelivery.superseded,
      true,
    );
    assert.equal(
      redelivery.entry.sequence,
      1,
    );
    assert.equal(
      queue.snapshot(
        DESTINATION,
      ).entries.length,
      1,
    );
  },
);


test(
  'superseded delivery id remains tombstoned and cannot replace a cancel on replay',
  () => {
    const queue =
      new BoundedDeliveryQueue();
    const oldId =
      deliveryId(90);
    const oldRecord =
      deliveredRecord(
        90,
        oldId,
      );

    queue.enqueue(
      'task',
      oldRecord,
      {
        deliveryId: oldId,
        trustedNowMs:
          oldRecord.updatedAtMs + 1,
      },
    );

    const cancelled =
      move(
        oldRecord,
        'cancel',
        {
          reason: 'user_cancel',
          trustedNowMs:
            oldRecord.updatedAtMs + 2,
        },
      );
    const cancelId =
      deliveryId(91);

    assert.equal(
      queue.enqueue(
        'cancel',
        cancelled,
        {
          deliveryId: cancelId,
          trustedNowMs:
            cancelled.updatedAtMs + 1,
        },
      ).accepted,
      true,
    );

    const replay =
      queue.enqueue(
        'task',
        oldRecord,
        {
          deliveryId: oldId,
          trustedNowMs:
            cancelled.updatedAtMs + 2,
        },
      );

    assert.equal(
      replay.accepted,
      false,
    );
    assert.equal(
      replay.reason,
      'delivery_replay_stale',
    );

    const resumed =
      queue.resume(
        createResumeCursor({
          deviceId: DESTINATION,
          sequence: 0,
          issuedAtMs:
            NOW + 20,
        }),
        NOW + 21,
      );

    assert.equal(
      resumed.entries[0].kind,
      'cancel',
    );
    assert.equal(
      resumed.entries[0]
        .deliveryId,
      cancelId,
    );
  },
);

test(
  'delivery replay tombstone storage is bounded and fails closed when exhausted',
  () => {
    const queue =
      new BoundedDeliveryQueue({
        maxSeenDeliveries: 1,
      });

    const firstId =
      deliveryId(100);
    const first =
      deliveredRecord(
        100,
        firstId,
      );

    assert.equal(
      queue.enqueue(
        'task',
        first,
        {
          deliveryId: firstId,
          trustedNowMs:
            first.updatedAtMs + 1,
        },
      ).accepted,
      true,
    );

    queue.acknowledge(
      DESTINATION,
      1,
    );

    const secondId =
      deliveryId(101);
    const second =
      deliveredRecord(
        101,
        secondId,
      );

    const denied =
      queue.enqueue(
        'task',
        second,
        {
          deliveryId: secondId,
          trustedNowMs:
            second.updatedAtMs + 1,
        },
      );

    assert.equal(
      denied.accepted,
      false,
    );
    assert.equal(
      denied.reason,
      'delivery_history_capacity',
    );
  },
);
