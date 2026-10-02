import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  GoalExecutionKernel,
} = loadTypeScriptModule(
  'src/core/agent/goalExecutionKernel.ts',
);

const NOW = 2_600_000_000;
const SUBJECT = 'subject_user_1111';

function goal(overrides = {}) {
  return {
    protocolVersion: '1.0',
    goalId: 'goal_1111111111111111',
    sourceRequestId:
      'brain_request_1111111111111111',
    workspaceId:
      'workspace_1111111111111111',
    intent: 'operate',
    risk: 'high',
    verification: 'standard',
    sideEffectPolicy: 'approval-required',
    maxSteps: 8,
    maxRepairCycles: 2,
    maxToolAttempts: 4,
    createdAtMs: NOW,
    deadlineAtMs: NOW + 120_000,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
    ...overrides,
  };
}

function step(
  ordinal,
  kind,
  overrides = {},
) {
  const suffix =
    String(ordinal).repeat(16);

  return {
    stepId: 'goal_step_' + suffix,
    ordinal,
    kind,
    operationRef:
      'operation_ref_' + suffix,
    dependsOn:
      ordinal === 1
        ? []
        : [
            'goal_step_'
            + String(ordinal - 1).repeat(16),
          ],
    requiredCapabilities: [],
    sideEffect: false,
    requiresApproval: false,
    rollbackRef: null,
    verificationRef: null,

    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
    ...overrides,
  };
}

function plan(
  firstOverrides = {},
) {
  return {
    protocolVersion: '1.0',
    planId:
      'goal_plan_1111111111111111',
    goalId:
      'goal_1111111111111111',
    sourceRequestId:
      'brain_request_1111111111111111',
    generatedAtMs: NOW,
    steps: [

      step(1, 'tool', {
        requiredCapabilities: [
          'filesystem.write',
        ],
        sideEffect: true,
        requiresApproval: true,
        rollbackRef:
          'rollback_ref_1111111111111111',
        ...firstOverrides,
      }),
      step(2, 'verify', {
        verificationRef:
          'verification_ref_2222222222222222',
      }),
      step(3, 'finalize'),
    ],

    providerIndependent: true,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  };
}

function grant() {
  return {
    grantId:
      'grant_filesystem_write_111111111111',
    subjectId: SUBJECT,
    capability: 'filesystem.write',
    scope: {
      resourcePrefix:
        '/home/user/project',
      maxElevation: 'none',
    },
    expiresAtMs: NOW + 60_000,
  };
}

function ids() {
  let lease = 0;
  let rollback = 0;
  let reservation = 0;

  return {
    nextLeaseId() {
      lease += 1;
      return (
        'goal_lease_'
        + String(lease).repeat(16)
      );
    },
    nextRollbackId() {
      rollback += 1;
      return (
        'goal_rollback_'
        + String(rollback).repeat(16)
      );
    },
    nextReservationId() {
      reservation += 1;
      return (
        'goal_budget_reservation_'
        + String(reservation).repeat(16)
      );
    },
  };
}

const budgetPolicy = {
  maxModelCalls: 8,
  maxProviderCostMicros: 100_000,
  maxNetworkRequests: 16,
  maxOutputBytes: 100_000,
  maxConcurrentOperations: 2,
  maxWallTimeMs: 120_000,
};

function usage(overrides = {}) {
  return {
    modelCalls: 0,
    providerCostMicros: 0,
    networkRequests: 0,
    outputBytes: 100,
    concurrentOperations: 1,
    ...overrides,
  };
}

function kernel(
  firstOverrides = {},
  policyOverrides = {},
) {
  return new GoalExecutionKernel(
    goal(),
    plan(firstOverrides),
    [grant()],
    SUBJECT,

    {
      'filesystem.write': {
        resourcePath:
          '/home/user/project/src/app.ts',
        elevation: 'none',
      },
    },
    {
      authorize() {
        return {
          allowed: true,
          approvalRef:
            'approval_ref_1111111111111111',
        };
      },
    },
    {
      leaseTtlMs: 30_000,
      allowIrreversibleSideEffects: false,
      resourceBudget: budgetPolicy,
      ...policyOverrides,
    },
    ids(),
  );
}

function successReceipt(
  preparation,
  attempt = 1,
  overrides = {},
) {
  return {
    protocolVersion: '1.0',
    receiptId:
      'goal_receipt_'
      + String(attempt).repeat(16),

    leaseId:
      preparation.lease.leaseId,
    goalId:
      preparation.lease.goalId,
    planId:
      preparation.lease.planId,
    stepId:
      preparation.lease.stepId,
    operationRef:
      preparation.lease.operationRef,
    generation:
      preparation.lease.generation,
    attempt,
    outcome: 'succeeded',
    resultRef:
      'result_ref_'
      + String(attempt).repeat(16),
    evidenceRef:
      'evidence_ref_'
      + String(attempt).repeat(16),
    failureReason: null,
    startedAtMs:
      preparation.lease.issuedAtMs + 1,
    completedAtMs:
      preparation.lease.issuedAtMs + 2,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
    ...overrides,
  };
}

test('kernel executes side effect through lease receipt verification and finalize', () => {
  const runtime = kernel();

  assert.equal(
    runtime.start(NOW).accepted,
    true,
  );

  const tool =
    runtime.prepareCurrentStep(
      0,
      usage(),
      NOW + 1,
    );

  assert.equal(tool.accepted, true);
  assert.ok(tool.lease);
  assert.equal(
    runtime.getRollbackStates()[0]?.status,
    'armed',
  );

  const toolSettled =
    runtime.settleCurrentStep(
      successReceipt(tool, 1),
      usage(),
      NOW + 4,
    );

  assert.equal(
    toolSettled.accepted,
    true,
  );
  assert.equal(
    runtime.getCurrentStep()?.kind,
    'verify',
  );
});

