import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  applyAgentTaskEvent,
} from '../src/agent-event.mjs';

import {
  DurableControlTaskStore,
} from '../src/durable-control-store.mjs';

import {
  createControlTaskRecord,
  transitionControlTask,
} from '../src/task-state.mjs';

import {
  parseRoutedTask,
} from '../src/task-contract.mjs';

const NOW = 2_000_000;

function task() {
  return parseRoutedTask({
    protocolVersion: '1.0',
    taskId:
      'ctask_2222222222222222',
    accountId:
      'acct_2222222222222222',
    sourceSessionId:
      'sess_2222222222222222',
    sourceDeviceId:
      'dev_2222222222222222',
    destinationDeviceId:
      'dev_3333333333333333',
    issuedAtMs: NOW - 100,
    expiresAtMs:
      NOW + 100_000,
    nonce:
      'nonce_2222222222222222',
    sequence: 1,
    requestedCapabilities: [
      'filesystem.read',
    ],
    scopeDigest:
      'a'.repeat(64),
    payloadDigest:
      'b'.repeat(64),
    approvalId: null,
    risk: 'low',
    policyVersion:
      'policy_control.v1',
  });
}

function move(
  record,
  event,
  options = {},
) {
  const result =
    transitionControlTask(
      record,
      event,
      {
        expectedRevision:
          record.revision,
        trustedNowMs:
          record.updatedAtMs + 1,
        ...options,
      },
    );

  assert.equal(
    result.accepted,
    true,
    result.reason,
  );

  return result.record;
}

function agentEvent({
  sequence,
  type,
  deliveryId,
  reasonCode = null,
  eventId,
}) {
  return {
    protocolVersion: '1.0',
    eventId:
      eventId
      ?? (
        'cpevent_'
        + String(sequence)
          .padStart(16, '0')
      ),
    taskId:
      'ctask_2222222222222222',
    deviceId:
      'dev_3333333333333333',
    sequence,
    type,
    deliveryId:
      deliveryId ?? null,
    reasonCode,
  };
}

test(
  'task lifecycle keeps delivery acknowledgement distinct from execution completion',
  () => {
    let record =
      createControlTaskRecord(
        task(),
        NOW,
      );

    for (
      const event of [
        'authenticate',
        'authorize',
        'queue',
      ]
    ) {
      record = move(
        record,
        event,
      );
    }

    const delivery =
      'cpdelivery_2222222222222222';

    record = move(
      record,
      'deliver',
      { deliveryId: delivery },
    );

    assert.equal(
      record.state,
      'delivered',
    );

    let result =
      applyAgentTaskEvent(
        record,
        agentEvent({
          sequence: 1,
          type: 'delivery_ack',
          deliveryId: delivery,
        }),
        record.updatedAtMs + 1,
      );

    assert.equal(
      result.accepted,
      true,
    );
    record = result.record;

    assert.equal(
      record.state,
      'acknowledged',
    );
    assert.equal(
      record.revision,
      5,
    );

    result =
      applyAgentTaskEvent(
        record,
        agentEvent({
          sequence: 2,
          type:
            'execution_started',
          deliveryId: delivery,
        }),
        record.updatedAtMs + 1,
      );

    record = result.record;

    assert.equal(
      record.state,
      'running',
    );

    result =
      applyAgentTaskEvent(
        record,
        agentEvent({
          sequence: 3,
          type:
            'execution_succeeded',
          deliveryId: delivery,
        }),
        record.updatedAtMs + 1,
      );

    assert.equal(
      result.accepted,
      true,
    );
    assert.equal(
      result.record.state,
      'succeeded',
    );
  },
);

test(
  'redelivery changes delivery identity and old acknowledgement fails closed',
  () => {
    let record =
      createControlTaskRecord(
        task(),
        NOW,
      );

    for (
      const event of [
        'authenticate',
        'authorize',
        'queue',
      ]
    ) {
      record = move(
        record,
        event,
      );
    }

    const first =
      'cpdelivery_3333333333333333';
    const second =
      'cpdelivery_4444444444444444';

    record = move(
      record,
      'deliver',
      { deliveryId: first },
    );
    record = move(
      record,
      'deliver',
      { deliveryId: second },
    );

    assert.equal(
      record.deliveryCount,
      2,
    );

    assert.equal(
      applyAgentTaskEvent(
        record,
        agentEvent({
          sequence: 1,
          type: 'delivery_ack',
          deliveryId: first,
        }),
        record.updatedAtMs + 1,
      ).accepted,
      false,
    );

    assert.equal(
      applyAgentTaskEvent(
        record,
        agentEvent({
          sequence: 1,
          type: 'delivery_ack',
          deliveryId: second,
        }),
        record.updatedAtMs + 1,
      ).accepted,
      true,
    );
  },
);

