import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  ApprovalRegistry,
} from '../src/approval-registry.mjs';

import {
  BoundedDeliveryQueue,
} from '../src/delivery-queue.mjs';

import {
  ControlDeviceRegistry,
} from '../src/device-registry.mjs';

import {
  DurableControlTaskStore,
} from '../src/durable-control-store.mjs';

import {
  ControlPlaneRouter,
} from '../src/router.mjs';

import {
  ControlSessionRegistry,
} from '../src/source-session.mjs';

const NOW = 11_000_000;
const ACCOUNT =
  'acct_3333333333333333';
const SOURCE =
  'dev_3333333333333333';
const DEST =
  'dev_4444444444444444';
const KEY =
  'dkey_3333333333333333';
const SESSION =
  'sess_3333333333333333';
const TASK =
  'ctask_3333333333333333';
const APPROVAL =
  'capproval_3333333333333333';
const DELIVERY =
  'cpdelivery_3333333333333333';
const CANCEL =
  'cpdelivery_4444444444444444';

function taskInput(
  overrides = {},
) {
  return {
    protocolVersion: '1.0',
    taskId: TASK,
    accountId: ACCOUNT,
    sourceSessionId:
      SESSION,
    sourceDeviceId:
      SOURCE,
    destinationDeviceId:
      DEST,
    issuedAtMs:
      NOW - 100,
    expiresAtMs:
      NOW + 100_000,
    nonce:
      'nonce_3333333333333333',
    sequence: 1,
    requestedCapabilities: [
      'filesystem.read',
    ],
    scopeDigest:
      'a'.repeat(64),
    payloadDigest:
      'b'.repeat(64),
    approvalId:
      APPROVAL,
    risk: 'high',
    policyVersion:
      'policy_control.v1',
    ...overrides,
  };
}

function deviceRecord() {
  return {
    deviceId: DEST,
    accountId: ACCOUNT,
    deviceKeyId: KEY,
    publicKeyThumbprint:
      'A'.repeat(43),
    state: 'active',
    agentVersion: '1.0.0',
    protocolMajor: 1,
    revision: 0,
    updatedAtMs:
      NOW - 100,
  };
}

function sessionRecord() {
  return {
    sessionId: SESSION,
    accountId: ACCOUNT,
    deviceId: SOURCE,
    deviceKeyId: KEY,
    issuedAtMs:
      NOW - 1_000,
    expiresAtMs:
      NOW + 100_000,
    authenticatedAtMs:
      NOW - 1_000,
    assurance: 'verified',
    state: 'active',
    revision: 0,
  };
}

function approvalRecord(
  overrides = {},
) {
  return {
    approvalId: APPROVAL,
    accountId: ACCOUNT,
    sourceSessionId:
      SESSION,
    destinationDeviceId:
      DEST,
    taskId: TASK,
    capabilities: [
      'filesystem.read',
    ],
    scopeDigest:
      'a'.repeat(64),
    risk: 'high',
    policyVersion:
      'policy_control.v1',
    mode: 'single_use',
    state: 'active',
    createdAtMs:
      NOW - 500,
    expiresAtMs:
      NOW + 50_000,
    consumedAtMs: null,
    revision: 0,
    ...overrides,
  };
}
async function fixture(
  t,
  {
    registerApproval = true,
    deliveryQueue =
      new BoundedDeliveryQueue(),
  } = {},
) {
  const root =
    await fs.mkdtemp(
      path.join(
        os.tmpdir(),
        'mudrik-router-',
      ),
    );

  t.after(
    () => fs.rm(
      root,
      {
        recursive: true,
        force: true,
      },
    ),
  );

  const devices =
    new ControlDeviceRegistry({
      verifyEnrollment:
        () => true,
    });
  const sessions =
    new ControlSessionRegistry({
      verifySession:
        () => true,
    });
  const approvals =
    new ApprovalRegistry();
  const store =
    await new DurableControlTaskStore({
      directory:
        path.join(
          root,
          'tasks',
        ),
      integrityKey:
        Buffer.alloc(
          32,
          0x33,
        ),
    }).init();

  assert.equal(
    devices.register(
      deviceRecord(),
    ).accepted,
    true,
  );
  assert.equal(
    sessions.register(
      sessionRecord(),
    ).accepted,
    true,
  );

  if (registerApproval) {
    assert.equal(
      approvals.register(
        approvalRecord(),
      ).accepted,
      true,
    );
  }

  const router =
    new ControlPlaneRouter({
      deviceRegistry: devices,
      sessionRegistry:
        sessions,
      approvalRegistry:
        approvals,
      store,
      deliveryQueue,
    });

  return {
    root,
    devices,
    sessions,
    approvals,
    store,
    deliveryQueue,
    router,
  };
}

