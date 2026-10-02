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

const {
  parseGoalExecutionCheckpoint,
} = loadTypeScriptModule(
  'src/core/agent/goalCheckpoint.ts',
);

const NOW = 3_700_000_000;
const GOAL =
  'goal_1111111111111111';
const PLAN =
  'goal_plan_1111111111111111';
const REQUEST =
  'brain_request_1111111111111111';

const S1 =
  'goal_step_1111111111111111';
const S2 =
  'goal_step_2222222222222222';
const S3 =
  'goal_step_3333333333333333';
const S4 =
  'goal_step_4444444444444444';

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
    deadlineAtMs: NOW + 300_000,
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

function plan() {
  return {
    protocolVersion: '1.0',
    planId: PLAN,
    goalId: GOAL,
    sourceRequestId: REQUEST,
    generatedAtMs: NOW + 10,
    steps: [
      step(S1, 1, 'reason'),
      step(S2, 2, 'retrieve', [S1]),
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

function ids(start = 0) {
  let lease = start;
  let rollback = start;
  let reservation = start;

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

function usage(bytes = 10) {
  return {
    modelCalls: 0,
    providerCostMicros: 0,
    networkRequests: 0,
    outputBytes: bytes,
    concurrentOperations: 1,
  };
}

function kernel(start = 0) {
  return new GoalExecutionKernel(
    goal(),
    plan(),
    [],
    'subject_user_checkpoint',
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
        maxWallTimeMs: 300_000,
      },
    },
    ids(start),
  );
}

function successReceipt(
  preparation,
  attempt,
  completedAtMs,
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
    completedAtMs,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  };
}

function advanceOne(runtime) {
  runtime.start(NOW + 20);

  const preparation =
    runtime.prepareCurrentStep(
      0,
      usage(12),
      NOW + 21,
    );

  assert.equal(preparation.accepted, true);
  assert.ok(preparation.lease);

  const settled =
    runtime.settleCurrentStep(
      successReceipt(
        preparation,
        1,
        NOW + 25,
      ),
      usage(12),
      NOW + 25,
    );

  assert.equal(settled.accepted, true);
  assert.equal(
    runtime.getCurrentStep()?.stepId,
    S2,
  );
}

test('quiescent checkpoint restores exact progress and committed budget', () => {
  const original = kernel();
  advanceOne(original);

  const created =
    original.createCheckpoint(
      'goal_checkpoint_1111111111111111',
      NOW + 200_000,
      NOW + 30,
    );

  assert.equal(created.accepted, true);
  assert.ok(created.checkpoint);
  assert.ok(created.anchor);
  assert.equal(
    created.checkpoint.sequence,
    1,
  );
  assert.equal(
    created.checkpoint.previousCheckpointId,
    null,
  );

  const restored = kernel(1);
  const result =
    restored.restoreCheckpoint(
      created.checkpoint,
      created.anchor,
      NOW + 40,
    );

  assert.deepEqual(result, {
    accepted: true,
    reason: 'restored',
  });
  assert.equal(
    restored.getCurrentStep()?.stepId,
    S2,
  );
  assert.deepEqual(
    restored.getCommittedUsage(),
    original.getCommittedUsage(),
  );

  const next =
    restored.prepareCurrentStep(
      0,
      usage(5),
      NOW + 41,
    );

  assert.equal(next.accepted, true);
  assert.equal(
    next.lease?.stepId,
    S2,
  );
});

test('checkpoint chain advances monotonically after restore', () => {
  const original = kernel();
  advanceOne(original);

  const first =
    original.createCheckpoint(
      'goal_checkpoint_1111111111111111',
      NOW + 200_000,
      NOW + 30,
    );

  assert.ok(first.checkpoint);
  assert.ok(first.anchor);

  const restored = kernel(1);
  assert.equal(
    restored.restoreCheckpoint(
      first.checkpoint,
      first.anchor,
      NOW + 40,
    ).accepted,
    true,
  );

  const second =
    restored.createCheckpoint(
      'goal_checkpoint_2222222222222222',
      NOW + 210_000,
      NOW + 50,
    );

  assert.equal(second.accepted, true);
  assert.equal(
    second.checkpoint?.sequence,
    2,
  );
  assert.equal(
    second.checkpoint?.previousCheckpointId,
    first.checkpoint.checkpointId,
  );
});

test('trusted anchor rejects stale or substituted checkpoint', () => {
  const original = kernel();
  advanceOne(original);

  const created =
    original.createCheckpoint(
      'goal_checkpoint_1111111111111111',
      NOW + 200_000,
      NOW + 30,
    );

  assert.ok(created.checkpoint);
  assert.ok(created.anchor);

  const restored = kernel(1);

  assert.deepEqual(
    restored.restoreCheckpoint(
      created.checkpoint,
      {
        checkpointId:
          'goal_checkpoint_9999999999999999',
        sequence: 1,
      },
      NOW + 40,
    ),
    {
      accepted: false,
      reason: 'anchor_mismatch',
    },
  );
});

test('checkpoint is denied while a lease and reservation are active', () => {
  const runtime = kernel();
  runtime.start(NOW + 20);

  const preparation =
    runtime.prepareCurrentStep(
      0,
      usage(),
      NOW + 21,
    );

  assert.equal(preparation.accepted, true);

  const checkpoint =
    runtime.createCheckpoint(
      'goal_checkpoint_1111111111111111',
      NOW + 200_000,
      NOW + 22,
    );

  assert.equal(checkpoint.accepted, false);
  assert.equal(
    checkpoint.reason,
    'active_preparation',
  );
});

test('tampered committed budget or execution prefix invalidates checkpoint', () => {
  const original = kernel();
  advanceOne(original);

  const created =
    original.createCheckpoint(
      'goal_checkpoint_1111111111111111',
      NOW + 200_000,
      NOW + 30,
    );

  assert.ok(created.checkpoint);

  const tamperedBudget = {
    ...created.checkpoint,
    committedUsage: {
      ...created.checkpoint.committedUsage,
      outputBytes:
        created.checkpoint.committedUsage
          .outputBytes + 1,
    },
  };

  assert.equal(
    parseGoalExecutionCheckpoint(
      tamperedBudget,
      goal(),
      plan(),
      NOW + 40,
    ),
    null,
  );

  const tamperedPrefix = {
    ...created.checkpoint,
    executionState: {
      ...created.checkpoint.executionState,
      completedStepIds: [S2],
    },
  };

  assert.equal(
    parseGoalExecutionCheckpoint(
      tamperedPrefix,
      goal(),
      plan(),
      NOW + 40,
    ),
    null,
  );
});

test('restored replay guards reject recycled reservation ids', () => {
  const original = kernel();
  advanceOne(original);

  const created =
    original.createCheckpoint(
      'goal_checkpoint_1111111111111111',
      NOW + 200_000,
      NOW + 30,
    );

  assert.ok(created.checkpoint);
  assert.ok(created.anchor);

  const unsafeRestartIds = kernel(0);
  assert.equal(
    unsafeRestartIds.restoreCheckpoint(
      created.checkpoint,
      created.anchor,
      NOW + 40,
    ).accepted,
    true,
  );

  const replayed =
    unsafeRestartIds.prepareCurrentStep(
      0,
      usage(),
      NOW + 41,
    );

  assert.equal(replayed.accepted, false);
  assert.match(
    replayed.reason,
    /reservation_conflict/,
  );
});
