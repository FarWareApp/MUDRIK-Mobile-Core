import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  evaluateGoalWatchdog,
  validateGoalWatchdogPolicy,
} = loadTypeScriptModule(
  'src/core/agent/goalWatchdog.ts',
);

const {
  GoalExecutionKernel,
} = loadTypeScriptModule(
  'src/core/agent/goalExecutionKernel.ts',
);

const NOW = 3_900_000_000;
const GOAL =
  'goal_1111111111111111';
const PLAN =
  'goal_plan_1111111111111111';

function goal(overrides = {}) {
  return {
    protocolVersion: '1.0',
    goalId: GOAL,
    sourceRequestId:
      'brain_request_1111111111111111',
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
    ...overrides,
  };
}

function state(overrides = {}) {
  return {
    phase: 'running',
    currentStepOrdinal: 1,
    completedStepIds: [],
    failedStepId: null,
    toolAttempts: 0,
    repairCycles: 0,
    verificationPasses: 0,
    verificationFailures: 0,
    lastFailureReason: null,
    finalResultRef: null,
    updatedAtMs: NOW + 10,
    ...overrides,
  };
}

const policy = {
  runningStallMs: 30_000,
  verificationStallMs: 45_000,
  repairStallMs: 60_000,
  readyStallMs: 15_000,
  checkpointIntervalMs: 60_000,
};

function observation(overrides = {}) {
  return {
    goalId: GOAL,
    planId: PLAN,
    state: state(),
    activePreparation: false,
    activeSideEffect: false,
    activeLeaseExpiresAtMs: null,
    openRollbackCount: 0,
    budgetHealthy: true,
    runtimeTrusted: true,
    lastCheckpointAtMs: NOW,
    observedAtMs: NOW + 20,
    ...overrides,
  };
}

test('healthy progressing goal stays untouched', () => {
  assert.equal(
    validateGoalWatchdogPolicy(policy),
    true,
  );

  assert.deepEqual(
    evaluateGoalWatchdog(
      goal(),
      observation(),
      policy,
    ),
    {
      action: 'none',
      reason: 'healthy',
      stalledForMs: 10,
    },
  );
});

test('stalled quiescent execution is replanned', () => {
  const decision =
    evaluateGoalWatchdog(
      goal(),
      observation({
        observedAtMs: NOW + 40_010,
      }),
      policy,
    );

  assert.equal(
    decision.action,
    'replan',
  );
  assert.equal(
    decision.reason,
    'execution_stalled',
  );
});

test('verification stall gathers evidence instead of guessing', () => {
  const decision =
    evaluateGoalWatchdog(
      goal(),
      observation({
        state: state({
          phase: 'verifying',
          updatedAtMs: NOW + 10,
        }),
        observedAtMs: NOW + 50_010,
      }),
      policy,
    );

  assert.equal(
    decision.action,
    'gather_evidence',
  );
  assert.equal(
    decision.reason,
    'verification_stalled',
  );
});

test('expired active side-effect lease requires reconciliation, not retry', () => {
  const decision =
    evaluateGoalWatchdog(
      goal({
        intent: 'operate',
        sideEffectPolicy:
          'approval-required',
      }),
      observation({
        activePreparation: true,
        activeSideEffect: true,
        activeLeaseExpiresAtMs:
          NOW + 30_000,
        observedAtMs: NOW + 30_000,
      }),
      policy,
    );

  assert.equal(
    decision.action,
    'reconcile',
  );
  assert.equal(
    decision.reason,
    'active_lease_expired',
  );
});

test('pending rollback outranks ordinary stall handling', () => {
  const decision =
    evaluateGoalWatchdog(
      goal(),
      observation({
        openRollbackCount: 1,
        observedAtMs: NOW + 100_000,
      }),
      policy,
    );

  assert.equal(
    decision.action,
    'rollback',
  );
  assert.equal(
    decision.reason,
    'rollback_pending',
  );
});

test('untrusted runtime and exhausted budget block normal progress', () => {
  assert.deepEqual(
    evaluateGoalWatchdog(
      goal(),
      observation({
        runtimeTrusted: false,
      }),
      policy,
    ),
    {
      action: 'recover_runtime',
      reason: 'runtime_untrusted',
      stalledForMs: 0,
    },
  );

  assert.equal(
    evaluateGoalWatchdog(
      goal(),
      observation({
        budgetHealthy: false,
      }),
      policy,
    ).reason,
    'budget_exhausted',
  );
});

