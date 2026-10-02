import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  GoalRuntimeAuthorizationAuthority,
} = loadTypeScriptModule(
  'src/core/agent/goalWorkAuthorization.ts',
);

const NOW = 5_400_000_000;
const SUBJECT = 'subject_1111111111111111';
const GOAL = 'goal_1111111111111111';
const PLAN = 'goal_plan_1111111111111111';
const STEP = 'goal_step_1111111111111111';

function goal(overrides = {}) {
  return {
    protocolVersion: '1.0',
    goalId: GOAL,
    sourceRequestId:
      'brain_request_1111111111111111',
    workspaceId:
      'workspace_1111111111111111',
    intent: 'diagnose',
    risk: 'low',
    verification: 'standard',
    sideEffectPolicy: 'read-only',
    maxSteps: 4,
    maxRepairCycles: 2,
    maxToolAttempts: 3,
    createdAtMs: NOW,
    deadlineAtMs: NOW + 60_000,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
    ...overrides,
  };
}

function step(overrides = {}) {
  return {
    stepId: STEP,
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
    ...overrides,
  };
}

function plan(stepValue = step()) {
  return {
    protocolVersion: '1.0',
    planId: PLAN,
    goalId: GOAL,
    sourceRequestId:
      'brain_request_1111111111111111',
    generatedAtMs: NOW + 1,
    steps: [stepValue],
    providerIndependent: true,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  };
}

function state(stepValue = step()) {
  return {
    item: {
      protocolVersion: '1.0',
      workId:
        'goal_work_1111111111111111',
      goalId: GOAL,
      planId: PLAN,
      stepId: stepValue.stepId,
      operationRef:
        stepValue.operationRef,
      priority: 500,
      sideEffect:
        stepValue.sideEffect,
      idempotencyKey:
        'idempotency_ref_1111111111111111',
      notBeforeMs: NOW,
      deadlineAtMs: NOW + 60_000,
      maxAttempts: 3,
      createdAtMs: NOW,
      grantsExecutionAuthority: false,
      grantsSensorAuthority: false,
      grantsApprovalAuthority: false,
      grantsCapabilityAuthority: false,
    },
    status: 'leased',
    attempt: 1,
    leaseOwnerRef:
      'worker_ref_1111111111111111',
    leaseExpiresAtMs:
      NOW + 10_000,
    eligibleAtMs: NOW,
    lastFailureReason: null,
    completionEvidenceRef: null,
    updatedAtMs: NOW + 10,
  };
}

function trustedIntegrity() {
  return {
    accepted: true,
    reason: 'trusted',
    mismatchedArtifactRef: null,
    enterRestrictedMode: false,
  };
}

function compromisedIntegrity() {
  return {
    accepted: false,
    reason: 'digest_mismatch',
    mismatchedArtifactRef:
      'artifact_ref_brain_1111111111111111',
    enterRestrictedMode: true,
  };
}

test('trusted read-only work is authorized with no capabilities', () => {
  const authority =
    new GoalRuntimeAuthorizationAuthority(
      [],
      SUBJECT,
      {},
      null,
      trustedIntegrity,
    );

  const stepValue = step();
  const result =
    authority.authorize({
      goal: goal(),
      plan: plan(stepValue),
      step: stepValue,
      state: state(stepValue),
      workerRef:
        'worker_ref_1111111111111111',
      trustedNowMs: NOW + 20,
    });

  assert.equal(result.allowed, true);
  assert.equal(
    result.runtimeReason,
    'trusted_runtime',
  );
  assert.equal(
    result.goalAdmissionReason,
    'allowed',
  );
});

test('untrusted runtime blocks side-effect work before execution', () => {
  const stepValue =
    step({
      kind: 'tool',
      sideEffect: true,
      requiresApproval: true,
      requiredCapabilities: [
        'filesystem.write',
      ],
      rollbackRef:
        'rollback_ref_1111111111111111',
    });

  const authority =
    new GoalRuntimeAuthorizationAuthority(
      [],
      SUBJECT,
      {},
      null,
      compromisedIntegrity,
    );

  const result =
    authority.authorize({
      goal: goal({
        intent: 'operate',
        risk: 'high',
        sideEffectPolicy:
          'approval-required',
      }),
      plan: plan(stepValue),
      step: stepValue,
      state: state(stepValue),
      workerRef:
        'worker_ref_1111111111111111',
      trustedNowMs: NOW + 20,
    });

  assert.equal(result.allowed, false);
  assert.equal(
    result.reason,
    'runtime_untrusted',
  );
  assert.equal(
    result.runtimeReason,
    'blocked_untrusted_runtime',
  );
});

test('side-effect work requires capability scope and approval', () => {
  const stepValue =
    step({
      kind: 'tool',
      sideEffect: true,
      requiresApproval: true,
      requiredCapabilities: [
        'filesystem.write',
      ],
      rollbackRef:
        'rollback_ref_1111111111111111',
    });

  const sideGoal =
    goal({
      intent: 'operate',
      risk: 'high',
      sideEffectPolicy:
        'approval-required',
    });

  const authority =
    new GoalRuntimeAuthorizationAuthority(
      [
        {
          grantId:
            'grant_filesystem_write_111111111111',
          subjectId: SUBJECT,
          capability: 'filesystem.write',
          scope: {
            resourcePrefix:
              '/home/user/project',
            maxElevation: 'none',
          },
          expiresAtMs: NOW + 60_000,
        },
      ],
      SUBJECT,
      {
        'filesystem.write': {
          resourcePath:
            '/home/user/project/file.txt',
          elevation: 'none',
        },
      },
      {
        authorize() {
          return {
            allowed: true,
            approvalRef:
              'approval_ref_1111111111111111',
          };
        },
      },
      trustedIntegrity,
    );

  const result =
    authority.authorize({
      goal: sideGoal,
      plan: plan(stepValue),
      step: stepValue,
      state: state(stepValue),
      workerRef:
        'worker_ref_1111111111111111',
      trustedNowMs: NOW + 20,
    });

  assert.equal(result.allowed, true);
  assert.deepEqual(
    result.grantIds,
    ['grant_filesystem_write_111111111111'],
  );
  assert.equal(
    result.approvalRef,
    'approval_ref_1111111111111111',
  );
});

test('work binding mismatch is rejected before policy evaluation', () => {
  const authority =
    new GoalRuntimeAuthorizationAuthority(
      [],
      SUBJECT,
      {},
      null,
      trustedIntegrity,
    );

  const stepValue = step();
  const badState = state(stepValue);
  const altered = {
    ...badState,
    item: {
      ...badState.item,
      operationRef:
        'operation_ref_wrong_2222222222222222',
    },
  };

  const result =
    authority.authorize({
      goal: goal(),
      plan: plan(stepValue),
      step: stepValue,
      state: altered,
      workerRef:
        'worker_ref_1111111111111111',
      trustedNowMs: NOW + 20,
    });

  assert.equal(result.allowed, false);
  assert.equal(
    result.reason,
    'binding_mismatch',
  );
});
