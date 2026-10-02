import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  dispatchReadyGoalWork,
} = loadTypeScriptModule(
  'src/core/agent/goalDispatchCoordinator.ts',
);

const {
  GoalWorkQueue,
} = loadTypeScriptModule(
  'src/core/agent/goalWorkQueue.ts',
);

const NOW = 4_800_000_000;
const GOAL = 'goal_1111111111111111';
const PLAN = 'goal_plan_1111111111111111';
const REQUEST = 'brain_request_1111111111111111';

const S1 = 'goal_step_1111111111111111';
const S2 = 'goal_step_2222222222222222';
const S3 = 'goal_step_3333333333333333';
const S4 = 'goal_step_4444444444444444';

const queuePolicy = {
  maxQueueItems: 100,
  minimumLeaseMs: 1_000,
  maximumLeaseMs: 60_000,
  retryBaseDelayMs: 1_000,
  retryMaxDelayMs: 8_000,
};

const schedulerPolicy = {
  maxParallelSteps: 3,
  serializeSideEffects: true,
  exclusiveFinalize: true,
  preferVerification: true,
};

function goal(overrides = {}) {
  return {
    protocolVersion: '1.0',
    goalId: GOAL,
    sourceRequestId: REQUEST,
    workspaceId: 'workspace_1111111111111111',
    intent: 'research',
    risk: 'medium',
    verification: 'none',
    sideEffectPolicy: 'read-only',
    maxSteps: 8,
    maxRepairCycles: 2,
    maxToolAttempts: 8,
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

function plan(overrides = {}) {
  return {
    protocolVersion: '1.0',
    planId: PLAN,
    goalId: GOAL,
    sourceRequestId: REQUEST,
    generatedAtMs: NOW + 10,
    steps: [
      step(S1, 1, 'retrieve'),
      step(S2, 2, 'reason'),
      step(S3, 3, 'reason', [S1, S2]),
      step(S4, 4, 'finalize', [S3]),
    ],
    providerIndependent: true,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
    ...overrides,
  };
}

test('dispatcher materializes independent graph roots into durable work exactly once', () => {
  const queue =
    new GoalWorkQueue(queuePolicy);

  const first =
    dispatchReadyGoalWork(
      queue,
      goal(),
      plan(),
      schedulerPolicy,
      NOW + 20,
    );

  assert.equal(first.accepted, true);
  assert.equal(first.reason, 'dispatched');
  assert.deepEqual(
    first.workItems.map(
      (item) => item.stepId,
    ),
    [S1, S2],
  );
  assert.equal(
    queue.snapshot(NOW + 20).length,
    2,
  );

  const second =
    dispatchReadyGoalWork(
      queue,
      goal(),
      plan(),
      schedulerPolicy,
      NOW + 21,
    );

  assert.equal(second.accepted, true);
  assert.equal(
    second.reason,
    'no_dispatch',
  );
  assert.equal(
    queue.snapshot(NOW + 21).length,
    2,
  );
});

test('completed roots unlock join step and finalization in dependency order', () => {
  const queue =
    new GoalWorkQueue(queuePolicy);

  dispatchReadyGoalWork(
    queue,
    goal(),
    plan(),
    schedulerPolicy,
    NOW + 20,
  );

  const worker =
    'worker_ref_1111111111111111';

  const first =
    queue.claimNext(
      worker,
      NOW + 30,
      10_000,
    );
  assert.equal(
    first.state?.item.stepId,
    S1,
  );
  queue.complete(
    first.state.item.workId,
    worker,
    'evidence_ref_first_111111111111111',
    NOW + 40,
  );

  const second =
    queue.claimNext(
      worker,
      NOW + 50,
      10_000,
    );
  assert.equal(
    second.state?.item.stepId,
    S2,
  );
  queue.complete(
    second.state.item.workId,
    worker,
    'evidence_ref_second_22222222222222',
    NOW + 60,
  );

  const join =
    dispatchReadyGoalWork(
      queue,
      goal(),
      plan(),
      schedulerPolicy,
      NOW + 70,
    );

  assert.deepEqual(
    join.workItems.map(
      (item) => item.stepId,
    ),
    [S3],
  );

  const third =
    queue.claimNext(
      worker,
      NOW + 80,
      10_000,
    );
  queue.complete(
    third.state.item.workId,
    worker,
    'evidence_ref_third_333333333333333',
    NOW + 90,
  );

  const final =
    dispatchReadyGoalWork(
      queue,
      goal(),
      plan(),
      schedulerPolicy,
      NOW + 100,
    );

  assert.deepEqual(
    final.workItems.map(
      (item) => item.stepId,
    ),
    [S4],
  );
});

test('unresolved side-effect lease loss blocks dependent dispatch until reconciliation', () => {
  const queue =
    new GoalWorkQueue(queuePolicy);

  const sideGoal =
    goal({
      intent: 'operate',
      risk: 'high',
      sideEffectPolicy:
        'approval-required',
    });

  const sidePlan =
    plan({
      steps: [
        step(S1, 1, 'reason'),
        step(
          S2,
          2,
          'tool',
          [],
          {
            requiredCapabilities: [
              'filesystem.write',
            ],
            sideEffect: true,
            requiresApproval: true,
            rollbackRef:
              'rollback_ref_2222222222222222',
          },
        ),
        step(S3, 3, 'reason', [S1, S2]),
        step(S4, 4, 'finalize', [S3]),
      ],
    });

  const first =
    dispatchReadyGoalWork(
      queue,
      sideGoal,
      sidePlan,
      schedulerPolicy,
      NOW + 20,
    );

  assert.deepEqual(
    first.workItems.map(
      (item) => item.stepId,
    ),
    [S1],
  );

  const worker =
    'worker_ref_1111111111111111';
  const safe =
    queue.claimNext(
      worker,
      NOW + 30,
      1_000,
    );
  queue.complete(
    safe.state.item.workId,
    worker,
    'evidence_ref_safe_1111111111111111',
    NOW + 40,
  );

  const sideDispatch =
    dispatchReadyGoalWork(
      queue,
      sideGoal,
      sidePlan,
      schedulerPolicy,
      NOW + 50,
    );

  assert.deepEqual(
    sideDispatch.workItems.map(
      (item) => item.stepId,
    ),
    [S2],
  );

  const sideLease =
    queue.claimNext(
      worker,
      NOW + 60,
      1_000,
    );
  assert.equal(
    sideLease.state?.item.sideEffect,
    true,
  );

  queue.getState(
    sideLease.state.item.workId,
    NOW + 1_060,
  );

  const blocked =
    dispatchReadyGoalWork(
      queue,
      sideGoal,
      sidePlan,
      schedulerPolicy,
      NOW + 1_070,
    );

  assert.equal(blocked.accepted, true);
  assert.equal(
    blocked.reason,
    'no_dispatch',
  );
  assert.deepEqual(blocked.workItems, []);
});

test('duplicate queue state for one graph step fails closed', () => {
  const queue =
    new GoalWorkQueue(queuePolicy);

  dispatchReadyGoalWork(
    queue,
    goal(),
    plan(),
    schedulerPolicy,
    NOW + 20,
  );

  const duplicateState = {
    protocolVersion: '1.0',
    workId:
      'goal_work_9999999999999999',
    goalId: GOAL,
    planId: PLAN,
    stepId: S1,
    operationRef:
      'operation_ref_duplicate_11111111',
    priority: 100,
    sideEffect: false,
    idempotencyKey:
      'idempotency_duplicate_11111111',
    notBeforeMs: NOW + 20,
    deadlineAtMs: NOW + 120_000,
    maxAttempts: 2,
    createdAtMs: NOW + 20,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  };

  assert.equal(
    queue.enqueue(
      duplicateState,
      NOW + 20,
    ).accepted,
    true,
  );

  const result =
    dispatchReadyGoalWork(
      queue,
      goal(),
      plan(),
      schedulerPolicy,
      NOW + 30,
    );

  assert.equal(result.accepted, false);
  assert.equal(
    result.reason,
    'queue_conflict',
  );
});

test('dispatcher refuses to create new work after goal deadline', () => {
  const queue =
    new GoalWorkQueue(queuePolicy);

  const result =
    dispatchReadyGoalWork(
      queue,
      goal(),
      plan(),
      schedulerPolicy,
      NOW + 120_000,
    );

  assert.equal(result.accepted, false);
  assert.equal(
    result.reason,
    'invalid_input',
  );
});
