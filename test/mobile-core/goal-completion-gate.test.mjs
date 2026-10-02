import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  evaluateGoalCompletion,
} = loadTypeScriptModule(
  'src/core/agent/goalCompletionGate.ts',
);

const {
  GoalWorkQueue,
} = loadTypeScriptModule(
  'src/core/agent/goalWorkQueue.ts',
);

const NOW = 5_100_000_000;
const GOAL = 'goal_1111111111111111';
const PLAN = 'goal_plan_1111111111111111';
const REQUEST = 'brain_request_1111111111111111';
const WORKER = 'worker_ref_1111111111111111';

const S1 = 'goal_step_1111111111111111';
const S2 = 'goal_step_2222222222222222';
const S3 = 'goal_step_3333333333333333';

const queuePolicy = {
  maxQueueItems: 100,
  minimumLeaseMs: 1_000,
  maximumLeaseMs: 60_000,
  retryBaseDelayMs: 1_000,
  retryMaxDelayMs: 8_000,
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

function plan(overrides = {}) {
  return {
    protocolVersion: '1.0',
    planId: PLAN,
    goalId: GOAL,
    sourceRequestId: REQUEST,
    generatedAtMs: NOW + 1,
    steps: [
      step(S1, 1, 'reason'),
      step(S2, 2, 'verify', [S1]),
      step(S3, 3, 'finalize', [S2]),
    ],
    providerIndependent: true,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
    ...overrides,
  };
}

function workItem(stepId, index) {
  const suffix = String(index).repeat(16);

  return {
    protocolVersion: '1.0',
    workId: 'goal_work_' + suffix,
    goalId: GOAL,
    planId: PLAN,
    stepId,
    operationRef:
      'operation_ref_' + stepId.slice(-16),
    priority: 500,
    sideEffect: false,
    idempotencyKey:
      'idempotency_ref_' + suffix,
    notBeforeMs: NOW + 10,
    deadlineAtMs: NOW + 120_000,
    maxAttempts: 2,
    createdAtMs: NOW + 10,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  };
}

function completedState(stepId, index) {
  const queue =
    new GoalWorkQueue(queuePolicy);
  const item = workItem(stepId, index);

  queue.enqueue(item, NOW + 10);
  const claimed =
    queue.claimNext(
      WORKER,
      NOW + 20,
      10_000,
    );

  assert.ok(claimed.state);

  queue.complete(
    item.workId,
    WORKER,
    'evidence_ref_'
      + String(index).repeat(16),
    NOW + 30,
  );

  const state =
    queue.getState(
      item.workId,
      NOW + 30,
    );

  assert.ok(state);
  return state;
}

function completedStates() {
  return [
    completedState(S1, 1),
    completedState(S2, 2),
    completedState(S3, 3),
  ];
}

function verified(overrides = {}) {
  return {
    accepted: true,
    reason: 'verified',
    independentPasses: 2,
    aggregateConfidence: 950,
    acceptedEvidenceIds: [
      'verification_evidence_1111111111111111',
      'verification_evidence_2222222222222222',
    ],
    rejectingEvidenceIds: [],
    ...overrides,
  };
}

function input(overrides = {}) {
  return {
    goal: goal(),
    plan: plan(),
    workStates: completedStates(),
    finalVerification: verified(),
    runtimeTrusted: true,
    rollbackPending: 0,
    budgetHealthy: true,
    trustedNowMs: NOW + 40,
    ...overrides,
  };
}

test('goal can complete only when all work and final verification are proven', () => {
  const result =
    evaluateGoalCompletion(input());

  assert.equal(result.accepted, true);
  assert.equal(result.reason, 'complete');
  assert.equal(
    result.completionEvidenceRefs.length,
    3,
  );
});

test('missing or unfinished work blocks completion', () => {
  const missing =
    completedStates().slice(0, 2);

  assert.equal(
    evaluateGoalCompletion(
      input({ workStates: missing }),
    ).reason,
    'work_missing',
  );

  const queue =
    new GoalWorkQueue(queuePolicy);
  const queued = workItem(S3, 3);
  queue.enqueue(queued, NOW + 10);

  const states = [
    completedState(S1, 1),
    completedState(S2, 2),
    queue.getState(
      queued.workId,
      NOW + 20,
    ),
  ].filter(Boolean);

  assert.equal(
    evaluateGoalCompletion(
      input({ workStates: states }),
    ).reason,
    'work_incomplete',
  );
});

test('dead letter or reconciliation state blocks final success', () => {
  const failedQueue =
    new GoalWorkQueue(queuePolicy);
  const failedItem = workItem(S2, 2);

  failedQueue.enqueue(
    failedItem,
    NOW + 10,
  );
  failedQueue.claimNext(
    WORKER,
    NOW + 20,
    10_000,
  );
  failedQueue.fail(
    failedItem.workId,
    WORKER,
    'provider_failed',
    false,
    'not_committed',
    null,
    NOW + 30,
  );

  const failedStates = [
    completedState(S1, 1),
    failedQueue.getState(
      failedItem.workId,
      NOW + 30,
    ),
    completedState(S3, 3),
  ].filter(Boolean);

  assert.equal(
    evaluateGoalCompletion(
      input({
        workStates: failedStates,
      }),
    ).reason,
    'work_failed',
  );

  const reconcileQueue =
    new GoalWorkQueue(queuePolicy);
  const side = {
    ...workItem(S2, 2),
    sideEffect: true,
  };

  reconcileQueue.enqueue(
    side,
    NOW + 10,
  );
  reconcileQueue.claimNext(
    WORKER,
    NOW + 20,
    1_000,
  );
  reconcileQueue.getState(
    side.workId,
    NOW + 1_020,
  );

  const reconcileStates = [
    completedState(S1, 1),
    reconcileQueue.getState(
      side.workId,
      NOW + 1_020,
    ),
    completedState(S3, 3),
  ].filter(Boolean);

  assert.equal(
    evaluateGoalCompletion(
      input({
        workStates:
          reconcileStates,
      }),
    ).reason,
    'work_reconciliation_required',
  );
});

test('runtime trust rollback and budget gates outrank completion', () => {
  assert.equal(
    evaluateGoalCompletion(
      input({
        runtimeTrusted: false,
      }),
    ).reason,
    'runtime_untrusted',
  );

  assert.equal(
    evaluateGoalCompletion(
      input({
        rollbackPending: 1,
      }),
    ).reason,
    'rollback_pending',
  );

  assert.equal(
    evaluateGoalCompletion(
      input({
        budgetHealthy: false,
      }),
    ).reason,
    'budget_exhausted',
  );
});

test('verification is mandatory for medium standard goal', () => {
  assert.equal(
    evaluateGoalCompletion(
      input({
        finalVerification: null,
      }),
    ).reason,
    'verification_missing',
  );

  assert.equal(
    evaluateGoalCompletion(
      input({
        finalVerification:
          verified({
            accepted: false,
            reason:
              'insufficient_confidence',
          }),
      }),
    ).reason,
    'verification_failed',
  );
});

test('malformed verification success cannot forge goal completion', () => {
  const forged =
    verified({
      accepted: true,
      reason:
        'insufficient_confidence',
    });

  assert.equal(
    evaluateGoalCompletion(
      input({
        finalVerification: forged,
      }),
    ).reason,
    'invalid_input',
  );
});

test('low-risk no-verification goal may complete without verifier', () => {
  const result =
    evaluateGoalCompletion(
      input({
        goal: goal({
          risk: 'low',
          verification: 'none',
        }),
        finalVerification: null,
      }),
    );

  assert.equal(result.accepted, true);
  assert.equal(result.reason, 'complete');
});

test('deadline overrun cannot be declared successful', () => {
  assert.equal(
    evaluateGoalCompletion(
      input({
        trustedNowMs:
          NOW + 120_001,
      }),
    ).reason,
    'deadline_exceeded',
  );
});
