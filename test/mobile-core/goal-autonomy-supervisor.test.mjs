import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  GoalAutonomySupervisor,
} = loadTypeScriptModule(
  'src/core/agent/goalAutonomySupervisor.ts',
);

const {
  GoalReconciliationCoordinator,
} = loadTypeScriptModule(
  'src/core/agent/goalReconciliationCoordinator.ts',
);

const {
  GoalWorkExecutionCoordinator,
} = loadTypeScriptModule(
  'src/core/agent/goalWorkExecutionCoordinator.ts',
);

const {
  GoalWorkQueue,
} = loadTypeScriptModule(
  'src/core/agent/goalWorkQueue.ts',
);

const NOW = 5_300_000_000;
const GOAL = 'goal_1111111111111111';
const PLAN = 'goal_plan_1111111111111111';
const REQUEST = 'brain_request_1111111111111111';

const queuePolicy = {
  maxQueueItems: 100,
  minimumLeaseMs: 1_000,
  maximumLeaseMs: 60_000,
  retryBaseDelayMs: 1_000,
  retryMaxDelayMs: 8_000,
};

const verificationPolicy = {
  minIndependentPasses: 1,
  minAggregateConfidence: 700,
  maxEvidenceAgeMs: 60_000,
  failureVetoConfidence: 800,
  requireDeterministicForSideEffect: false,
  requireStateReadbackForSideEffect: false,
  allowModelOnly: true,
};

const supervisorPolicy = {
  maxRoundsPerTick: 12,
  maxExecutionsPerTick: 12,
  scheduler: {
    maxParallelSteps: 4,
    serializeSideEffects: true,
    exclusiveFinalize: true,
    preferVerification: true,
  },
};