test('quiescent progress receives periodic checkpoint recommendation', () => {
  const decision =
    evaluateGoalWatchdog(
      goal(),
      observation({
        lastCheckpointAtMs:
          NOW - 70_000,
        observedAtMs: NOW + 20,
      }),
      policy,
    );

  assert.equal(
    decision.action,
    'checkpoint',
  );
  assert.equal(
    decision.reason,
    'checkpoint_due',
  );
});

test('ready goal that never starts is surfaced', () => {
  const decision =
    evaluateGoalWatchdog(
      goal(),
      observation({
        state: state({
          phase: 'ready',
          currentStepOrdinal: null,
          updatedAtMs: NOW,
        }),
        observedAtMs: NOW + 20_000,
      }),
      policy,
    );

  assert.equal(
    decision.action,
    'start',
  );
  assert.equal(
    decision.reason,
    'ready_stalled',
  );
});

test('invalid time or active-preparation binding fails closed', () => {
  assert.equal(
    evaluateGoalWatchdog(
      goal(),
      observation({
        activePreparation: false,
        activeSideEffect: true,
      }),
      policy,
    ).reason,
    'invalid_observation',
  );

  assert.equal(
    validateGoalWatchdogPolicy({
      ...policy,
      runningStallMs: 10,
    }),
    false,
  );
});


function watchdogKernel() {
  const first =
    'goal_step_1111111111111111';
  const second =
    'goal_step_2222222222222222';

  let sequence = 0;
  const id = (prefix) => {
    sequence += 1;
    return prefix
      + String(sequence).repeat(16);
  };

  return new GoalExecutionKernel(
    goal({
      verification: 'none',
      risk: 'low',
      deadlineAtMs: NOW + 300_000,
    }),
    {
      protocolVersion: '1.0',
      planId: PLAN,
      goalId: GOAL,
      sourceRequestId:
        'brain_request_1111111111111111',
      generatedAtMs: NOW + 1,
      steps: [
        {
          stepId: first,
          ordinal: 1,
          kind: 'reason',
          operationRef:
            'operation_ref_1111111111111111',
          dependsOn: [],
          requiredCapabilities: [],
          sideEffect: false,
          requiresApproval: false,
          rollbackRef: null,
          verificationRef: null,
          grantsExecutionAuthority: false,
          grantsSensorAuthority: false,
          grantsApprovalAuthority: false,
          grantsCapabilityAuthority: false,
        },
        {
          stepId: second,
          ordinal: 2,
          kind: 'finalize',
          operationRef:
            'operation_ref_2222222222222222',
          dependsOn: [first],
          requiredCapabilities: [],
          sideEffect: false,
          requiresApproval: false,
          rollbackRef: null,
          verificationRef: null,
          grantsExecutionAuthority: false,
          grantsSensorAuthority: false,
          grantsApprovalAuthority: false,
          grantsCapabilityAuthority: false,
        },
      ],
      providerIndependent: true,
      grantsExecutionAuthority: false,
      grantsSensorAuthority: false,
      grantsApprovalAuthority: false,
      grantsCapabilityAuthority: false,
    },
    [],
    'subject_watchdog_kernel',
    {},
    null,
    {
      leaseTtlMs: 5_000,
      allowIrreversibleSideEffects: false,
      resourceBudget: {
        maxModelCalls: 2,
        maxProviderCostMicros: 10_000,
        maxNetworkRequests: 2,
        maxOutputBytes: 10_000,
        maxConcurrentOperations: 1,
        maxWallTimeMs: 300_000,
      },
    },
    {
      nextLeaseId() {
        return id('goal_lease_');
      },
      nextRollbackId() {
        return id('goal_rollback_');
      },
      nextReservationId() {
        return id(
          'goal_budget_reservation_',
        );
      },
    },
  );
}

test('kernel liveness assessment observes active lease without exposing internals', () => {
  const runtime = watchdogKernel();
  runtime.start(NOW + 10);

  const preparation =
    runtime.prepareCurrentStep(
      0,
      {
        modelCalls: 0,
        providerCostMicros: 0,
        networkRequests: 0,
        outputBytes: 1,
        concurrentOperations: 1,
      },
      NOW + 11,
    );

  assert.equal(preparation.accepted, true);
  assert.ok(preparation.lease);

  const beforeExpiry =
    runtime.assessLiveness(
      policy,
      true,
      NOW,
      preparation.lease.expiresAtMs - 1,
    );

  assert.equal(beforeExpiry.action, 'none');

  const expired =
    runtime.assessLiveness(
      policy,
      true,
      NOW,
      preparation.lease.expiresAtMs,
    );

  assert.equal(expired.action, 'replan');
  assert.equal(
    expired.reason,
    'active_lease_expired',
  );
});
