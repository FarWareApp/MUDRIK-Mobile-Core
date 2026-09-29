import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CAPABILITIES,
} from '../../computer-agent/src/capabilities.mjs';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  COMPUTER_CONTROL_CAPABILITIES,
} = loadTypeScriptModule(
  'src/core/commandSurface/computerCapabilities.ts',
);

const {
  isDeviceReachableHint,
  parseCommandDeviceProjection,
} = loadTypeScriptModule(
  'src/core/commandSurface/deviceProjection.ts',
);

const {
  applyCommandTaskProjection,
  parseCommandTaskProjection,
} = loadTypeScriptModule(
  'src/core/commandSurface/taskProjection.ts',
);

const {
  parseCommandApprovalProjection,
} = loadTypeScriptModule(
  'src/core/commandSurface/approvalProjection.ts',
);

const {
  parseCommandApprovalDecisionIntent,
  parseCommandTaskControlIntent,
} = loadTypeScriptModule(
  'src/core/commandSurface/controlIntent.ts',
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
const APPROVAL =
  'capproval_1111111111111111';

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
    revision: 4,
    risk: 'medium',
    requestedCapabilities: [
      'filesystem.read',
    ],
    approvalId: null,
    updatedAtMs: 2000,
    expiresAtMs: 10000,
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
      'filesystem.write',
    ],
    scopeSummary: [
      'Workspace: /project',
    ],
    risk: 'high',
    mode: 'single_use',
    state: 'active',
    createdAtMs: 1000,
    expiresAtMs: 5000,
    consumedAtMs: null,
    revision: 0,
    grantsAuthority: false,
    ...overrides,
  };
}

test(
  'surface computer capability vocabulary exactly matches Computer Agent vocabulary',
  () => {
    assert.deepEqual(
      [...COMPUTER_CONTROL_CAPABILITIES]
        .sort(),
      [...CAPABILITIES].sort(),
    );
  },
);

test(
  'device projection is exact account-bound and presence remains only a reachability hint',
  () => {
    const parsed =
      parseCommandDeviceProjection(
        device(),
        ACCOUNT,
      );

    assert.ok(parsed);
    assert.equal(
      parsed.grantsAuthority,
      false,
    );
    assert.equal(
      isDeviceReachableHint(parsed),
      true,
    );

    assert.equal(
      parseCommandDeviceProjection(
        device({
          accountId:
            OTHER_ACCOUNT,
        }),
        ACCOUNT,
      ),
      null,
    );

    const revoked =
      parseCommandDeviceProjection(
        device({
          trustState: 'revoked',
          presence: 'online',
        }),
        ACCOUNT,
      );

    assert.ok(revoked);
    assert.equal(
      isDeviceReachableHint(revoked),
      false,
    );

    assert.equal(
      parseCommandDeviceProjection({
        ...device(),
        authorized: true,
      }),
      null,
    );
  },
);

test(
  'task projection rejects cross-account cross-device hidden authority and unknown capabilities',
  () => {
    assert.ok(
      parseCommandTaskProjection(
        task(),
        {
          expectedAccountId:
            ACCOUNT,
          expectedDeviceId:
            DEVICE,
        },
      ),
    );

    for (const invalid of [
      task({
        accountId:
          OTHER_ACCOUNT,
      }),
      task({
        destinationDeviceId:
          OTHER_DEVICE,
      }),
      task({
        requestedCapabilities: [
          'system.root',
        ],
      }),
      {
        ...task(),
        approved: true,
      },
      task({
        grantsAuthority: true,
      }),
    ]) {
      assert.equal(
        parseCommandTaskProjection(
          invalid,
          {
            expectedAccountId:
              ACCOUNT,
            expectedDeviceId:
              DEVICE,
          },
        ),
        null,
      );
    }
  },
);