function goal(overrides = {}) {
  return {
    protocolVersion: '1.0',
    goalId: GOAL,
    sourceRequestId: REQUEST,
    workspaceId: 'workspace_1111111111111111',
    intent: 'research',
    risk: 'medium',
    verification: 'standard',
    sideEffectPolicy: 'read-only',
    maxSteps: 8,
    maxRepairCycles: 2,
    maxToolAttempts: 3,
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
  suffix,
  ordinal,
  kind,
  dependsOn = [],
  overrides = {},
) {
  return {
    stepId: 'goal_step_' + suffix,
    ordinal,
    kind,
    operationRef: 'operation_ref_' + suffix,
    dependsOn,
    requiredCapabilities: [],
    sideEffect: false,
    requiresApproval: false,
    rollbackRef: null,
    verificationRef:
      kind === 'verify'
        ? 'verification_ref_' + suffix
        : null,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
    ...overrides,
  };
}

const S1 = '1111111111111111';
const S2 = '2222222222222222';
const S3 = '3333333333333333';

function plan(firstOverrides = {}) {
  return {
    protocolVersion: '1.0',
    planId: PLAN,
    goalId: GOAL,
    sourceRequestId: REQUEST,
    generatedAtMs: NOW + 1,
    steps: [
      step(S1, 1, 'reason', [], firstOverrides),
      step(
        S2,
        2,
        'verify',
        ['goal_step_' + S1],
      ),
      step(
        S3,
        3,
        'finalize',
        ['goal_step_' + S2],
      ),
    ],
    providerIndependent: true,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  };
}

function mutableClock() {
  let value = NOW + 10;
  return {
    now() {
      value += 10;
      return value;
    },
  };
}

function buildRuntime({
  runner,
  collector,
  executionBudget =
    supervisorPolicy.maxExecutionsPerTick,
  reconciliationResolver = null,
} = {}) {
  const queue = new GoalWorkQueue(queuePolicy);
  const clock = mutableClock();

  const execution =
    new GoalWorkExecutionCoordinator(
      queue,
      {
        resolve() {
          return runner ?? {
            async run(invocation) {
              return {
                protocolVersion: '1.0',
                status: 'succeeded',
                resultRef:
                  'result_ref_' + invocation.stepId.slice(-16),
                evidenceRef:
                  'execution_evidence_'
                  + invocation.stepId.slice(-16),
                failureReason: null,
                retryable: false,
                commitState:
                  invocation.sideEffect
                    ? 'committed'
                    : 'not_committed',
                completedAtMs: NOW + 1_000,
                grantsExecutionAuthority: false,
                grantsSensorAuthority: false,
                grantsApprovalAuthority: false,
                grantsCapabilityAuthority: false,
              };
            },
          };
        },
      },
      collector ?? {
        async collect(input) {
          return [
            {
              protocolVersion: '1.0',
              evidenceId:
                'verification_evidence_'
                + input.stepId.slice(-16),
              goalId: input.goalId,
              planId: input.planId,
              stepId: input.stepId,
              resultRef: input.resultRef,
              kind: 'external_truth',
              sourceRef:
                'source_ref_'
                + input.stepId.slice(-16),
              independentGroupRef:
                'independent_group_'
                + input.stepId.slice(-16),
              verdict: 'pass',
              confidenceScore: 950,
              observedAtMs: clock.now(),
              expiresAtMs: NOW + 100_000,
              grantsExecutionAuthority: false,
              grantsSensorAuthority: false,
              grantsApprovalAuthority: false,
              grantsCapabilityAuthority: false,
            },
          ];
        },
      },
      {
        authorize() {
          return {
            allowed: true,
            reason: 'allowed',
            runtimeReason: 'trusted_runtime',
            goalAdmissionReason: 'allowed',
            grantIds: [],
            approvalRef: null,
          };
        },
      },
      {
        workerLeaseMs: 10_000,
        resultVerification: verificationPolicy,
      },
      () => clock.now(),
    );

  const reconciliation =
    reconciliationResolver
      ? new GoalReconciliationCoordinator(
          queue,
          reconciliationResolver,
          {
            minimumConfidenceScore: 900,
            maximumEvidenceAgeMs: 30_000,
            allowManualConfirmation: false,
          },
          () => clock.now(),
        )
      : null;

  const supervisor =
    new GoalAutonomySupervisor(
      queue,
      execution,
      () => clock.now(),
      reconciliation,
    );

  return {
    queue,
    supervisor,
    policy: {
      ...supervisorPolicy,
      maxExecutionsPerTick: executionBudget,
    },
  };
}

test('supervisor advances dependency graph through verified completion', async () => {
  const { queue, supervisor, policy } =
    buildRuntime();

  const result =
    await supervisor.runTick(
      goal(),
      plan(),
      [
        'worker_ref_1111111111111111',
        'worker_ref_2222222222222222',
      ],
      policy,
    );

  assert.equal(result.status, 'complete');
  assert.equal(result.reason, 'goal_complete');
  assert.equal(result.executions, 3);
  assert.deepEqual(
    new Set(result.completedStepIds),
    new Set([
      'goal_step_' + S1,
      'goal_step_' + S2,
      'goal_step_' + S3,
    ]),
  );

  assert.equal(
    queue.snapshot(NOW + 100_000)
      .filter(
        (state) => state.status === 'completed',
      ).length,
    3,
  );
});

test('execution budget yields resumable progress rather than overrun', async () => {
  const { supervisor, policy } =
    buildRuntime({
      executionBudget: 1,
    });

  const result =
    await supervisor.runTick(
      goal(),
      plan(),
      ['worker_ref_1111111111111111'],
      policy,
    );

  assert.equal(result.status, 'progressed');
  assert.equal(
    result.reason,
    'execution_budget_reached',
  );
  assert.equal(result.executions, 1);
  assert.deepEqual(
    result.completedStepIds,
    ['goal_step_' + S1],
  );
});

test('ambiguous side effect stops autonomy for reconciliation', async () => {
  const { supervisor, policy } =
    buildRuntime({
      runner: {
        async run() {
          throw new Error('transport_lost');
        },
      },
    });

  const sideGoal =
    goal({
      intent: 'operate',
      risk: 'high',
      sideEffectPolicy: 'approval-required',
    });
  const sidePlan =
    plan({
      sideEffect: true,
      requiresApproval: true,
      rollbackRef:
        'rollback_ref_1111111111111111',
      requiredCapabilities: [
        'filesystem.write',
      ],
    });

  const result =
    await supervisor.runTick(
      sideGoal,
      sidePlan,
      ['worker_ref_1111111111111111'],
      policy,
    );

  assert.equal(
    result.status,
    'reconciliation_required',
  );
  assert.equal(
    result.reconciliationWorkIds.length,
    1,
  );
});

test('non-retryable failure surfaces dead letter and stops graph', async () => {
  const { supervisor, policy } =
    buildRuntime({
      runner: {
        async run() {
          return {
            protocolVersion: '1.0',
            status: 'failed',
            resultRef: null,
            evidenceRef:
              'execution_evidence_1111111111111111',
            failureReason: 'unsupported_input',
            retryable: false,
            commitState: 'not_committed',
            completedAtMs: NOW + 1_000,
            grantsExecutionAuthority: false,
            grantsSensorAuthority: false,
            grantsApprovalAuthority: false,
            grantsCapabilityAuthority: false,
          };
        },
      },
    });

  const result =
    await supervisor.runTick(
      goal(),
      plan(),
      ['worker_ref_1111111111111111'],
      policy,
    );

  assert.equal(result.status, 'dead_letter');
  assert.equal(
    result.deadLetterWorkIds.length,
    1,
  );
});

test('duplicate worker identity fails closed', async () => {
  const { supervisor, policy } =
    buildRuntime();

  const result =
    await supervisor.runTick(
      goal(),
      plan(),
      [
        'worker_ref_1111111111111111',
        'worker_ref_1111111111111111',
      ],
      policy,
    );

  assert.equal(result.status, 'invalid_input');
});


test('supervisor reconciles confirmed side effect and resumes graph', async () => {
  const { supervisor, policy } =
    buildRuntime({
      runner: {
        async run(invocation) {
          if (
            invocation.stepId
              === 'goal_step_' + S1
          ) {
            throw new Error(
              'transport_lost_after_commit',
            );
          }

          return {
            protocolVersion: '1.0',
            status: 'succeeded',
            resultRef:
              'result_ref_'
              + invocation.stepId.slice(-16),
            evidenceRef:
              'execution_evidence_'
              + invocation.stepId.slice(-16),
            failureReason: null,
            retryable: false,
            commitState: 'not_committed',
            completedAtMs: NOW + 1_000,
            grantsExecutionAuthority: false,
            grantsSensorAuthority: false,
            grantsApprovalAuthority: false,
            grantsCapabilityAuthority: false,
          };
        },
      },
      reconciliationResolver: {
        async reconcile(input) {
          return {
            protocolVersion: '1.0',
            workId: input.workId,
            goalId: input.goalId,
            planId: input.planId,
            stepId: input.stepId,
            operationRef: input.operationRef,
            resolution: 'completed',
            commitState: 'committed',
            method: 'state_readback',
            evidenceRef:
              'reconciliation_evidence_'
              + input.stepId.slice(-16),
            confidenceScore: 990,
            observedAtMs: NOW + 20,
            grantsExecutionAuthority: false,
            grantsSensorAuthority: false,
            grantsApprovalAuthority: false,
            grantsCapabilityAuthority: false,
          };
        },
      },
    });

  const sideGoal =
    goal({
      intent: 'operate',
      risk: 'high',
      sideEffectPolicy: 'approval-required',
    });
  const sidePlan =
    plan({
      sideEffect: true,
      requiresApproval: true,
      rollbackRef:
        'rollback_ref_1111111111111111',
      requiredCapabilities: [
        'filesystem.write',
      ],
    });

  const result =
    await supervisor.runTick(
      sideGoal,
      sidePlan,
      ['worker_ref_1111111111111111'],
      policy,
    );

  assert.equal(result.status, 'progressed');
  assert.ok(
    result.completedStepIds.includes(
      'goal_step_' + S1,
    ),
  );
  assert.equal(
    result.reconciliationWorkIds.length,
    0,
  );
});