test(
  'router durably queues authorized task and duplicate admission never resets state',
  async (t) => {
    const f = await fixture(t);

    const admitted =
      await f.router.admitTask(
        taskInput(),
        NOW,
      );

    assert.equal(
      admitted.accepted,
      true,
    );
    assert.equal(
      admitted.record.state,
      'queued',
    );

    const durable =
      await f.store.get(TASK);

    assert.equal(
      durable.state,
      'queued',
    );

    const duplicate =
      await f.router.admitTask(
        taskInput(),
        NOW + 1,
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
      duplicate.record.revision,
      durable.revision,
    );
  },
);

test(
  'router can resume waiting approval without recreating durable task',
  async (t) => {
    const f =
      await fixture(
        t,
        {
          registerApproval:
            false,
        },
      );

    const waiting =
      await f.router.admitTask(
        taskInput(),
        NOW,
      );

    assert.equal(
      waiting.accepted,
      false,
    );
    assert.equal(
      waiting.reason,
      'approval_unknown',
    );
    assert.equal(
      waiting.record.state,
      'awaiting_approval',
    );

    assert.equal(
      f.approvals.register(
        approvalRecord(),
      ).accepted,
      true,
    );

    const resumed =
      await f.router.admitTask(
        taskInput(),
        NOW + 1,
      );

    assert.equal(
      resumed.accepted,
      true,
    );
    assert.equal(
      resumed.record.state,
      'queued',
    );
  },
);
test(
  'pre-delivery recheck rejects destination revocation without changing queued truth',
  async (t) => {
    const f = await fixture(t);

    await f.router.admitTask(
      taskInput(),
      NOW,
    );

    assert.equal(
      f.devices.updateState({
        deviceId: DEST,
        expectedRevision: 0,
        nextState: 'revoked',
        trustedNowMs:
          NOW + 1,
      }).accepted,
      true,
    );

    const delivery =
      await f.router
        .prepareDelivery(
          TASK,
          DELIVERY,
          NOW + 2,
        );

    assert.equal(
      delivery.accepted,
      false,
    );
    assert.equal(
      delivery.reason,
      'destination_revoked',
    );

    assert.equal(
      (
        await f.store.get(TASK)
      ).state,
      'queued',
    );
  },
);

test(
  'broker failure after durable delivery becomes explicit uncertainty and retry can rebuild transport state',
  async (t) => {
    const failingQueue = {
      enqueue() {
        return {
          accepted: false,
          reason:
            'broker_unavailable',
        };
      },
    };

    const f =
      await fixture(
        t,
        {
          deliveryQueue:
            failingQueue,
        },
      );

    await f.router.admitTask(
      taskInput(),
      NOW,
    );

    const failed =
      await f.router
        .prepareDelivery(
          TASK,
          DELIVERY,
          NOW + 1,
        );

    assert.equal(
      failed.accepted,
      false,
    );
    assert.equal(
      failed.durableUncertain,
      true,
    );
    assert.equal(
      (
        await f.store.get(TASK)
      ).state,
      'delivered',
    );

    const recoveredQueue =
      new BoundedDeliveryQueue();
    const recovered =
      new ControlPlaneRouter({
        deviceRegistry:
          f.devices,
        sessionRegistry:
          f.sessions,
        approvalRegistry:
          f.approvals,
        store: f.store,
        deliveryQueue:
          recoveredQueue,
      });

    const retry =
      await recovered
        .prepareDelivery(
          TASK,
          DELIVERY,
          NOW + 2,
        );

    assert.equal(
      retry.accepted,
      true,
    );
    assert.equal(
      retry.record.state,
      'delivered',
    );
    assert.equal(
      recoveredQueue
        .snapshot(DEST)
        .entries.length,
      1,
    );
  },
);
test(
  'gateway restart reconstructs pending delivery from durable authoritative record',
  async (t) => {
    const f = await fixture(t);

    await f.router.admitTask(
      taskInput(),
      NOW,
    );

    const first =
      await f.router
        .prepareDelivery(
          TASK,
          DELIVERY,
          NOW + 1,
        );

    assert.equal(
      first.accepted,
      true,
    );

    const restarted =
      new ControlPlaneRouter({
        deviceRegistry:
          f.devices,
        sessionRegistry:
          f.sessions,
        approvalRegistry:
          f.approvals,
        store:
          new DurableControlTaskStore({
            directory:
              path.join(
                f.root,
                'tasks',
              ),
            integrityKey:
              Buffer.alloc(
                32,
                0x33,
              ),
          }),
        deliveryQueue:
          new BoundedDeliveryQueue(),
      });

    const rebuilt =
      await restarted
        .prepareDelivery(
          TASK,
          DELIVERY,
          NOW + 2,
        );

    assert.equal(
      rebuilt.accepted,
      true,
    );
    assert.equal(
      rebuilt.record.state,
      'delivered',
    );
    assert.equal(
      rebuilt.delivery.taskId,
      TASK,
    );
  },
);

