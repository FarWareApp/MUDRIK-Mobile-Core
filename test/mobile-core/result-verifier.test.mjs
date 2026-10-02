import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  evaluateResultVerification,
  parseResultVerificationEvidence,
  validateResultVerificationPolicy,
} = loadTypeScriptModule(
  'src/core/verification/resultVerifier.ts',
);

const NOW = 3_100_000_000;
const GOAL =
  'goal_1111111111111111';
const PLAN =
  'goal_plan_1111111111111111';
const STEP =
  'goal_step_1111111111111111';
const RESULT =
  'result_ref_1111111111111111';

function subject(overrides = {}) {
  return {
    goalId: GOAL,
    planId: PLAN,
    stepId: STEP,
    resultRef: RESULT,
    risk: 'medium',
    sideEffect: false,
    verification: 'standard',
    ...overrides,
  };
}

function policy(overrides = {}) {
  return {
    minIndependentPasses: 2,
    minAggregateConfidence: 750,
    maxEvidenceAgeMs: 60_000,
    failureVetoConfidence: 700,
    requireDeterministicForSideEffect: true,
    requireStateReadbackForSideEffect: true,
    allowModelOnly: false,
    ...overrides,
  };
}

function evidence(
  index,
  kind,
  overrides = {},
) {
  const suffix =
    String(index).repeat(16);

  return {
    protocolVersion: '1.0',
    evidenceId:
      'verification_evidence_' + suffix,
    goalId: GOAL,
    planId: PLAN,
    stepId: STEP,
    resultRef: RESULT,
    kind,
    sourceRef:
      'source_ref_' + suffix,
    independentGroupRef:
      'independent_group_' + suffix,
    verdict: 'pass',
    confidenceScore: 900,
    observedAtMs: NOW - 100,
    expiresAtMs: NOW + 30_000,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
    ...overrides,
  };
}

test('low-risk no-verification subject can pass without evidence', () => {
  const decision =
    evaluateResultVerification(
      subject({
        risk: 'low',
        verification: 'none',
      }),
      [],
      policy(),
      NOW,
    );

  assert.equal(decision.accepted, true);
  assert.equal(
    decision.reason,
    'verification_not_required',
  );
});

test('strict side effect requires independent deterministic and state readback evidence', () => {
  const input = subject({
    risk: 'high',
    sideEffect: true,
    verification: 'strict',
  });

  const decision =
    evaluateResultVerification(
      input,
      [
        evidence(
          1,
          'deterministic_test',
        ),
        evidence(
          2,
          'state_readback',
        ),
      ],
      policy(),
      NOW,
    );

  assert.equal(decision.accepted, true);
  assert.equal(decision.reason, 'verified');
  assert.equal(
    decision.independentPasses,
    2,
  );
  assert.ok(
    decision.aggregateConfidence >= 900,
  );
});

test('same independent source cannot be double-counted', () => {
  const group =
    'independent_group_shared_11111111';

  const decision =
    evaluateResultVerification(
      subject(),
      [
        evidence(
          1,
          'external_truth',
          {
            independentGroupRef: group,
          },
        ),
        evidence(
          2,
          'model_review',
          {
            independentGroupRef: group,
          },
        ),
      ],
      policy(),
      NOW,
    );

  assert.equal(decision.accepted, false);
  assert.equal(
    decision.reason,
    'insufficient_independence',
  );
  assert.equal(
    decision.independentPasses,
    1,
  );
});

test('model-only verification is forbidden by default', () => {
  const decision =
    evaluateResultVerification(
      subject(),
      [
        evidence(1, 'model_review'),
        evidence(2, 'model_review'),
      ],
      policy(),
      NOW,
    );

  assert.equal(decision.accepted, false);
  assert.equal(
    decision.reason,
    'model_only_forbidden',
  );
});

test('high-confidence contradictory evidence vetoes result', () => {
  const decision =
    evaluateResultVerification(
      subject(),
      [
        evidence(1, 'external_truth'),
        evidence(
          2,
          'state_readback',
          {
            verdict: 'fail',
            confidenceScore: 980,
          },
        ),
      ],
      policy(),
      NOW,
    );

  assert.equal(decision.accepted, false);
  assert.equal(
    decision.reason,
    'contradicted',
  );
  assert.deepEqual(
    decision.rejectingEvidenceIds,
    [
      'verification_evidence_2222222222222222',
    ],
  );
});

test('side effects fail if state readback is missing', () => {
  const decision =
    evaluateResultVerification(
      subject({
        sideEffect: true,
      }),
      [
        evidence(
          1,
          'deterministic_test',
        ),
        evidence(
          2,
          'external_truth',
        ),
      ],
      policy(),
      NOW,
    );

  assert.equal(decision.accepted, false);
  assert.equal(
    decision.reason,
    'state_readback_missing',
  );
});

test('stale or cross-result evidence fails closed', () => {
  assert.equal(
    evaluateResultVerification(
      subject(),
      [
        evidence(
          1,
          'external_truth',
          {
            observedAtMs:
              NOW - 120_000,
            expiresAtMs: null,
          },
        ),
      ],
      policy({
        minIndependentPasses: 1,
      }),
      NOW,
    ).reason,
    'evidence_time_invalid',
  );

  assert.equal(
    evaluateResultVerification(
      subject(),
      [
        evidence(
          1,
          'external_truth',
          {
            resultRef:
              'result_ref_other_111111111111',
          },
        ),
      ],
      policy({
        minIndependentPasses: 1,
      }),
      NOW,
    ).reason,
    'binding_mismatch',
  );
});

test('evidence parser and policy reject authority escalation and bad bounds', () => {
  assert.ok(
    parseResultVerificationEvidence(
      evidence(
        1,
        'external_truth',
      ),
    ),
  );

  assert.equal(
    parseResultVerificationEvidence(
      evidence(
        1,
        'external_truth',
        {
          grantsApprovalAuthority: true,
        },
      ),
    ),
    null,
  );

  assert.equal(
    validateResultVerificationPolicy(
      policy({
        minIndependentPasses: 0,
      }),
    ),
    false,
  );
});
