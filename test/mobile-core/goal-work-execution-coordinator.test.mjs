import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  GoalWorkExecutionCoordinator,
  parseGoalWorkRunnerOutput,
} = loadTypeScriptModule(
  'src/core/agent/goalWorkExecutionCoordinator.ts',
);

const {
  GoalWorkQueue,
} = loadTypeScriptModule(
  'src/core/agent/goalWorkQueue.ts',
);

const NOW = 5_200_000_000;
const GOAL = 'goal_1111111111111111';
const PLAN = 'goal_plan_1111111111111111';
const REQUEST = 'brain_request_1111111111111111';
const STEP = 'goal_step_1111111111111111';
const VERIFY = 'goal_step_2222222222222222';
const FINAL = 'goal_step_3333333333333333';
const WORKER = 'worker_ref_1111111111111111';

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
    maxSteps: 4,
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
  stepId,
  ordinal,
  kind,
  dependsOn = [],
  overrides = {},
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
    ...overrides,
  };
}

function plan(
  firstOverrides = {},
) {
  return {
    protocolVersion: '1.0',
    planId: PLAN,
    goalId: GOAL,
    sourceRequestId: REQUEST,
    generatedAtMs: NOW + 1,
    steps: [
      step(
        STEP,
        1,
        'reason',
        [],
        firstOverrides,
      ),
      step(
        VERIFY,
        2,
        'verify',
        [STEP],
      ),
      step(
        FINAL,
        3,
        'finalize',
        [VERIFY],
      ),
    ],
    providerIndependent: true,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  };
}

function workItem(overrides = {}) {
  return {
    protocolVersion: '1.0',
    workId: 'goal_work_1111111111111111',
    goalId: GOAL,
    planId: PLAN,
    stepId: STEP,
    operationRef:
      'operation_ref_1111111111111111',
    priority: 500,
    sideEffect: false,
    idempotencyKey:
      'idempotency_ref_1111111111111111',
    notBeforeMs: NOW,
    deadlineAtMs: NOW + 120_000,
    maxAttempts: 3,
    createdAtMs: NOW,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
    ...overrides,
  };
}

function success(overrides = {}) {
  return {
    protocolVersion: '1.0',
    status: 'succeeded',
    resultRef:
      'result_ref_1111111111111111',
    evidenceRef:
      'execution_evidence_11111111111111',
    failureReason: null,
    retryable: false,
    commitState: 'not_committed',
    completedAtMs: NOW + 30,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
    ...overrides,
  };
}

function failure(overrides = {}) {
  return {
    protocolVersion: '1.0',
    status: 'failed',
    resultRef: null,
    evidenceRef:
      'execution_evidence_11111111111111',
    failureReason: 'provider_timeout',
    retryable: true,
    commitState: 'not_committed',
    completedAtMs: NOW + 30,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
    ...overrides,
  };
}

function evidence(
  resultRef =
    'result_ref_1111111111111111',
  overrides = {},
) {
  return {
    protocolVersion: '1.0',
    evidenceId:
      'verification_evidence_1111111111111111',
    goalId: GOAL,
    planId: PLAN,
    stepId: STEP,
    resultRef,
    kind: 'external_truth',
    sourceRef:
      'source_ref_1111111111111111',
    independentGroupRef:
      'independent_group_1111111111111111',
    verdict: 'pass',
    confidenceScore: 950,
    observedAtMs: NOW + 35,
    expiresAtMs: NOW + 60_000,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
    ...overrides,
  };
}

function clockSequence(values) {
  let index = 0;
  return () => {
    const value =
      values[
        Math.min(
          index,
          values.length - 1,
        )
      ];
    index += 1;
    return value;
  };
}

function runtime({
  queue,
  runner,
  collector,
  clock = clockSequence([
    NOW + 20,
    NOW + 40,
    NOW + 50,
  ]),
  workerLeaseMs = 10_000,
}) {
  return new GoalWorkExecutionCoordinator(
    queue,
    {
      resolve() {
        return runner;
      },
    },
    collector,
    {
      workerLeaseMs,
      resultVerification:
        verificationPolicy,
    },
    clock,
  );
}

function queueWithWork(
  overrides = {},
) {
  const queue =
    new GoalWorkQueue(queuePolicy);

  assert.equal(
    queue.enqueue(
      workItem(overrides),
      NOW,
    ).accepted,
    true,
  );

  return queue;
}

test('verified successful work is the only path to completed queue state', async () => {
  const queue = queueWithWork();
  const coordinator =
    runtime({
      queue,
      runner: {
        async run(invocation) {
          assert.equal(
            invocation.idempotencyKey,
            workItem().idempotencyKey,
          );
          return success();
        },
      },
      collector: {
        async collect(input) {
          assert.equal(
            input.resultRef,
            success().resultRef,
          );
          return [evidence()];
        },
      },
    });

  const result =
    await coordinator.runNext(
      goal(),
      plan(),
      WORKER,
    );

  assert.equal(result.status, 'completed');
  assert.equal(
    result.reason,
    'verified_completion',
  );
  assert.equal(
    result.verification?.accepted,
    true,
  );
  assert.equal(
    queue.getState(
      workItem().workId,
      NOW + 60,
    )?.status,
    'completed',
  );
});

test('retryable read-only execution failure schedules bounded retry', async () => {
  const queue = queueWithWork();
  const coordinator =
    runtime({
      queue,
      runner: {
        async run() {
          return failure();
        },
      },
      collector: {
        async collect() {
          throw new Error(
            'should_not_collect',
          );
        },
      },
    });

  const result =
    await coordinator.runNext(
      goal(),
      plan(),
      WORKER,
    );

  assert.equal(
    result.status,
    'retry_scheduled',
  );
  assert.equal(
    queue.getState(
      workItem().workId,
      NOW + 40,
    )?.status,
    'queued',
  );
});

