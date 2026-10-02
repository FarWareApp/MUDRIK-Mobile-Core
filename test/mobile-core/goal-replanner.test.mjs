import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  parseGoalPlanAmendment,
  validateGoalReplanTransition,
} = loadTypeScriptModule(
  'src/core/agent/goalReplanner.ts',
);

const NOW = 3_000_000_000;
const GOAL =
  'goal_1111111111111111';
const REQUEST =
  'brain_request_1111111111111111';
const PLAN_A =
  'goal_plan_1111111111111111';
const PLAN_B =
  'goal_plan_2222222222222222';

function goal(overrides = {}) {
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

function currentPlan(overrides = {}) {
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
    ...overrides,
  };
}

function nextPlan(overrides = {}) {
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
    ...overrides,
  };
}

function amendment(overrides = {}) {
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
    ...overrides,
  };
}

test('replanner preserves completed prefix and replaces only unfinished work', () => {
  assert.ok(
    parseGoalPlanAmendment(
      amendment(),
    ),
  );

  const decision =
    validateGoalReplanTransition(
      goal(),
      currentPlan(),
      nextPlan(),
      amendment(),
      [S1],
      0,
      NOW + 50,
    );

  assert.equal(decision.accepted, true);
  assert.deepEqual(
    decision.preservedStepIds,
    [S1],
  );
  assert.deepEqual(
    decision.replacedStepIds,
    [S2, S3, S4],
  );
  assert.deepEqual(
    decision.newStepIds,
    [N2, N3, N4],
  );
});

test('completed work is immutable across replans', () => {
  const mutated =
    nextPlan({
      steps: [
        step(
          S1,
          1,
          'reason',
          [],
          {
            operationRef:
              'operation_ref_mutated_11111111',
          },
        ),
        step(N2, 2, 'retrieve', [S1]),
        step(N3, 3, 'verify', [N2]),
        step(N4, 4, 'finalize', [N3]),
      ],
    });

  const decision =
    validateGoalReplanTransition(
      goal(),
      currentPlan(),
      mutated,
      amendment(),
      [S1],
      0,
      NOW + 50,
    );

  assert.equal(decision.accepted, false);
  assert.equal(
    decision.reason,
    'completed_step_mutated',
  );
});

test('unfinished step identities cannot be recycled into new plan', () => {
  const reused =
    nextPlan({
      steps: [
        step(S1, 1, 'reason'),
        step(S2, 2, 'retrieve', [S1]),
        step(N3, 3, 'verify', [S2]),
        step(N4, 4, 'finalize', [N3]),
      ],
    });

  const decision =
    validateGoalReplanTransition(
      goal(),
      currentPlan(),
      reused,
      amendment(),
      [S1],
      0,
      NOW + 50,
    );

  assert.equal(decision.accepted, false);
  assert.equal(
    decision.reason,
    'unfinished_step_reused',
  );
});

test('replan generation must advance exactly once', () => {
  const decision =
    validateGoalReplanTransition(
      goal(),
      currentPlan(),
      nextPlan(),
      amendment({ generation: 3 }),
      [S1],
      0,
      NOW + 50,
    );

  assert.equal(decision.accepted, false);
  assert.equal(
    decision.reason,
    'generation_mismatch',
  );
});

test('replan rejects non-prefix completion claims and future amendment time', () => {
  assert.equal(
    validateGoalReplanTransition(
      goal(),
      currentPlan(),
      nextPlan(),
      amendment(),
      [S2],
      0,
      NOW + 50,
    ).reason,
    'completed_prefix_mismatch',
  );

  assert.equal(
    validateGoalReplanTransition(
      goal(),
      currentPlan(),
      nextPlan(),
      amendment({
        requestedAtMs: NOW + 80,
      }),
      [S1],
      0,
      NOW + 50,
    ).reason,
    'time_invalid',
  );
});
