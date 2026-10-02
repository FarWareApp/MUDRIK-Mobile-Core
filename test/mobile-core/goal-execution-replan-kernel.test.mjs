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

const NOW = 3_200_000_000;
const GOAL = 'goal_1111111111111111';
const REQUEST =
  'brain_request_1111111111111111';
const PLAN_A =
  'goal_plan_1111111111111111';
const PLAN_B =
  'goal_plan_2222222222222222';

const S1 =
  'goal_step_1111111111111111';
const S2 =
  'goal_step_2222222222222222';
const S3 =
  'goal_step_3333333333333333';
const S4 =
  'goal_step_4444444444444444';

const N2 =
  'goal_step_5555555555555555';
const N3 =
  'goal_step_6666666666666666';
const N4 =
  'goal_step_7777777777777777';

function goal() {
  return {
    protocolVersion: '1.0',
    goalId: GOAL,
    sourceRequestId: REQUEST,
    workspaceId:
      'workspace_1111111111111111',
    intent: 'diagnose',
    risk: 'medium',
    verification: 'standard',
    sideEffectPolicy: 'read-only',
    maxSteps: 8,
    maxRepairCycles: 2,
    maxToolAttempts: 4,
    createdAtMs: NOW,
    deadlineAtMs: NOW + 120_000,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  };
}

function step(
  stepId,
  ordinal,
  kind,
  dependsOn = [],
) {
  return {
    stepId,
    ordinal,
    kind,
    operationRef:
      'operation_ref_' + stepId.slice(-16),
    dependsOn,
    requiredCapabilities: [],
    sideEffect: false,
    requiresApproval: false,
    rollbackRef: null,
    verificationRef:
      kind === 'verify'
        ? 'verification_ref_' + stepId.slice(-16)
        : null,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  };
}

function planA() {
  return {
    protocolVersion: '1.0',
    planId: PLAN_A,
    goalId: GOAL,
    sourceRequestId: REQUEST,
    generatedAtMs: NOW + 10,
    steps: [
      step(S1, 1, 'reason'),
      step(S2, 2, 'tool', [S1]),
      step(S3, 3, 'verify', [S2]),
      step(S4, 4, 'finalize', [S3]),
    ],
    providerIndependent: true,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  };
}

function planB() {
  return {
    protocolVersion: '1.0',
    planId: PLAN_B,
    goalId: GOAL,
    sourceRequestId: REQUEST,
    generatedAtMs: NOW + 40,
    steps: [
      step(S1, 1, 'reason'),
      step(N2, 2, 'retrieve', [S1]),
      step(N3, 3, 'verify', [N2]),
      step(N4, 4, 'finalize', [N3]),
    ],
    providerIndependent: true,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  };
}

function amendment() {
  return {
    protocolVersion: '1.0',
    amendmentId:
      'goal_amendment_1111111111111111',
    goalId: GOAL,
    fromPlanId: PLAN_A,
    toPlanId: PLAN_B,
    generation: 1,
    trigger: 'tool_unavailable',
    reasonCode: 'preferred_tool_unavailable',
    requestedAtMs: NOW + 30,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
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

function usage() {
  return {
    modelCalls: 0,
    providerCostMicros: 0,
    networkRequests: 0,
    outputBytes: 10,
    concurrentOperations: 1,
  };
}

function kernel() {
  return new GoalExecutionKernel(
    goal(),
    planA(),
    [],
    'subject_user_1111',
    {},
    null,
    {
      leaseTtlMs: 30_000,
      allowIrreversibleSideEffects: false,
      resourceBudget: {
        maxModelCalls: 8,
        maxProviderCostMicros: 100_000,
        maxNetworkRequests: 16,
        maxOutputBytes: 100_000,
        maxConcurrentOperations: 2,
        maxWallTimeMs: 120_000,
      },
    },
    ids(),
  );
}

function successReceipt(
  preparation,
  attempt,
) {
  return {
    protocolVersion: '1.0',
    receiptId:
      'goal_receipt_'
      + String(attempt).repeat(16),
    leaseId: preparation.lease.leaseId,
    goalId: preparation.lease.goalId,
    planId: preparation.lease.planId,
    stepId: preparation.lease.stepId,
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
  };
}

test('kernel replans unfinished work while retaining committed budget and completed prefix', () => {
  const runtime = kernel();
  runtime.start(NOW + 10);

  const first =
    runtime.prepareCurrentStep(
      0,
      usage(),
      NOW + 11,
    );

  assert.equal(first.accepted, true);
  assert.ok(first.lease);

  const settled =
    runtime.settleCurrentStep(
      successReceipt(first, 1),
      usage(),
      NOW + 14,
    );

  assert.equal(settled.accepted, true);
  assert.equal(
    runtime.getState().completedStepIds[0],
    S1,
  );

  const committedBefore =
    runtime.getCommittedUsage();

  const replanned =
    runtime.replan(
      planB(),
      amendment(),
      NOW + 45,
    );

  assert.equal(replanned.accepted, true);
  assert.equal(
    replanned.transition?.reason,
    'replanned',
  );
  assert.equal(
    runtime.getCurrentStep()?.stepId,
    N2,
  );
  assert.deepEqual(
    runtime.getCommittedUsage(),
    committedBefore,
  );

  const next =
    runtime.prepareCurrentStep(
      0,
      usage(),
      NOW + 46,
    );

  assert.equal(next.accepted, true);
  assert.equal(
    next.lease?.planId,
    PLAN_B,
  );
  assert.equal(
    next.lease?.stepId,
    N2,
  );
});

test('kernel blocks replan while an execution lease is active', () => {
  const runtime = kernel();
  runtime.start(NOW + 10);

  const active =
    runtime.prepareCurrentStep(
      0,
      usage(),
      NOW + 11,
    );

  assert.equal(active.accepted, true);

  const decision =
    runtime.replan(
      planB(),
      amendment(),
      NOW + 45,
    );

  assert.equal(decision.accepted, false);
  assert.equal(
    decision.reason,
    'active_preparation',
  );
});