test('side-effect runner exception becomes reconciliation instead of blind retry', async () => {
  const queue =
    queueWithWork({
      sideEffect: true,
    });
  const sideGoal =
    goal({
      intent: 'operate',
      risk: 'high',
      sideEffectPolicy:
        'approval-required',
    });
  const sidePlan =
    plan({
      requiredCapabilities: [
        'filesystem.write',
      ],
      sideEffect: true,
      requiresApproval: true,
      rollbackRef:
        'rollback_ref_1111111111111111',
    });

  const coordinator =
    runtime({
      queue,
      runner: {
        async run() {
          throw new Error(
            'transport_lost',
          );
        },
      },
      collector: {
        async collect() {
          return [];
        },
      },
    });

  const result =
    await coordinator.runNext(
      sideGoal,
      sidePlan,
      WORKER,
    );

  assert.equal(
    result.status,
    'reconciliation_required',
  );
  assert.equal(
    queue.getState(
      workItem().workId,
      NOW + 40,
    )?.status,
    'reconciliation_required',
  );
});

test('side-effect success with failed verification requires reconciliation', async () => {
  const queue =
    queueWithWork({
      sideEffect: true,
    });
  const sideGoal =
    goal({
      intent: 'operate',
      risk: 'high',
      sideEffectPolicy:
        'approval-required',
    });
  const sidePlan =
    plan({
      requiredCapabilities: [
        'filesystem.write',
      ],
      sideEffect: true,
      requiresApproval: true,
      rollbackRef:
        'rollback_ref_1111111111111111',
    });

  const coordinator =
    runtime({
      queue,
      runner: {
        async run() {
          return success({
            commitState: 'committed',
          });
        },
      },
      collector: {
        async collect() {
          return [
            evidence(
              success().resultRef,
              {
                verdict: 'fail',
                confidenceScore: 1000,
              },
            ),
          ];
        },
      },
    });

  const result =
    await coordinator.runNext(
      sideGoal,
      sidePlan,
      WORKER,
    );

  assert.equal(
    result.status,
    'reconciliation_required',
  );
  assert.equal(
    result.verification?.reason,
    'contradicted',
  );
});

test('low-risk no-verification work completes without external evidence', async () => {
  const queue = queueWithWork();

  const coordinator =
    runtime({
      queue,
      runner: {
        async run() {
          return success();
        },
      },
      collector: {
        async collect() {
          return [];
        },
      },
    });

  const result =
    await coordinator.runNext(
      goal({
        risk: 'low',
        verification: 'none',
      }),
      plan(),
      WORKER,
    );

  assert.equal(result.status, 'completed');
  assert.equal(
    result.verification?.reason,
    'verification_not_required',
  );
});

test('collector failure cannot turn unverified medium-risk output into success', async () => {
  const queue = queueWithWork();

  const coordinator =
    runtime({
      queue,
      runner: {
        async run() {
          return success();
        },
      },
      collector: {
        async collect() {
          throw new Error(
            'evidence_provider_down',
          );
        },
      },
    });

  const result =
    await coordinator.runNext(
      goal(),
      plan(),
      WORKER,
    );

  assert.equal(
    result.status,
    'retry_scheduled',
  );
  assert.equal(
    result.verification?.accepted,
    false,
  );
});

test('malformed runner success is rejected and cannot complete work', async () => {
  const queue = queueWithWork();

  assert.ok(
    parseGoalWorkRunnerOutput(
      success(),
    ),
  );

  const coordinator =
    runtime({
      queue,
      runner: {
        async run() {
          return {
            status: 'succeeded',
            resultRef:
              'result_ref_1111111111111111',
          };
        },
      },
      collector: {
        async collect() {
          return [evidence()];
        },
      },
    });

  const result =
    await coordinator.runNext(
      goal(),
      plan(),
      WORKER,
    );

  assert.equal(
    result.status,
    'retry_scheduled',
  );
  assert.notEqual(
    queue.getState(
      workItem().workId,
      NOW + 50,
    )?.status,
    'completed',
  );
});

test('slow verification that outlives renewed lease never completes stale work', async () => {
  const queue = queueWithWork();

  const coordinator =
    runtime({
      queue,
      runner: {
        async run() {
          return success();
        },
      },
      collector: {
        async collect() {
          return [evidence()];
        },
      },
      workerLeaseMs: 1_000,
      clock: clockSequence([
        NOW + 20,
        NOW + 40,
        NOW + 2_000,
      ]),
    });

  const result =
    await coordinator.runNext(
      goal(),
      plan(),
      WORKER,
    );

  assert.notEqual(
    result.status,
    'completed',
  );
  assert.equal(
    result.status,
    'retry_scheduled',
  );
});

test('work/plan binding mismatch is dead-lettered instead of executing wrong operation', async () => {
  const queue =
    queueWithWork({
      operationRef:
        'operation_ref_other_999999999999',
    });

  let called = false;
  const coordinator =
    runtime({
      queue,
      runner: {
        async run() {
          called = true;
          return success();
        },
      },
      collector: {
        async collect() {
          return [evidence()];
        },
      },
    });

  const result =
    await coordinator.runNext(
      goal(),
      plan(),
      WORKER,
    );

  assert.equal(result.status, 'dead_letter');
  assert.equal(called, false);
});
