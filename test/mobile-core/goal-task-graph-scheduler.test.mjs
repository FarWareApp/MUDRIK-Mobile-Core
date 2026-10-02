import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  scheduleGoalTaskGraph,
  validateGoalTaskGraphPolicy,
} = loadTypeScriptModule(
  'src/core/agent/goalTaskGraphScheduler.ts',
);

const NOW = 4_200_000_000;
const GOAL = 'goal_1111111111111111';
const REQUEST = 'brain_request_1111111111111111';
const PLAN = 'goal_plan_1111111111111111';

const S1 = 'goal_step_1111111111111111';
const S2 = 'goal_step_2222222222222222';
const S3 = 'goal_step_3333333333333333';
const S4 = 'goal_step_4444444444444444';

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

const policy = {
  maxParallelSteps: 3,
  serializeSideEffects: true,
  exclusiveFinalize: true,
  preferVerification: true,
};

test('independent dependency roots are scheduled in parallel', () => {
  assert.equal(
    validateGoalTaskGraphPolicy(policy),
    true,
  );

  const result = scheduleGoalTaskGraph(
    goal(),
    plan(),
    {
      completedStepIds: [],
      runningStepIds: [],
      failedStepIds: [],
    },
    policy,
  );

  assert.equal(result.accepted, true);
  assert.equal(result.reason, 'scheduled');
  assert.deepEqual(
    result.readySteps.map((item) => item.stepId),
    [S1, S2],
  );
});

test('join step waits until every dependency is completed', () => {
  const partial = scheduleGoalTaskGraph(
    goal(),
    plan(),
    {
      completedStepIds: [S1],
      runningStepIds: [S2],
      failedStepIds: [],
    },
    policy,
  );

  assert.equal(partial.reason, 'wait_for_running');
  assert.deepEqual(partial.readySteps, []);

  const joined = scheduleGoalTaskGraph(
    goal(),
    plan(),
    {
      completedStepIds: [S1, S2],
      runningStepIds: [],
      failedStepIds: [],
    },
    policy,
  );

  assert.deepEqual(
    joined.readySteps.map((item) => item.stepId),
    [S3],
  );
});

test('finalization is exclusive and only runs after all other work', () => {
  const blockedFinalize =
    scheduleGoalTaskGraph(
      goal(),
      plan(),
      {
        completedStepIds: [S1, S2],
        runningStepIds: [S3],
        failedStepIds: [],
      },
      policy,
    );

  assert.equal(
    blockedFinalize.reason,
    'wait_for_running',
  );
  assert.deepEqual(
    blockedFinalize.readySteps,
    [],
  );

  const final = scheduleGoalTaskGraph(
    goal(),
    plan(),
    {
      completedStepIds: [S1, S2, S3],
      runningStepIds: [],
      failedStepIds: [],
    },
    policy,
  );

  assert.deepEqual(
    final.readySteps.map((item) => item.stepId),
    [S4],
  );
});

test('failed dependency blocks downstream execution', () => {
  const result = scheduleGoalTaskGraph(
    goal(),
    plan(),
    {
      completedStepIds: [S1],
      runningStepIds: [],
      failedStepIds: [S2],
    },
    policy,
  );

  assert.equal(result.accepted, false);
  assert.equal(result.reason, 'failed_dependency');
  assert.deepEqual(
    result.blockedStepIds,
    [S3],
  );
});

test('runtime step sets must be disjoint', () => {
  const result = scheduleGoalTaskGraph(
    goal(),
    plan(),
    {
      completedStepIds: [S1],
      runningStepIds: [S1],
      failedStepIds: [],
    },
    policy,
  );

  assert.equal(result.accepted, false);
  assert.equal(result.reason, 'invalid_input');
});

test('side effects are exclusive while safe ready work is drained first', () => {
  const sideGoal = goal({
    intent: 'operate',
    risk: 'high',
    sideEffectPolicy: 'approval-required',
  });

  const sidePlan = plan({
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

  const first = scheduleGoalTaskGraph(
    sideGoal,
    sidePlan,
    {
      completedStepIds: [],
      runningStepIds: [],
      failedStepIds: [],
    },
    policy,
  );

  assert.deepEqual(
    first.readySteps.map((item) => item.stepId),
    [S1],
  );

  const second = scheduleGoalTaskGraph(
    sideGoal,
    sidePlan,
    {
      completedStepIds: [S1],
      runningStepIds: [],
      failedStepIds: [],
    },
    policy,
  );

  assert.deepEqual(
    second.readySteps.map((item) => item.stepId),
    [S2],
  );

  const whileSideEffectRuns =
    scheduleGoalTaskGraph(
      sideGoal,
      sidePlan,
      {
        completedStepIds: [S1],
        runningStepIds: [S2],
        failedStepIds: [],
      },
      policy,
    );

  assert.equal(
    whileSideEffectRuns.reason,
    'wait_for_running',
  );
  assert.deepEqual(
    whileSideEffectRuns.readySteps,
    [],
  );
});

test('completed graph reports complete instead of rescheduling', () => {
  const result = scheduleGoalTaskGraph(
    goal(),
    plan(),
    {
      completedStepIds: [S1, S2, S3, S4],
      runningStepIds: [],
      failedStepIds: [],
    },
    policy,
  );

  assert.equal(result.accepted, true);
  assert.equal(result.reason, 'complete');
  assert.deepEqual(result.readySteps, []);
});
