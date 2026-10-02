import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  parseGoalExecutionLease,
  validateGoalExecutionLease,
} = loadTypeScriptModule(
  'src/core/agent/goalExecutionLease.ts',
);

const {
  parseGoalExecutionReceipt,
  GoalExecutionReceiptRegistry,
} = loadTypeScriptModule(
  'src/core/agent/goalExecutionReceipt.ts',
);

const NOW = 2_000_000_000;

function lease(overrides = {}) {
  return {
    protocolVersion: '1.0',
    leaseId: 'goal_lease_1111111111111111',
    goalId: 'goal_1111111111111111',
    planId: 'goal_plan_1111111111111111',
    stepId: 'goal_step_1111111111111111',
    operationRef: 'operation_ref_1111111111111111',
    issuedAtMs: NOW - 1000,
    expiresAtMs: NOW + 5000,
    generation: 3,
    approvalRef: 'approval_ref_1111111111111111',
    grantIds: [
      'grant_ref_1111111111111111',
      'grant_ref_2222222222222222',
    ],
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
    ...overrides,
  };
}

function receipt(overrides = {}) {
  return {
    protocolVersion: '1.0',
    receiptId: 'goal_receipt_1111111111111111',
    leaseId: 'goal_lease_1111111111111111',
    goalId: 'goal_1111111111111111',
    planId: 'goal_plan_1111111111111111',
    stepId: 'goal_step_1111111111111111',
    operationRef: 'operation_ref_1111111111111111',
    generation: 3,
    attempt: 1,
    outcome: 'succeeded',
    resultRef: 'result_ref_1111111111111111',
    evidenceRef: 'evidence_ref_1111111111111111',
    failureReason: null,
    startedAtMs: NOW - 500,
    completedAtMs: NOW - 100,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
    ...overrides,
  };
}

test('execution lease is strict and exact-bound', () => {
  const parsed = parseGoalExecutionLease(lease());
  assert.ok(parsed);

  const result = validateGoalExecutionLease(
    parsed,
    {
      goalId: parsed.goalId,
      planId: parsed.planId,
      stepId: parsed.stepId,
      operationRef: parsed.operationRef,
      generation: 3,
      approvalRef: parsed.approvalRef,
      grantIds: parsed.grantIds,
    },
    NOW,
  );

  assert.deepEqual(result, {
    accepted: true,
    reason: 'valid',
  });

  assert.equal(
    validateGoalExecutionLease(
      parsed,
      {
        goalId: parsed.goalId,
        planId: parsed.planId,
        stepId: parsed.stepId,
        operationRef: parsed.operationRef,
        generation: 4,
        approvalRef: parsed.approvalRef,
        grantIds: parsed.grantIds,
      },
      NOW,
    ).reason,
    'generation_mismatch',
  );
});

test('expired or altered lease fails closed', () => {
  const expired = parseGoalExecutionLease(
    lease({
      issuedAtMs: NOW - 5000,
      expiresAtMs: NOW,
    }),
  );
  assert.ok(expired);

  assert.equal(
    validateGoalExecutionLease(
      expired,
      {
        goalId: expired.goalId,
        planId: expired.planId,
        stepId: expired.stepId,
        operationRef: expired.operationRef,
        generation: expired.generation,
        approvalRef: expired.approvalRef,
        grantIds: expired.grantIds,
      },
      NOW,
    ).reason,
    'expired',
  );

  assert.equal(
    parseGoalExecutionLease({
      ...lease(),
      grantsExecutionAuthority: true,
    }),
    null,
  );
});

test('success receipt requires evidence and failure receipt requires reason', () => {
  assert.ok(parseGoalExecutionReceipt(receipt()));

  assert.equal(
    parseGoalExecutionReceipt(
      receipt({ evidenceRef: null }),
    ),
    null,
  );

  const failed = parseGoalExecutionReceipt(
    receipt({
      receiptId: 'goal_receipt_2222222222222222',
      outcome: 'failed',
      resultRef: null,
      evidenceRef: 'evidence_ref_failure_111111111111',
      failureReason: 'provider_timeout',
    }),
  );

  assert.ok(failed);
});

test('receipt registry is idempotent but blocks replay and rebinding', () => {
  const registry =
    new GoalExecutionReceiptRegistry();

  const first = receipt();

  assert.deepEqual(
    registry.accept(first, NOW),
    {
      accepted: true,
      idempotent: false,
      reason: 'accepted',
    },
  );

  assert.deepEqual(
    registry.accept(first, NOW),
    {
      accepted: true,
      idempotent: true,
      reason: 'idempotent',
    },
  );

  assert.equal(
    registry.accept(
      receipt({
        receiptId: 'goal_receipt_3333333333333333',
      }),
      NOW,
    ).reason,
    'lease_mismatch',
  );

  const otherLeaseSameAttempt =
    receipt({
      receiptId: 'goal_receipt_4444444444444444',
      leaseId: 'goal_lease_4444444444444444',
    });

  assert.equal(
    registry.accept(
      otherLeaseSameAttempt,
      NOW,
    ).reason,
    'attempt_replay',
  );
});

test('future completion time is rejected', () => {
  const registry =
    new GoalExecutionReceiptRegistry();

  assert.equal(
    registry.accept(
      receipt({
        completedAtMs: NOW + 1,
      }),
      NOW,
    ).reason,
    'time_invalid',
  );
});