test(
  'cancel is durable idempotent and supersedes pending task delivery',
  async (t) => {
    const f = await fixture(t);

    await f.router.admitTask(
      taskInput(),
      NOW,
    );
    await f.router
      .prepareDelivery(
        TASK,
        DELIVERY,
        NOW + 1,
      );

    const cancelled =
      await f.router.cancelTask(
        TASK,
        CANCEL,
        'user_cancel',
        NOW + 2,
      );

    assert.equal(
      cancelled.accepted,
      true,
    );
    assert.equal(
      cancelled.record.state,
      'cancelled',
    );
    assert.equal(
      cancelled.delivery.kind,
      'cancel',
    );
    assert.equal(
      cancelled.delivery.sequence,
      1,
    );

    const duplicate =
      await f.router.cancelTask(
        TASK,
        CANCEL,
        'user_cancel',
        NOW + 3,
      );

    assert.equal(
      duplicate.accepted,
      true,
    );
    assert.equal(
      duplicate.duplicate,
      true,
    );

    const conflict =
      await f.router.cancelTask(
        TASK,
        CANCEL,
        'different_reason',
        NOW + 4,
      );

    assert.equal(
      conflict.accepted,
      false,
    );
    assert.equal(
      conflict.reason,
      'task_terminal',
    );
  },
);

test(
  'router accepts asynchronous durable approval registry and preserves consumed approval across restart',
  async (t) => {
    const root =
      await fs.mkdtemp(
        path.join(
          os.tmpdir(),
          'mudrik-router-durable-approval-',
        ),
      );

    t.after(
      () => fs.rm(
        root,
        {
          recursive: true,
          force: true,
        },
      ),
    );

    const {
      DurableApprovalRegistry,
    } = await import(
      '../src/durable-approval-registry.mjs'
    );

    const devices =
      new ControlDeviceRegistry({
        verifyEnrollment:
          () => true,
      });
    const sessions =
      new ControlSessionRegistry({
        verifySession:
          () => true,
      });
    const approvals =
      await new DurableApprovalRegistry({
        directory:
          path.join(
            root,
            'approvals',
          ),
        integrityKey:
          Buffer.alloc(
            32,
            0x44,
          ),
      }).init();
    const store =
      await new DurableControlTaskStore({
        directory:
          path.join(
            root,
            'tasks',
          ),
        integrityKey:
          Buffer.alloc(
            32,
            0x55,
          ),
      }).init();

    devices.register(
      deviceRecord(),
    );
    sessions.register(
      sessionRecord(),
    );
    await approvals.register(
      approvalRecord(),
    );

    const router =
      new ControlPlaneRouter({
        deviceRegistry: devices,
        sessionRegistry:
          sessions,
        approvalRegistry:
          approvals,
        store,
        deliveryQueue:
          new BoundedDeliveryQueue(),
      });

    const admitted =
      await router.admitTask(
        taskInput(),
        NOW,
      );

    assert.equal(
      admitted.accepted,
      true,
    );

    const consumed =
      await approvals.get(
        APPROVAL,
      );

    assert.equal(
      consumed.state,
      'consumed',
    );

    const restartedApprovals =
      await new DurableApprovalRegistry({
        directory:
          path.join(
            root,
            'approvals',
          ),
        integrityKey:
          Buffer.alloc(
            32,
            0x44,
          ),
      }).init();

    const restartedRouter =
      new ControlPlaneRouter({
        deviceRegistry: devices,
        sessionRegistry:
          sessions,
        approvalRegistry:
          restartedApprovals,
        store,
        deliveryQueue:
          new BoundedDeliveryQueue(),
      });

    const duplicate =
      await restartedRouter
        .admitTask(
          taskInput(),
          NOW + 1,
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
      (
        await restartedApprovals
          .get(APPROVAL)
      ).state,
      'consumed',
    );
  },
);
