import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  buildApprovalDecisionPresentation,
  buildTaskControlPresentation,
} = loadTypeScriptModule(
  'src/core/commandSurface/surfaceControls.ts',
);

const ACCOUNT =
  'acct_1111111111111111';
const DEVICE =
  'dev_1111111111111111';
const TASK =
  'ctask_1111111111111111';
const APPROVAL =
  'capproval_1111111111111111';

function task(overrides = {}) {
  return {
    accountId: ACCOUNT,
    taskId: TASK,
    destinationDeviceId: DEVICE,
    state: 'running',
    revision: 7,
    risk: 'medium',
    requestedCapabilities: [
      'terminal.execute',
    ],
    approvalId: null,
    updatedAtMs: 1000,
    expiresAtMs: 10_000,
    terminalReason: null,
    grantsAuthority: false,
    ...overrides,
  };
}

function control(
  action,
  overrides = {},
) {
  return {
    protocolVersion: '1.0',
    accountId: ACCOUNT,
    taskId: TASK,
    destinationDeviceId: DEVICE,
    expectedRevision: 7,
    action,
    issuedAtMs: 1100,
    grantsAuthority: false,
    ...overrides,
  };
}

function approval(
  decision,
  overrides = {},
) {
  return {
    protocolVersion: '1.0',
    accountId: ACCOUNT,
    approvalId: APPROVAL,
    taskId: TASK,
    destinationDeviceId: DEVICE,
    expectedApprovalRevision: 4,
    decision,
    issuedAtMs: 1100,
    grantsAuthority: false,
    ...overrides,
  };
}

test(
  'LTR and RTL preserve exact cancel action identity and destructive meaning',
  () => {
    const ltr =
      buildTaskControlPresentation(
        control('cancel'),
        task(),
        'ltr',
      );
    const rtl =
      buildTaskControlPresentation(
        control('cancel'),
        task(),
        'rtl',
      );

    assert.ok(ltr);
    assert.ok(rtl);
    assert.equal(
      ltr.actionIdentity,
      rtl.actionIdentity,
    );
    assert.equal(
      ltr.semantic,
      'destructive',
    );
    assert.equal(
      rtl.semantic,
      'destructive',
    );
    assert.equal(
      ltr.immediateReachable,
      true,
    );
    assert.equal(
      rtl.immediateReachable,
      true,
    );
    assert.equal(
      ltr.minTouchTargetDp,
      48,
    );
    assert.equal(
      ltr.keyboardReachable,
      true,
    );
    assert.equal(
      ltr.grantsAuthority,
      false,
    );
  },
);

test(
  'stop remains immediately reachable only while task is cancellable',
  () => {
    assert.ok(
      buildTaskControlPresentation(
        control('cancel'),
        task({
          state: 'running',
        }),
        'ltr',
      ),
    );

    assert.equal(
      buildTaskControlPresentation(
        control('cancel'),
        task({
          state: 'succeeded',
          terminalReason:
            'completed',
        }),
        'ltr',
      ),
      null,
    );
  },
);

test(
  'pause and resume presentations are state and revision bound',
  () => {
    assert.ok(
      buildTaskControlPresentation(
        control('pause'),
        task(),
        'ltr',
      ),
    );

    assert.equal(
      buildTaskControlPresentation(
        control('resume'),
        task(),
        'ltr',
      ),
      null,
    );

    assert.ok(
      buildTaskControlPresentation(
        control('resume'),
        task({
          state: 'blocked',
        }),
        'rtl',
      ),
    );

    assert.equal(
      buildTaskControlPresentation(
        control('cancel', {
          expectedRevision: 6,
        }),
        task(),
        'ltr',
      ),
      null,
    );
  },
);

test(
  'approval and rejection identity is direction independent and non-authoritative',
  () => {
    const approveLtr =
      buildApprovalDecisionPresentation(
        approval('approve'),
        'ltr',
      );
    const approveRtl =
      buildApprovalDecisionPresentation(
        approval('approve'),
        'rtl',
      );
    const reject =
      buildApprovalDecisionPresentation(
        approval('reject'),
        'rtl',
      );

    assert.equal(
      approveLtr.actionIdentity,
      approveRtl.actionIdentity,
    );
    assert.equal(
      approveLtr.semantic,
      'approval',
    );
    assert.equal(
      reject.semantic,
      'rejection',
    );
    assert.notEqual(
      approveLtr.actionIdentity,
      reject.actionIdentity,
    );
    assert.equal(
      approveRtl.grantsAuthority,
      false,
    );
    assert.equal(
      approveRtl.screenReaderRole,
      'button',
    );
  },
);

test(
  'invalid direction and identity mismatch fail closed',
  () => {
    assert.equal(
      buildTaskControlPresentation(
        control('cancel'),
        task(),
        'auto',
      ),
      null,
    );

    assert.equal(
      buildTaskControlPresentation(
        control('cancel', {
          destinationDeviceId:
            'dev_2222222222222222',
        }),
        task(),
        'ltr',
      ),
      null,
    );

    assert.equal(
      buildApprovalDecisionPresentation(
        approval('approve'),
        'auto',
      ),
      null,
    );
  },
);