test(
  'agent sequence duplicate is idempotent while conflict gap and stale values fail',
  () => {
    let record =
      createControlTaskRecord(
        task(),
        NOW,
      );

    for (
      const event of [
        'authenticate',
        'authorize',
        'queue',
      ]
    ) {
      record = move(
        record,
        event,
      );
    }

    const delivery =
      'cpdelivery_5555555555555555';

    record = move(
      record,
      'deliver',
      { deliveryId: delivery },
    );

    const firstEvent =
      agentEvent({
        sequence: 1,
        type: 'delivery_ack',
        deliveryId: delivery,
      });

    const first =
      applyAgentTaskEvent(
        record,
        firstEvent,
        record.updatedAtMs + 1,
      );

    assert.equal(
      first.accepted,
      true,
    );
    record = first.record;

    const duplicate =
      applyAgentTaskEvent(
        record,
        firstEvent,
        record.updatedAtMs + 1,
      );

    assert.equal(
      duplicate.accepted,
      true,
    );
    assert.equal(
      duplicate.duplicate,
      true,
    );

    assert.equal(
      applyAgentTaskEvent(
        record,
        agentEvent({
          sequence: 1,
          eventId:
            'cpevent_9999999999999999',
          type: 'delivery_ack',
          deliveryId: delivery,
        }),
        record.updatedAtMs + 1,
      ).reason,
      'agent_event_conflict',
    );

    assert.equal(
      applyAgentTaskEvent(
        record,
        agentEvent({
          sequence: 3,
          type:
            'execution_started',
          deliveryId: delivery,
        }),
        record.updatedAtMs + 1,
      ).reason,
      'agent_event_gap',
    );
  },
);

test(
  'cancelled task cannot be overwritten by a late completion event',
  () => {
    let record =
      createControlTaskRecord(
        task(),
        NOW,
      );

    for (
      const event of [
        'authenticate',
        'authorize',
        'queue',
      ]
    ) {
      record = move(
        record,
        event,
      );
    }

    const delivery =
      'cpdelivery_6666666666666666';

    record = move(
      record,
      'deliver',
      { deliveryId: delivery },
    );

    let applied =
      applyAgentTaskEvent(
        record,
        agentEvent({
          sequence: 1,
          type: 'delivery_ack',
          deliveryId: delivery,
        }),
        record.updatedAtMs + 1,
      );

    record = applied.record;

    applied =
      applyAgentTaskEvent(
        record,
        agentEvent({
          sequence: 2,
          type:
            'execution_started',
          deliveryId: delivery,
        }),
        record.updatedAtMs + 1,
      );

    record = applied.record;

    record = move(
      record,
      'cancel',
      {
        reason:
          'user_cancelled',
      },
    );

    assert.equal(
      record.state,
      'cancelled',
    );

    assert.equal(
      applyAgentTaskEvent(
        record,
        agentEvent({
          sequence: 3,
          type:
            'execution_succeeded',
          deliveryId: delivery,
        }),
        record.updatedAtMs + 1,
      ).accepted,
      false,
    );

    assert.equal(
      record.state,
      'cancelled',
    );
  },
);

test(
  'durable task store round trips CAS state and survives new store instance',
  async (t) => {
    const directory =
      await fs.mkdtemp(
        path.join(
          os.tmpdir(),
          'mudrik-control-',
        ),
      );
    const key =
      crypto.randomBytes(32);

    t.after(
      () => fs.rm(
        directory,
        {
          recursive: true,
          force: true,
        },
      ),
    );

    const store =
      await new DurableControlTaskStore({
        directory,
        integrityKey: key,
      }).init();

    let record =
      createControlTaskRecord(
        task(),
        NOW,
      );

    assert.equal(
      (
        await store.create(record)
      ).accepted,
      true,
    );

    const duplicate =
      await store.create(record);

    assert.equal(
      duplicate.duplicate,
      true,
    );

    const transitioned =
      transitionControlTask(
        record,
        'authenticate',
        {
          expectedRevision:
            record.revision,
          trustedNowMs:
            NOW + 1,
        },
      );

    record =
      transitioned.record;

    assert.equal(
      (
        await store.replace(
          record.task.taskId,
          0,
          record,
        )
      ).accepted,
      true,
    );

    const skipped = {
      ...record,
      revision: 3,
    };

    assert.equal(
      (
        await store.replace(
          record.task.taskId,
          1,
          skipped,
        )
      ).reason,
      'control_store_cas_conflict',
    );

    assert.equal(
      (
        await store.replace(
          record.task.taskId,
          0,
          record,
        )
      ).reason,
      'control_store_cas_conflict',
    );

    const restarted =
      await new DurableControlTaskStore({
        directory,
        integrityKey: key,
      }).init();

    const restored =
      await restarted.get(
        record.task.taskId,
      );

    assert.equal(
      restored.state,
      'authenticated',
    );
    assert.equal(
      restored.revision,
      1,
    );
  },
);

test(
  'durable task store detects structural tampering and wrong integrity key',
  async (t) => {
    const directory =
      await fs.mkdtemp(
        path.join(
          os.tmpdir(),
          'mudrik-control-tamper-',
        ),
      );
    const key =
      crypto.randomBytes(32);

    t.after(
      () => fs.rm(
        directory,
        {
          recursive: true,
          force: true,
        },
      ),
    );

    const store =
      await new DurableControlTaskStore({
        directory,
        integrityKey: key,
      }).init();
    const record =
      createControlTaskRecord(
        task(),
        NOW,
      );

    await store.create(record);

    const wrong =
      await new DurableControlTaskStore({
        directory,
        integrityKey:
          crypto.randomBytes(32),
      }).init();

    await assert.rejects(
      () => wrong.get(
        record.task.taskId,
      ),
      /control_store_integrity_failed/,
    );

    const file =
      store.filePath(
        record.task.taskId,
      );
    const envelope =
      JSON.parse(
        await fs.readFile(
          file,
          'utf8',
        ),
      );

    envelope.record.state =
      'succeeded';
    envelope.record.terminalReason =
      'forged_success';

    await fs.writeFile(
      file,
      JSON.stringify(envelope),
    );

    await assert.rejects(
      () => store.get(
        record.task.taskId,
      ),
      /control_store_integrity_failed/,
    );
  },
);
