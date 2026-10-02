import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  decideGoalAutonomyAction,
} = loadTypeScriptModule(
  'src/core/agent/goalAutonomyDecision.ts',
);

function execution(overrides = {}) {
  return {
    status: 'succeeded',
    toolRef: 'tool_1111111111111111',
    attempts: 1,
    resultRef:
      'result_ref_1111111111111111',
    evidenceRef:
      'evidence_ref_1111111111111111',
    failureReason: null,
    sideEffectCommitted: false,
    completedAtMs: 3_600_000_000,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
    ...overrides,
  };
}

function input(overrides = {}) {
  return {
    execution: execution(),
    verification: {
      accepted: true,
      reason: 'verified',
      independentPasses: 2,
      aggregateConfidence: 900,
      acceptedEvidenceIds: [
        'verification_evidence_1111111111111111',
      ],
      rejectingEvidenceIds: [],
    },
    verificationRequired: true,
    rollbackAvailable: true,
    budgetHealthy: true,
    runtimeTrusted: true,
    recoveryAvailable: true,
    repairCycles: 0,
    maxRepairCycles: 2,
    deadlineRemainingMs: 60_000,
    ...overrides,
  };
}

test('verified success is accepted', () => {
  assert.deepEqual(
    decideGoalAutonomyAction(
      input(),
    ),
    {
      action: 'accept_result',
      reason: 'result_verified',
    },
  );
});

test('missing verification gathers evidence instead of guessing', () => {
  assert.deepEqual(
    decideGoalAutonomyAction(
      input({
        verification: null,
      }),
    ),
    {
      action: 'gather_evidence',
      reason: 'evidence_needed',
    },
  );
});

test('uncertain committed side effect rolls back before retrying', () => {
  assert.deepEqual(
    decideGoalAutonomyAction(
      input({
        execution: execution({
          status:
            'needs_reconciliation',
          sideEffectCommitted: true,
          resultRef: null,
          failureReason:
            'post_commit_timeout',
        }),
      }),
    ),
    {
      action: 'rollback',
      reason: 'side_effect_uncertain',
    },
  );
});

test('contradicted read-only result triggers replan within repair budget', () => {
  const verification = {
    ...input().verification,
    accepted: false,
    reason: 'contradicted',
  };

  assert.deepEqual(
    decideGoalAutonomyAction(
      input({
        verification,
      }),
    ),
    {
      action: 'replan',
      reason: 'verification_contradicted',
    },
  );
});

test('untrusted runtime diverts to recovery before normal work', () => {
  assert.deepEqual(
    decideGoalAutonomyAction(
      input({
        runtimeTrusted: false,
        recoveryAvailable: true,
      }),
    ),
    {
      action: 'recover_runtime',
      reason: 'runtime_untrusted',
    },
  );

  assert.deepEqual(
    decideGoalAutonomyAction(
      input({
        runtimeTrusted: false,
        recoveryAvailable: false,
      }),
    ),
    {
      action: 'block',
      reason: 'runtime_untrusted',
    },
  );
});

test('budget deadline and repair exhaustion stop runaway autonomy', () => {
  assert.equal(
    decideGoalAutonomyAction(
      input({
        budgetHealthy: false,
      }),
    ).reason,
    'resource_budget_exhausted',
  );

  assert.equal(
    decideGoalAutonomyAction(
      input({
        deadlineRemainingMs: 0,
      }),
    ).reason,
    'deadline_exhausted',
  );

  assert.deepEqual(
    decideGoalAutonomyAction(
      input({
        execution: execution({
          status: 'failed',
          resultRef: null,
          evidenceRef: null,
          failureReason:
            'tool_unavailable',
        }),
        repairCycles: 2,
        maxRepairCycles: 2,
      }),
    ),
    {
      action: 'block',
      reason: 'repair_budget_exhausted',
    },
  );
});
