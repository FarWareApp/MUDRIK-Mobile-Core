import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  CommandSurfaceStateStore,
  parseCommandSurfaceConnectivityProjection,
} = loadTypeScriptModule(
  'src/core/commandSurface/surfaceState.ts',
);

const ACCOUNT =
  'acct_1111111111111111';
const OTHER_ACCOUNT =
  'acct_2222222222222222';
const DEVICE =
  'dev_1111111111111111';
const OTHER_DEVICE =
  'dev_2222222222222222';
const TASK =
  'ctask_1111111111111111';
const TASK2 =
  'ctask_2222222222222222';
const APPROVAL =
  'capproval_1111111111111111';

function connectivity(
  overrides = {},
) {
  return {
    accountId: ACCOUNT,
    state: 'online',
    revision: 1,
    updatedAtMs: 1000,
    grantsAuthority: false,
    ...overrides,
  };
}

function device(
  overrides = {},
) {
  return {
    accountId: ACCOUNT,
    deviceId: DEVICE,
    displayName: 'Workstation',
    platform: 'linux',
    agentVersion: '1.0.0',
    presence: 'online',
    trustState: 'active',
    lastSeenAtMs: 1000,
    revision: 1,
    grantsAuthority: false,
    ...overrides,
  };
}

function task(
  overrides = {},
) {
  return {
    accountId: ACCOUNT,
    taskId: TASK,
    destinationDeviceId: DEVICE,
    state: 'running',
    revision: 5,
    risk: 'medium',
    requestedCapabilities: [
      'terminal.execute',
    ],
    approvalId: null,
    updatedAtMs: 2000,
    expiresAtMs: 20_000,
    terminalReason: null,
    grantsAuthority: false,
    ...overrides,
  };
}

function approval(
  overrides = {},
) {
  return {
    approvalId: APPROVAL,
    accountId: ACCOUNT,
    taskId: TASK,
    destinationDeviceId: DEVICE,
    capabilities: [
      'terminal.execute',
    ],
    scopeSummary: [
      'Workspace only',
    ],
    risk: 'medium',
    mode: 'single_use',
    state: 'active',
    createdAtMs: 1000,
    expiresAtMs: 10_000,
    consumedAtMs: null,
    revision: 1,
    grantsAuthority: false,
    ...overrides,
  };
}

function result(
  overrides = {},
) {
  return {
    accountId: ACCOUNT,
    taskId: TASK,
    destinationDeviceId: DEVICE,
    taskRevision: 6,
    outcome: 'succeeded',
    summary: 'Completed successfully',
    outputExcerpt: 'ok',
    fileChanges: [],
    completedAtMs: 3000,
    truncated: false,
    grantsAuthority: false,
    ...overrides,
  };
}

test(
  'connectivity projection is strict account-bound and carries no authority',
  () => {
    const parsed =
      parseCommandSurfaceConnectivityProjection(
        connectivity(),
        ACCOUNT,
      );

    assert.ok(parsed);
    assert.equal(
      parsed.grantsAuthority,
      false,
    );

    assert.equal(
      parseCommandSurfaceConnectivityProjection(
        connectivity({
          accountId:
            OTHER_ACCOUNT,
        }),
        ACCOUNT,
      ),
      null,
    );

    assert.equal(
      parseCommandSurfaceConnectivityProjection({
        ...connectivity(),
        executionSucceeded: true,
      }),
      null,
    );
  },
);

test(
  'offline and reconnecting remain separate from authoritative task state',
  () => {
    const store =
      new CommandSurfaceStateStore(
        ACCOUNT,
      );

    assert.equal(
      store.applyTask(task())
        .accepted,
      true,
    );

    store.applyConnectivity(
      connectivity({
        state: 'online',
      }),
    );

    let view =
      store.taskView(TASK);

    assert.equal(
      view.task.state,
      'running',
    );
    assert.equal(
      view.connectivity,
      'online',
    );
    assert.equal(
      view.certainty,
      'current',
    );

    store.applyConnectivity(
      connectivity({
        state: 'offline',
        revision: 2,
        updatedAtMs: 1100,
      }),
    );

    view = store.taskView(TASK);

    assert.equal(
      view.task.state,
      'running',
    );
    assert.equal(
      view.connectivity,
      'offline',
    );
    assert.equal(
      view.certainty,
      'last_known',
    );
  },
);