test('kernel reaches completion after verification', () => {
  const runtime = kernel();
  runtime.start(NOW);

  const tool =
    runtime.prepareCurrentStep(
      0,
      usage(),
      NOW + 1,
    );

  assert.ok(tool.lease);

  runtime.settleCurrentStep(
    successReceipt(tool, 1),
    usage(),
    NOW + 4,
  );

  const verify =
    runtime.prepareCurrentStep(
      0,
      usage(),
      NOW + 5,
    );

  assert.equal(verify.accepted, true);
  assert.ok(verify.lease);

  runtime.settleCurrentStep(
    successReceipt(verify, 2),
    usage(),
    NOW + 8,
  );

  const finalize =
    runtime.prepareCurrentStep(
      0,
      usage(),
      NOW + 9,
    );

  assert.equal(finalize.accepted, true);
  assert.ok(finalize.lease);

  const done =
    runtime.settleCurrentStep(
      successReceipt(finalize, 3),
      usage(),
      NOW + 12,
    );

  assert.equal(done.accepted, true);
  assert.equal(
    runtime.getState().phase,
    'completed',
  );
});

test('failed side effect requires rollback before repair can continue', () => {
  const runtime = kernel();
  runtime.start(NOW);

  const prepared =
    runtime.prepareCurrentStep(
      0,
      usage(),
      NOW + 1,
    );

  assert.ok(prepared.lease);

  const failedReceipt =
    successReceipt(
      prepared,
      1,
      {
        outcome: 'failed',
        resultRef: null,
        evidenceRef:
          'evidence_ref_partial_1111111111',
        failureReason:
          'provider_timeout',
      },
    );

  const settled =
    runtime.settleCurrentStep(
      failedReceipt,
      usage(),
      NOW + 4,
    );

  assert.equal(settled.accepted, true);
  assert.equal(
    runtime.getState().phase,
    'repairing',
  );

  const rollback =
    runtime.getRollbackStates()[0];

  assert.equal(
    rollback?.status,
    'required',
  );

  assert.equal(
    runtime.completeRepair(
      'repair_evidence_1111111111111111',
      NOW + 5,
    ).accepted,
    false,
  );

  assert.ok(rollback);

  assert.equal(
    runtime.startRollback(
      rollback.registration.rollbackId,
      1,
      NOW + 6,
    ).accepted,
    true,
  );

  assert.equal(
    runtime.succeedRollback(
      rollback.registration.rollbackId,
      1,
      'rollback_evidence_11111111111111',
      NOW + 7,
    ).accepted,
    true,
  );

  assert.equal(
    runtime.completeRepair(
      'repair_evidence_1111111111111111',
      NOW + 8,
    ).accepted,
    true,
  );

  assert.equal(
    runtime.prepareCurrentStep(
      0,
      usage(),
      NOW + 9,
    ).reason,
    'generation_invalid',
  );

  assert.equal(
    runtime.prepareCurrentStep(
      1,
      usage(),
      NOW + 9,
    ).accepted,
    true,
  );
});

test('forged receipt cannot consume an active lease', () => {
  const runtime = kernel();
  runtime.start(NOW);

  const prepared =
    runtime.prepareCurrentStep(
      0,
      usage(),
      NOW + 1,
    );

  const forged =
    successReceipt(
      prepared,
      1,
      {
        leaseId:
          'goal_lease_9999999999999999',
      },
    );

  const rejected =
    runtime.settleCurrentStep(
      forged,
      usage(),
      NOW + 4,
    );

  assert.equal(rejected.accepted, false);
  assert.equal(
    rejected.reason,
    'receipt_mismatch',
  );
  assert.equal(
    runtime.hasActivePreparation(),
    true,
  );

  const accepted =
    runtime.settleCurrentStep(
      successReceipt(prepared, 1),
      usage(),
      NOW + 4,
    );

  assert.equal(accepted.accepted, true);
  assert.equal(
    runtime.hasActivePreparation(),
    false,
  );
});

test('irreversible side effect is denied by default', () => {
  const runtime =
    kernel({
      rollbackRef: null,
    });

  runtime.start(NOW);

  const result =
    runtime.prepareCurrentStep(
      0,
      usage(),
      NOW + 1,
    );

  assert.equal(result.accepted, false);
  assert.equal(
    result.reason,
    'irreversible_side_effect_denied',
  );
});

test('budget is reserved before an external step can run', () => {
  const runtime = kernel();
  runtime.start(NOW);

  const result =
    runtime.prepareCurrentStep(
      0,
      usage({
        providerCostMicros: 100_001,
      }),
      NOW + 1,
    );

  assert.equal(result.accepted, false);
  assert.match(
    result.reason,
    /^budget_denied:/,
  );
  assert.equal(
    runtime.hasActivePreparation(),
    false,
  );
});

test('cancellation turns armed side effects into rollback obligations', () => {
  const runtime = kernel();
  runtime.start(NOW);

  const prepared =
    runtime.prepareCurrentStep(
      0,
      usage(),
      NOW + 1,
    );

  assert.equal(prepared.accepted, true);

  const cancelled =
    runtime.cancel(NOW + 2);

  assert.equal(cancelled.accepted, true);
  assert.equal(
    cancelled.state.phase,
    'cancelled',
  );
  assert.equal(
    runtime.getRollbackStates()[0]?.status,
    'required',
  );
});
