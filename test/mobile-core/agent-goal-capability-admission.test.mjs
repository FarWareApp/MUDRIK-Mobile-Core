import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  authorizeGoalStepExecution,
} = loadTypeScriptModule(
  'src/core/agent/goalCapabilityAdmission.ts',
);

const NOW = 2_500_000_000;

function goal(overrides = {}) {
  return {
    protocolVersion: '1.0',
    goalId: 'goal_1111111111111111',
    sourceRequestId:
      'brain_request_1111111111111111',
    workspaceId:
      'workspace_1111111111111111',
    intent: 'diagnose',
    risk: 'medium',
    verification: 'standard',
    sideEffectPolicy: 'read-only',
    maxSteps: 8,
    maxRepairCycles: 1,
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

function step(overrides = {}) {
  return {
    stepId:
      'goal_step_1111111111111111',
    ordinal: 1,
    kind: 'tool',
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
    ...overrides,
  };
}

function grant(
  capability,
  scope,
  overrides = {},
) {
  return {
    grantId:
      'grant_' + capability.replace(/\W/g, '_'),
    subjectId: 'subject_user_1111',
    capability,
    scope,
    expiresAtMs: NOW + 60_000,
    ...overrides,
  };
}

test('pure read-only step is admitted without invented authority', () => {
  const result =
    authorizeGoalStepExecution(
      goal(),
      step(),
      [],
      'subject_user_1111',
      NOW + 100,
    );

  assert.equal(result.allowed, true);
  assert.equal(result.approvalRef, null);
  assert.deepEqual(result.grantIds, []);
});

test('scoped filesystem capability is rechecked at action time', () => {
  const result =
    authorizeGoalStepExecution(
      goal(),
      step({
        requiredCapabilities: [
          'filesystem.read',
        ],
      }),
      [
        grant(
          'filesystem.read',
          {
            resourcePrefix:
              '/home/user/project',
            maxElevation: 'none',
          },
        ),
      ],
      'subject_user_1111',
      NOW + 100,
      {
        'filesystem.read': {
          resourcePath:
            '/home/user/project/src/app.ts',
        },
      },
    );

  assert.equal(result.allowed, true);
  assert.equal(result.grantIds.length, 1);

  const denied =
    authorizeGoalStepExecution(
      goal(),
      step({
        requiredCapabilities: [
          'filesystem.read',
        ],
      }),
      [
        grant(
          'filesystem.read',
          {
            resourcePrefix:
              '/home/user/project',
          },
        ),
      ],
      'subject_user_1111',
      NOW + 100,
      {
        'filesystem.read': {
          resourcePath:
            '/etc/shadow',
        },
      },
    );

  assert.equal(denied.allowed, false);
  assert.equal(
    denied.reason,
    'capability_denied',
  );
  assert.equal(
    denied.deniedCapability,
    'filesystem.read',
  );
});

test('step risk cannot understate a required capability', () => {
  const result =
    authorizeGoalStepExecution(
      goal({
        risk: 'medium',
      }),
      step({
        requiredCapabilities: [
          'filesystem.write',
        ],
      }),
      [],
      'subject_user_1111',
      NOW + 100,
    );

  assert.equal(result.allowed, false);
  assert.equal(
    result.reason,
    'risk_underdeclared',
  );
});

test('side effect requires trusted approval authority and capability grant', () => {
  const mutableGoal =
    goal({
      intent: 'operate',
      risk: 'high',
      sideEffectPolicy:
        'approval-required',
    });

  const mutableStep =
    step({
      requiredCapabilities: [
        'filesystem.write',
      ],
      sideEffect: true,
      requiresApproval: true,
      rollbackRef:
        'rollback_ref_1111111111111111',
    });

  const grants = [
    grant(
      'filesystem.write',
      {
        resourcePrefix:
          '/home/user/project',
        maxElevation: 'none',
      },
    ),
  ];

  const contexts = {
    'filesystem.write': {
      resourcePath:
        '/home/user/project/src/app.ts',
    },
  };

  assert.equal(
    authorizeGoalStepExecution(
      mutableGoal,
      mutableStep,
      grants,
      'subject_user_1111',
      NOW + 100,
      contexts,
    ).reason,
    'approval_required',
  );

  const deniedApproval = {
    authorize() {
      return {
        allowed: false,
        approvalRef: null,
      };
    },
  };

  assert.equal(
    authorizeGoalStepExecution(
      mutableGoal,
      mutableStep,
      grants,
      'subject_user_1111',
      NOW + 100,
      contexts,
      deniedApproval,
    ).reason,
    'approval_denied',
  );

  let approvalInput = null;

  const approvalAuthority = {
    authorize(input) {
      approvalInput = input;
      return {
        allowed: true,
        approvalRef:
          'approval_ref_1111111111111111',
      };
    },
  };

  const allowed =
    authorizeGoalStepExecution(
      mutableGoal,
      mutableStep,
      grants,
      'subject_user_1111',
      NOW + 100,
      contexts,
      approvalAuthority,
    );

  assert.equal(allowed.allowed, true);
  assert.equal(
    allowed.approvalRef,
    'approval_ref_1111111111111111',
  );
  assert.equal(
    approvalInput.goalId,
    mutableGoal.goalId,
  );
  assert.equal(
    approvalInput.stepId,
    mutableStep.stepId,
  );
  assert.equal(
    approvalInput.operationRef,
    mutableStep.operationRef,
  );
});

test('expired grants fail closed at trusted action time', () => {
  const result =
    authorizeGoalStepExecution(
      goal(),
      step({
        requiredCapabilities: [
          'filesystem.read',
        ],
      }),
      [
        grant(
          'filesystem.read',
          {
            resourcePrefix:
              '/home/user/project',
          },
          {
            expiresAtMs: NOW + 50,
          },
        ),
      ],
      'subject_user_1111',
      NOW + 100,
      {
        'filesystem.read': {
          resourcePath:
            '/home/user/project/readme.md',
        },
      },
    );

  assert.equal(result.allowed, false);
  assert.equal(
    result.reason,
    'capability_denied',
  );
});