test(
  'task stream is duplicate-safe monotonic and terminal state cannot regress',
  () => {
    const store =
      new CommandSurfaceStateStore(
        ACCOUNT,
      );

    const running = task();

    assert.equal(
      store.applyTask(running)
        .accepted,
      true,
    );

    const duplicate =
      store.applyTask(running);

    assert.equal(
      duplicate.accepted,
      true,
    );
    assert.equal(
      duplicate.duplicate,
      true,
    );

    const stale =
      store.applyTask(
        task({
          revision: 4,
          state: 'queued',
          updatedAtMs: 1900,
        }),
      );

    assert.equal(
      stale.accepted,
      false,
    );
    assert.equal(
      stale.reason,
      'stale_revision',
    );

    assert.equal(
      store.applyTask(
        task({
          revision: 6,
          state: 'succeeded',
          updatedAtMs: 3000,
          terminalReason:
            'completed',
        }),
      ).accepted,
      true,
    );

    const regression =
      store.applyTask(
        task({
          revision: 7,
          state: 'running',
          updatedAtMs: 3100,
        }),
      );

    assert.equal(
      regression.accepted,
      false,
    );
    assert.equal(
      regression.reason,
      'terminal_regression',
    );
  },
);

test(
  'approval updates are revision-bound and consumed or revoked approval cannot reactivate',
  () => {
    const store =
      new CommandSurfaceStateStore(
        ACCOUNT,
      );

    assert.equal(
      store.applyApproval(
        approval(),
      ).accepted,
      true,
    );

    const consumed =
      approval({
        state: 'consumed',
        consumedAtMs: 2000,
        revision: 2,
      });

    assert.equal(
      store.applyApproval(
        consumed,
      ).accepted,
      true,
    );

    const replay =
      store.applyApproval(
        consumed,
      );

    assert.equal(
      replay.accepted,
      true,
    );
    assert.equal(
      replay.duplicate,
      true,
    );

    const reactivated =
      store.applyApproval(
        approval({
          revision: 3,
        }),
      );

    assert.equal(
      reactivated.accepted,
      false,
    );
    assert.equal(
      reactivated.reason,
      'terminal_regression',
    );
  },
);

test(
  'result requires exact terminal task identity revision and outcome',
  () => {
    const store =
      new CommandSurfaceStateStore(
        ACCOUNT,
      );

    store.applyTask(task());

    const early =
      store.applyResult(
        result({
          taskRevision: 5,
        }),
      );

    assert.equal(
      early.accepted,
      false,
    );
    assert.equal(
      early.reason,
      'task_not_terminal',
    );

    store.applyTask(
      task({
        revision: 6,
        state: 'succeeded',
        updatedAtMs: 3000,
        terminalReason:
          'completed',
      }),
    );

    const wrongRevision =
      store.applyResult(
        result({
          taskRevision: 5,
        }),
      );

    assert.equal(
      wrongRevision.accepted,
      false,
    );
    assert.equal(
      wrongRevision.reason,
      'result_revision_mismatch',
    );

    const wrongOutcome =
      store.applyResult(
        result({
          outcome: 'failed',
        }),
      );

    assert.equal(
      wrongOutcome.accepted,
      false,
    );
    assert.equal(
      wrongOutcome.reason,
      'result_outcome_mismatch',
    );

    const accepted =
      store.applyResult(
        result(),
      );

    assert.equal(
      accepted.accepted,
      true,
    );

    const duplicate =
      store.applyResult(
        result(),
      );

    assert.equal(
      duplicate.accepted,
      true,
    );
    assert.equal(
      duplicate.duplicate,
      true,
    );
  },
);