test(
  'task projection is monotonic duplicate-safe and terminal state never regresses',
  () => {
    const current =
      parseCommandTaskProjection(
        task(),
      );

    assert.ok(current);

    const stale =
      parseCommandTaskProjection(
        task({
          revision: 3,
          state: 'queued',
        }),
      );

    assert.ok(stale);
    assert.equal(
      applyCommandTaskProjection(
        current,
        stale,
      ).reason,
      'stale_revision',
    );

    assert.equal(
      applyCommandTaskProjection(
        current,
        current,
      ).reason,
      'duplicate',
    );

    const conflict =
      parseCommandTaskProjection(
        task({
          state: 'failed',
        }),
      );

    assert.ok(conflict);
    assert.equal(
      applyCommandTaskProjection(
        current,
        conflict,
      ).reason,
      'revision_conflict',
    );

    const terminal =
      parseCommandTaskProjection(
        task({
          state: 'succeeded',
          revision: 5,
          terminalReason:
            'completed',
        }),
      );

    const regression =
      parseCommandTaskProjection(
        task({
          state: 'running',
          revision: 6,
        }),
      );

    assert.ok(terminal);
    assert.ok(regression);
    assert.equal(
      applyCommandTaskProjection(
        terminal,
        regression,
      ).reason,
      'terminal_regression',
    );
  },
);

test(
  'expired task projection may be updated at or after expiry without becoming authority',
  () => {
    const expired =
      parseCommandTaskProjection(
        task({
          state: 'expired',
          revision: 7,
          updatedAtMs: 12000,
          expiresAtMs: 10000,
          terminalReason:
            'task_expired',
        }),
      );

    assert.ok(expired);
    assert.equal(
      expired.grantsAuthority,
      false,
    );
  },
);

test(
  'approval projection is exact-bound and rejects forged approval truth',
  () => {
    const parsed =
      parseCommandApprovalProjection(
        approval(),
        {
          expectedAccountId:
            ACCOUNT,
          expectedTaskId: TASK,
          expectedDeviceId:
            DEVICE,
        },
      );

    assert.ok(parsed);
    assert.equal(
      parsed.grantsAuthority,
      false,
    );

    for (const invalid of [
      approval({
        taskId:
          'ctask_2222222222222222',
      }),
      approval({
        capabilities: [
          'unknown.capability',
        ],
      }),
      approval({
        risk: 'critical',
        mode: 'task_lifetime',
      }),
      {
        ...approval(),
        approved: true,
      },
    ]) {
      assert.equal(
        parseCommandApprovalProjection(
          invalid,
          {
            expectedAccountId:
              ACCOUNT,
            expectedTaskId: TASK,
            expectedDeviceId:
              DEVICE,
          },
        ),
        null,
      );
    }
  },
);

test(
  'task control intent is exact revision-bound and cannot carry authority',
  () => {
    const base = {
      protocolVersion: '1.0',
      accountId: ACCOUNT,
      taskId: TASK,
      destinationDeviceId:
        DEVICE,
      expectedRevision: 4,
      action: 'cancel',
      issuedAtMs: 3000,
      grantsAuthority: false,
    };

    assert.ok(
      parseCommandTaskControlIntent(
        base,
      ),
    );

    assert.equal(
      parseCommandTaskControlIntent({
        ...base,
        taskId:
          'not-a-task',
      }),
      null,
    );

    assert.equal(
      parseCommandTaskControlIntent({
        ...base,
        authorized: true,
      }),
      null,
    );

    assert.equal(
      parseCommandTaskControlIntent({
        ...base,
        grantsAuthority: true,
      }),
      null,
    );
  },
);

test(
  'approval decision intent binds exact approval task device account and revision',
  () => {
    const base = {
      protocolVersion: '1.0',
      accountId: ACCOUNT,
      approvalId: APPROVAL,
      taskId: TASK,
      destinationDeviceId:
        DEVICE,
      expectedApprovalRevision: 0,
      decision: 'approve',
      issuedAtMs: 3000,
      grantsAuthority: false,
    };

    assert.ok(
      parseCommandApprovalDecisionIntent(
        base,
      ),
    );

    for (const invalid of [
      {
        ...base,
        approvalId:
          'capproval_2222222222222222',
        approved: true,
      },
      {
        ...base,
        decision: 'auto_approve',
      },
      {
        ...base,
        expectedApprovalRevision:
          -1,
      },
      {
        ...base,
        grantsAuthority: true,
      },
    ]) {
      assert.equal(
        parseCommandApprovalDecisionIntent(
          invalid,
        ),
        null,
      );
    }
  },
);
