import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  GoalReconciliationCoordinator,
  parseGoalReconciliationObservation,
} = loadTypeScriptModule(
  'src/core/agent/goalReconciliationCoordinator.ts',
);

const {
  GoalWorkQueue,
} = loadTypeScriptModule(
  'src/core/agent/goalWorkQueue.ts',
);

const NOW = 5_500_000_000;
const GOAL = 'goal_1111111111111111';
const PLAN =
  'goal_plan_1111111111111111';
const STEP =
  'goal_step_1111111111111111';
const WORK =
  'goal_work_1111111111111111';
const WORKER =
  'worker_ref_1111111111111111';

const queuePolicy = {
  maxQueueItems: 100,
  minimumLeaseMs: 1000,
  maximumLeaseMs: 60_000,
  retryBaseDelayMs: 1000,
  retryMaxDelayMs: 8000,
};

function goal() {
  return {
    protocolVersion: '1.0',
    goalId: GOAL,
    sourceRequestId:
      'brain_request_1111111111111111',
    workspaceId:
      'workspace_1111111111111111',
    intent: 'operate',
    risk: 'high',
    verification: 'strict',
    sideEffectPolicy:
      'approval-required',
    maxSteps: 6,
    maxRepairCycles: 2,
    maxToolAttempts: 3,
    createdAtMs: NOW,
    deadlineAtMs: NOW + 120_000,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  };
}

function plan() {
  return {
    protocolVersion: '1.0',
    planId: PLAN,
    goalId: GOAL,
    sourceRequestId:
      'brain_request_1111111111111111',
    generatedAtMs: NOW + 1,
    steps: [
      {
        stepId: STEP,
        ordinal: 1,
        kind: 'tool',
        operationRef:
          'operation_ref_1111111111111111',
        dependsOn: [],
        requiredCapabilities: [
          'filesystem.write',
        ],
        sideEffect: true,
        requiresApproval: true,
        rollbackRef:
          'rollback_ref_1111111111111111',
        verificationRef: null,
        grantsExecutionAuthority: false,
        grantsSensorAuthority: false,
        grantsApprovalAuthority: false,
        grantsCapabilityAuthority: false,
      },
      {
        stepId:
          'goal_step_2222222222222222',
        ordinal: 2,
        kind: 'verify',
        operationRef:
          'operation_ref_2222222222222222',
        dependsOn: [STEP],
        requiredCapabilities: [],
        sideEffect: false,
        requiresApproval: false,
        rollbackRef: null,
        verificationRef:
          'verification_ref_2222222222222222',
        grantsExecutionAuthority: false,
        grantsSensorAuthority: false,
        grantsApprovalAuthority: false,
        grantsCapabilityAuthority: false,
      },
      {
        stepId:
          'goal_step_3333333333333333',
        ordinal: 3,
        kind: 'verify',
        operationRef:
          'operation_ref_3333333333333333',
        dependsOn: [
          'goal_step_2222222222222222',
        ],
        requiredCapabilities: [],
        sideEffect: false,
        requiresApproval: false,
        rollbackRef: null,
        verificationRef:
          'verification_ref_3333333333333333',
        grantsExecutionAuthority: false,
        grantsSensorAuthority: false,
        grantsApprovalAuthority: false,
        grantsCapabilityAuthority: false,
      },
      {
        stepId:
          'goal_step_4444444444444444',
        ordinal: 4,
        kind: 'finalize',
        operationRef:
          'operation_ref_4444444444444444',
        dependsOn: [
          'goal_step_3333333333333333',
        ],
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
  };
}

function queueInReconciliation() {
  const queue =
    new GoalWorkQueue(queuePolicy);

  queue.enqueue(
    {
      protocolVersion: '1.0',
      workId: WORK,
      goalId: GOAL,
      planId: PLAN,
      stepId: STEP,
      operationRef:
        'operation_ref_1111111111111111',
      priority: 500,
      sideEffect: true,
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
    },
    NOW,
  );

  queue.claimNext(
    WORKER,
    NOW + 10,
    10_000,
  );

  queue.fail(
    WORK,
    WORKER,
    'transport_lost_commit_unknown',
    false,
    'unknown',
    'execution_evidence_1111111111111111',
    NOW + 20,
  );

  return queue;
}

function observation(overrides = {}) {
  return {
    protocolVersion: '1.0',
    workId: WORK,
    goalId: GOAL,
    planId: PLAN,
    stepId: STEP,
    operationRef:
      'operation_ref_1111111111111111',
    resolution: 'completed',
    commitState: 'committed',
    method: 'state_readback',
    evidenceRef:
      'reconciliation_evidence_1111111111111111',
    confidenceScore: 980,
    observedAtMs: NOW + 90,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
    ...overrides,
  };
}

const policy = {
  minimumConfidenceScore: 900,
  maximumEvidenceAgeMs: 30_000,
  allowManualConfirmation: false,
};

function coordinator(queue, output) {
  return new GoalReconciliationCoordinator(
    queue,
    {
      async reconcile() {
        return output;
      },
    },
    policy,
    () => NOW + 100,
  );
}

test(
  'confirmed committed side effect resolves to completed',
  async () => {
    const queue =
      queueInReconciliation();

    const result =
      await coordinator(
        queue,
        observation(),
      ).runNext(
        goal(),
        plan(),
      );

    assert.equal(
      result.status,
      'completed',
    );
    assert.equal(
      queue.getState(
        WORK,
        NOW + 100,
      )?.status,
      'completed',
    );
  },
);

test(
  'confirmed not-committed side effect can retry safely',
  async () => {
    const queue =
      queueInReconciliation();

    const result =
      await coordinator(
        queue,
        observation({
          resolution: 'retry_safe',
          commitState: 'not_committed',
          method: 'idempotency_lookup',
        }),
      ).runNext(
        goal(),
        plan(),
      );

    assert.equal(
      result.status,
      'retry_scheduled',
    );
    assert.equal(
      queue.getState(
        WORK,
        NOW + 100,
      )?.status,
      'queued',
    );
  },
);

test(
  'low-confidence unknown state never retries blindly',
  async () => {
    const queue =
      queueInReconciliation();

    const result =
      await coordinator(
        queue,
        observation({
          resolution: 'manual_review',
          commitState: 'unknown',
          confidenceScore: 500,
        }),
      ).runNext(
        goal(),
        plan(),
      );

    assert.equal(
      result.status,
      'manual_review',
    );
    assert.equal(
      queue.getState(
        WORK,
        NOW + 100,
      )?.status,
      'reconciliation_required',
    );
  },
);

test(
  'rollback evidence remains reconciliation-bound',
  async () => {
    const queue =
      queueInReconciliation();

    const result =
      await coordinator(
        queue,
        observation({
          resolution: 'rollback_required',
          commitState: 'committed',
          method: 'deterministic_probe',
        }),
      ).runNext(
        goal(),
        plan(),
      );

    assert.equal(
      result.status,
      'rollback_required',
    );
    assert.equal(
      queue.getState(
        WORK,
        NOW + 100,
      )?.status,
      'reconciliation_required',
    );
  },
);

test(
  'parser rejects completion claim without committed state',
  () => {
    assert.equal(
      parseGoalReconciliationObservation(
        observation({
          commitState: 'unknown',
        }),
      ),
      null,
    );
  },
);