test(
  'terminal result remains current even while surface is offline',
  () => {
    const store =
      new CommandSurfaceStateStore(
        ACCOUNT,
      );

    store.applyTask(
      task({
        revision: 6,
        state: 'succeeded',
        updatedAtMs: 3000,
        terminalReason:
          'completed',
      }),
    );

    store.applyConnectivity(
      connectivity({
        state: 'offline',
      }),
    );

    const view =
      store.taskView(TASK);

    assert.equal(
      view.task.state,
      'succeeded',
    );
    assert.equal(
      view.connectivity,
      'offline',
    );
    assert.equal(
      view.certainty,
      'current',
    );
  },
);

test(
  'cross-account and cross-device projections fail closed',
  () => {
    const store =
      new CommandSurfaceStateStore(
        ACCOUNT,
      );

    assert.equal(
      store.applyDevice(
        device({
          accountId:
            OTHER_ACCOUNT,
        }),
      ).accepted,
      false,
    );

    assert.equal(
      store.applyTask(
        task({
          accountId:
            OTHER_ACCOUNT,
        }),
      ).accepted,
      false,
    );

    assert.equal(
      store.applyApproval(
        approval({
          accountId:
            OTHER_ACCOUNT,
        }),
      ).accepted,
      false,
    );

    store.applyTask(
      task({
        revision: 6,
        state: 'succeeded',
        updatedAtMs: 3000,
        terminalReason:
          'completed',
      }),
    );

    assert.equal(
      store.applyResult(
        result({
          destinationDeviceId:
            OTHER_DEVICE,
        }),
      ).accepted,
      false,
    );
  },
);

test(
  'bounded lists reject new items at capacity without silently evicting existing truth',
  () => {
    const store =
      new CommandSurfaceStateStore(
        ACCOUNT,
        {
          maxDevices: 1,
          maxTasks: 1,
          maxApprovals: 1,
          maxResults: 1,
        },
      );

    assert.equal(
      store.applyDevice(
        device(),
      ).accepted,
      true,
    );

    const deviceOverflow =
      store.applyDevice(
        device({
          deviceId:
            OTHER_DEVICE,
          revision: 1,
        }),
      );

    assert.equal(
      deviceOverflow.reason,
      'capacity_exhausted',
    );

    assert.equal(
      store.applyTask(task())
        .accepted,
      true,
    );

    const taskOverflow =
      store.applyTask(
        task({
          taskId: TASK2,
          revision: 1,
        }),
      );

    assert.equal(
      taskOverflow.reason,
      'capacity_exhausted',
    );

    const snapshot =
      store.snapshot();

    assert.equal(
      snapshot.devices.length,
      1,
    );
    assert.equal(
      snapshot.devices[0]
        .deviceId,
      DEVICE,
    );
    assert.equal(
      snapshot.tasks.length,
      1,
    );
    assert.equal(
      snapshot.tasks[0].taskId,
      TASK,
    );
  },
);

test(
  'same revision with conflicting content fails instead of last-write-wins',
  () => {
    const store =
      new CommandSurfaceStateStore(
        ACCOUNT,
      );

    store.applyDevice(device());

    const conflict =
      store.applyDevice(
        device({
          displayName:
            'Injected replacement',
        }),
      );

    assert.equal(
      conflict.accepted,
      false,
    );
    assert.equal(
      conflict.reason,
      'revision_conflict',
    );

    store.applyConnectivity(
      connectivity(),
    );

    const connectivityConflict =
      store.applyConnectivity(
        connectivity({
          state: 'offline',
        }),
      );

    assert.equal(
      connectivityConflict.accepted,
      false,
    );
    assert.equal(
      connectivityConflict.reason,
      'revision_conflict',
    );
  },
);
