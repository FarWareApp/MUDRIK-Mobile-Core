import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  parseGoalExecutionSpec,
} = loadTypeScriptModule(
  'src/core/agent/goalContract.ts',
);

const {
  parseGoalExecutionPlan,
  validateGoalExecutionPlan,
} = loadTypeScriptModule(
  'src/core/agent/goalPlan.ts',
);

const {
  GoalExecutionTracker,
} = loadTypeScriptModule(
  'src/core/agent/goalLifecycle.ts',
);

const NOW = 2_200_000_000;
const REQUEST =
  'brain_request_1111111111111111';
const GOAL =
  'goal_1111111111111111';
const PLAN =
  'goal_plan_1111111111111111';

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
    maxRepairCycles: 1,
    maxToolAttempts: 2,
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
    String(ordinal).padStart(16, '0');

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
            + String(ordinal - 1)
              .padStart(16, '0'),
          ],
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

function plan(
  steps = [
    step(1, 'reason'),
    step(2, 'tool'),
    step(3, 'verify'),
    step(4, 'finalize'),
  ],
  overrides = {},
) {
  return {
    protocolVersion: '1.0',
    planId: PLAN,
    goalId: GOAL,
    sourceRequestId: REQUEST,
    generatedAtMs: NOW + 10,
    steps,
    providerIndependent: true,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
    ...overrides,
  };
}

test('goal contract rejects unsafe authority and weak critical verification', () => {
  assert.ok(parseGoalExecutionSpec(goal()));

  assert.equal(
    parseGoalExecutionSpec(
      goal({
        grantsExecutionAuthority: true,
      }),
    ),
    null,
  );

  assert.equal(
    parseGoalExecutionSpec(
      goal({
        risk: 'critical',
        verification: 'standard',
      }),
    ),
    null,
  );

  assert.equal(
    parseGoalExecutionSpec(
      goal({
        intent: 'operate',
        sideEffectPolicy: 'read-only',
      }),
    ),
    null,
  );
});

test('plan validates ordered dependencies and verification coverage', () => {
  assert.ok(parseGoalExecutionPlan(plan()));

  assert.equal(
    validateGoalExecutionPlan(
      goal(),
      plan(),
    ).accepted,
    true,
  );

  const badDependency =
    plan([
      step(1, 'reason', {
        dependsOn: [
          'goal_step_9999999999999999',
        ],
      }),
      step(2, 'verify'),
      step(3, 'finalize'),
    ]);

  assert.equal(
    validateGoalExecutionPlan(
      goal(),
      badDependency,
    ).reason,
    'dependency_invalid',
  );

  assert.equal(
    validateGoalExecutionPlan(
      goal({ verification: 'strict' }),
      plan(),
    ).reason,
    'verification_missing',
  );
});

test('read-only goals reject side effects and side effects require approval', () => {
  const sideEffect =
    step(2, 'tool', {
      sideEffect: true,
      requiresApproval: true,
      rollbackRef:
        'rollback_ref_1111111111111111',
    });

  assert.equal(
    validateGoalExecutionPlan(
      goal(),
      plan([
        step(1, 'reason'),
        sideEffect,
        step(3, 'verify'),
        step(4, 'finalize'),
      ]),
    ).reason,
    'side_effect_forbidden',
  );

  const mutableGoal = goal({
    intent: 'operate',
    sideEffectPolicy: 'approval-required',
  });

  assert.equal(
    validateGoalExecutionPlan(
      mutableGoal,
      plan([
        step(1, 'reason'),
        {
          ...sideEffect,
          requiresApproval: false,
        },
        step(3, 'verify'),
        step(4, 'finalize'),
      ]),
    ).reason,
    'approval_required',
  );
});

test('goal lifecycle follows execute verify finalize path', () => {
  const tracker =
    new GoalExecutionTracker(
      goal(),
      plan(),
    );

  assert.equal(
    tracker.start(NOW + 20).state.phase,
    'running',
  );

  assert.equal(
    tracker.succeedCurrentStep(
      'result_ref_reason_1111111111111',
      NOW + 30,
    ).state.currentStepOrdinal,
    2,
  );

  assert.equal(
    tracker.succeedCurrentStep(
      'result_ref_tool_11111111111111',
      NOW + 40,
    ).state.phase,
    'verifying',
  );

  const verified =
    tracker.succeedCurrentStep(
      'result_ref_verify_111111111111',
      NOW + 50,
    );

  assert.equal(
    verified.state.verificationPasses,
    1,
  );
  assert.equal(
    verified.state.currentStepOrdinal,
    4,
  );

  const completed =
    tracker.succeedCurrentStep(
      'result_ref_final_1111111111111',
      NOW + 60,
    );

  assert.equal(
    completed.state.phase,
    'completed',
  );
  assert.equal(
    completed.state.finalResultRef,
    'result_ref_final_1111111111111',
  );
  assert.equal(
    completed.state.completedStepIds.length,
    4,
  );
});

