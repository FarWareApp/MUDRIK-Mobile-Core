import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  applyCommandHistoryProjection,
  parseCommandHistoryProjection,
} = loadTypeScriptModule(
  'src/core/commandSurface/historyProjection.ts',
);

const {
  buildApprovalRequestPresentation,
} = loadTypeScriptModule(
  'src/core/commandSurface/approvalPresentation.ts',
);

const ACCOUNT =
  'acct_1111111111111111';
const DEVICE =
  'dev_1111111111111111';

function entry(
  suffix,
  completedAtMs,
  overrides = {},
) {
  return {
    taskId:
      'ctask_'
      + String(suffix)
        .padStart(16, '0'),
    destinationDeviceId: DEVICE,
    taskRevision: 4,
    outcome: 'succeeded',
    summary: 'Completed',
    completedAtMs,
    resultAvailable: true,
    grantsAuthority: false,
    ...overrides,
  };
}

function history(
  overrides = {},
) {
  return {
    accountId: ACCOUNT,
    revision: 1,
    generatedAtMs: 5000,
    entries: [
      entry(1, 3000),
      entry(2, 4000),
    ],
    truncated: false,
    grantsAuthority: false,
    ...overrides,
  };
}

function approval(
  overrides = {},
) {
  return {
    approvalId:
      'capproval_1111111111111111',
    accountId: ACCOUNT,
    taskId:
      'ctask_1111111111111111',
    destinationDeviceId: DEVICE,
    capabilities: [
      'terminal.execute',
      'filesystem.write',
    ],
    scopeSummary: [
      'Project workspace',
      'No network access',
    ],
    risk: 'high',
    mode: 'single_use',
    state: 'active',
    createdAtMs: 1000,
    expiresAtMs: 6000,
    consumedAtMs: null,
    revision: 2,
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
    lastSeenAtMs: 4500,
    revision: 3,
    grantsAuthority: false,
    ...overrides,
  };
}

test(
  'history projection is bounded deterministic and order-stable',
  () => {
    const parsed =
      parseCommandHistoryProjection(
        history(),
        ACCOUNT,
      );

    assert.ok(parsed);
    assert.deepEqual(
      parsed.entries.map(
        (item) => item.taskId,
      ),
      [
        'ctask_0000000000000002',
        'ctask_0000000000000001',
      ],
    );
    assert.equal(
      parsed.grantsAuthority,
      false,
    );

    const reordered =
      parseCommandHistoryProjection(
        history({
          entries: [
            entry(2, 4000),
            entry(1, 3000),
          ],
        }),
        ACCOUNT,
      );

    assert.deepEqual(
      reordered,
      parsed,
    );
  },
);

test(
  'history rejects duplicate tasks secret payloads cross-account and oversized lists',
  () => {
    assert.equal(
      parseCommandHistoryProjection(
        history({
          entries: [
            entry(1, 3000),
            entry(1, 4000),
          ],
        }),
        ACCOUNT,
      ),
      null,
    );

    assert.equal(
      parseCommandHistoryProjection(
        history({
          entries: [
            entry(1, 3000, {
              summary:
                'Bearer abcdefghijklmnopqrstuvwxyz',
            }),
          ],
        }),
        ACCOUNT,
      ),
      null,
    );

    assert.equal(
      parseCommandHistoryProjection(
        history({
          accountId:
            'acct_2222222222222222',
        }),
        ACCOUNT,
      ),
      null,
    );

    assert.equal(
      parseCommandHistoryProjection(
        history({
          entries:
            Array.from(
              { length: 129 },
              (_, index) =>
                entry(
                  index + 1,
                  3000 + index,
                ),
            ),
        }),
        ACCOUNT,
      ),
      null,
    );
  },
);

test(
  'history update is revision monotonic duplicate-safe and time monotonic',
  () => {
    const current =
      parseCommandHistoryProjection(
        history(),
        ACCOUNT,
      );

    assert.ok(current);

    const duplicate =
      applyCommandHistoryProjection(
        current,
        current,
      );

    assert.equal(
      duplicate.accepted,
      true,
    );
    assert.equal(
      duplicate.duplicate,
      true,
    );

    const stale =
      parseCommandHistoryProjection(
        history({
          revision: 0,
        }),
        ACCOUNT,
      );

    assert.equal(
      applyCommandHistoryProjection(
        current,
        stale,
      ).reason,
      'stale_revision',
    );

    const rollback =
      parseCommandHistoryProjection(
        history({
          revision: 2,
          generatedAtMs: 4999,
        }),
        ACCOUNT,
      );

    assert.equal(
      applyCommandHistoryProjection(
        current,
        rollback,
      ).reason,
      'time_regression',
    );
  },
);

test(
  'approval request presentation explicitly exposes device capabilities scope risk mode and expiry',
  () => {
    const ltr =
      buildApprovalRequestPresentation(
        approval(),
        device(),
        'ltr',
      );
    const rtl =
      buildApprovalRequestPresentation(
        approval(),
        device(),
        'rtl',
      );

    assert.ok(ltr);
    assert.ok(rtl);
    assert.equal(
      ltr.approvalId,
      rtl.approvalId,
    );
    assert.equal(
      ltr.deviceDisplayName,
      'Workstation',
    );
    assert.deepEqual(
      ltr.capabilityLabelKeys,
      [
        'capability.terminal.execute',
        'capability.filesystem.write',
      ],
    );
    assert.deepEqual(
      ltr.scopeSummary,
      [
        'Project workspace',
        'No network access',
      ],
    );
    assert.equal(
      ltr.riskLabelKey,
      'risk.high',
    );
    assert.equal(
      ltr.modeLabelKey,
      'approval.mode.single_use',
    );
    assert.equal(
      ltr.expiresAtMs,
      6000,
    );
    assert.equal(
      ltr.decisionAvailable,
      true,
    );
    assert.equal(
      ltr.minTouchTargetDp,
      48,
    );
    assert.equal(
      ltr.grantsAuthority,
      false,
    );
  },
);

test(
  'inactive approval cannot present a decision and device identity mismatch fails closed',
  () => {
    const consumed =
      buildApprovalRequestPresentation(
        approval({
          state: 'consumed',
          consumedAtMs: 2000,
        }),
        device(),
        'ltr',
      );

    assert.ok(consumed);
    assert.equal(
      consumed.decisionAvailable,
      false,
    );

    assert.equal(
      buildApprovalRequestPresentation(
        approval(),
        device({
          deviceId:
            'dev_2222222222222222',
        }),
        'ltr',
      ),
      null,
    );

    assert.equal(
      buildApprovalRequestPresentation(
        approval(),
        device(),
        'auto',
      ),
      null,
    );
  },
);

test(
  'approval scope and device labels reject secret-like disclosure',
  () => {
    const {
      parseCommandApprovalProjection,
    } = loadTypeScriptModule(
      'src/core/commandSurface/approvalProjection.ts',
    );

    const {
      parseCommandDeviceProjection,
    } = loadTypeScriptModule(
      'src/core/commandSurface/deviceProjection.ts',
    );

    assert.equal(
      parseCommandApprovalProjection({
        ...approval(),
        scopeSummary: [
          'Bearer abcdefghijklmnopqrstuvwxyz',
        ],
      }),
      null,
    );

    assert.equal(
      parseCommandDeviceProjection({
        ...device(),
        displayName:
          'secret_ref_0123456789abcdef',
      }),
      null,
    );
  },
);