test('verification failure enters bounded repair and retries same step', () => {
  const tracker =
    new GoalExecutionTracker(
      goal(),
      plan(),
    );

  tracker.start(NOW + 20);
  tracker.succeedCurrentStep(
    'result_ref_reason_1111111111111',
    NOW + 30,
  );
  tracker.succeedCurrentStep(
    'result_ref_tool_11111111111111',
    NOW + 40,
  );

  const failed =
    tracker.failCurrentStep(
      'verification_failed',
      NOW + 50,
    );

  assert.equal(failed.accepted, true);
  assert.equal(
    failed.state.phase,
    'repairing',
  );
  assert.equal(
    failed.state.repairCycles,
    1,
  );
  assert.equal(
    failed.state.verificationFailures,
    1,
  );

  const repaired =
    tracker.completeRepair(
      'repair_evidence_11111111111111',
      NOW + 60,
    );

  assert.equal(
    repaired.state.phase,
    'verifying',
  );
  assert.equal(
    repaired.state.currentStepOrdinal,
    3,
  );

  const verified =
    tracker.succeedCurrentStep(
      'result_ref_verify_222222222222',
      NOW + 70,
    );

  assert.equal(
    verified.state.currentStepOrdinal,
    4,
  );
});

test('repair budget exhaustion blocks repeated failure', () => {
  const tracker =
    new GoalExecutionTracker(
      goal(),
      plan(),
    );

  tracker.start(NOW + 20);
  tracker.succeedCurrentStep(
    'result_ref_reason_1111111111111',
    NOW + 30,
  );
  tracker.succeedCurrentStep(
    'result_ref_tool_11111111111111',
    NOW + 40,
  );
  tracker.failCurrentStep(
    'verification_failed',
    NOW + 50,
  );
  tracker.completeRepair(
    'repair_evidence_11111111111111',
    NOW + 60,
  );

  const blocked =
    tracker.failCurrentStep(
      'verification_failed_again',
      NOW + 70,
    );

  assert.equal(blocked.accepted, false);
  assert.equal(
    blocked.reason,
    'repair_budget_exhausted',
  );
  assert.equal(
    blocked.state.phase,
    'blocked',
  );
});

test('tool budget cannot be bypassed through repair retries', () => {
  const tracker =
    new GoalExecutionTracker(
      goal({
        maxToolAttempts: 1,
        maxRepairCycles: 1,
      }),
      plan(),
    );

  tracker.start(NOW + 20);
  tracker.succeedCurrentStep(
    'result_ref_reason_1111111111111',
    NOW + 30,
  );

  assert.equal(
    tracker.failCurrentStep(
      'tool_failed',
      NOW + 40,
    ).state.phase,
    'repairing',
  );

  tracker.completeRepair(
    'repair_evidence_11111111111111',
    NOW + 50,
  );

  const blocked =
    tracker.succeedCurrentStep(
      'result_ref_tool_retry_1111111111',
      NOW + 60,
    );

  assert.equal(
    blocked.reason,
    'tool_budget_exhausted',
  );
  assert.equal(
    blocked.state.phase,
    'blocked',
  );
});

test('deadline and cancellation close execution safely', () => {
  const deadlineTracker =
    new GoalExecutionTracker(
      goal({
        deadlineAtMs: NOW + 25,
      }),
      plan(),
    );

  const deadline =
    deadlineTracker.start(NOW + 26);

  assert.equal(
    deadline.reason,
    'deadline_exceeded',
  );
  assert.equal(
    deadline.state.phase,
    'blocked',
  );

  const cancelTracker =
    new GoalExecutionTracker(
      goal(),
      plan(),
    );

  cancelTracker.start(NOW + 20);

  assert.equal(
    cancelTracker.cancel(
      NOW + 21,
    ).state.phase,
    'cancelled',
  );

  assert.equal(
    cancelTracker.cancel(
      NOW + 22,
    ).idempotent,
    true,
  );
});

test('plan risk cannot understate required capability risk', () => {
  const highRiskStep =
    step(2, 'tool', {
      requiredCapabilities: [
        'filesystem.write',
      ],
    });

  assert.equal(
    validateGoalExecutionPlan(
      goal({
        risk: 'medium',
      }),
      plan([
        step(1, 'reason'),
        highRiskStep,
        step(3, 'verify'),
        step(4, 'finalize'),
      ]),
    ).reason,
    'risk_underdeclared',
  );

  assert.equal(
    validateGoalExecutionPlan(
      goal({
        risk: 'high',
      }),
      plan([
        step(1, 'reason'),
        highRiskStep,
        step(3, 'verify'),
        step(4, 'finalize'),
      ]),
    ).accepted,
    true,
  );
});

test('side effects must declare at least one concrete capability', () => {
  const mutableGoal =
    goal({
      intent: 'operate',
      risk: 'high',
      sideEffectPolicy: 'approval-required',
    });

  const sideEffectWithoutCapability =
    step(2, 'tool', {
      sideEffect: true,
      requiresApproval: true,
      requiredCapabilities: [],
      rollbackRef:
        'rollback_ref_1111111111111111',
    });

  assert.equal(
    validateGoalExecutionPlan(
      mutableGoal,
      plan([
        step(1, 'reason'),
        sideEffectWithoutCapability,
        step(3, 'verify'),
        step(4, 'finalize'),
      ]),
    ).reason,
    'capability_missing',
  );
});
