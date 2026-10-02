import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  planVerificationEvidence,
  validateAdaptiveVerificationPolicy,
} = loadTypeScriptModule(
  'src/core/verification/verificationPlanner.ts',
);

const NOW = 4_300_000_000;
const GOAL = 'goal_1111111111111111';
const PLAN = 'goal_plan_1111111111111111';
const STEP = 'goal_step_1111111111111111';
const RESULT = 'result_ref_1111111111111111';

const policy = {
  mediumIndependentGroups: 1,
  highIndependentGroups: 2,
  criticalIndependentGroups: 3,
  maxEvidenceAgeMs: 60_000,
  requireToolReceiptForSideEffect: true,
  requireStateReadbackForSideEffect: true,
  requireDeterministicForHighRisk: true,
  disallowModelOnlyAboveLowRisk: true,
};

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

function evidence(
  index,
  kind,
  overrides = {},
) {
  const suffix = String(index).repeat(16);

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

test('low risk no-verification result avoids unnecessary verification cost', () => {
  assert.equal(
    validateAdaptiveVerificationPolicy(policy),
    true,
  );

  const result = planVerificationEvidence(
    subject({
      risk: 'low',
      verification: 'none',
    }),
    [],
    policy,
    NOW,
  );

  assert.equal(result.accepted, true);
  assert.equal(
    result.reason,
    'verification_not_required',
  );
  assert.equal(
    result.minimumIndependentGroups,
    0,
  );
});

test('medium risk result asks for non-model evidence when model is the only source', () => {
  const result = planVerificationEvidence(
    subject(),
    [
      evidence(1, 'model_review'),
    ],
    policy,
    NOW,
  );

  assert.equal(result.accepted, false);
  assert.equal(
    result.reason,
    'collect_more_evidence',
  );
  assert.equal(
    result.observedIndependentGroups,
    1,
  );
  assert.equal(result.allowModelOnly, false);
});

test('high-risk result requires multiple independent groups plus deterministic evidence', () => {
  const incomplete =
    planVerificationEvidence(
      subject({
        risk: 'high',
        verification: 'strict',
      }),
      [
        evidence(1, 'external_truth'),
        evidence(2, 'model_review'),
      ],
      policy,
      NOW,
    );

  assert.equal(incomplete.accepted, false);
  assert.ok(
    incomplete.missingKinds.includes(
      'deterministic_test',
    ),
  );

  const ready =
    planVerificationEvidence(
      subject({
        risk: 'high',
        verification: 'strict',
      }),
      [
        evidence(1, 'deterministic_test'),
        evidence(2, 'external_truth'),
        evidence(3, 'model_review'),
      ],
      policy,
      NOW,
    );

  assert.equal(ready.accepted, true);
  assert.equal(
    ready.reason,
    'ready_for_verifier',
  );
});

test('side effect requires receipt and state readback before verification', () => {
  const result =
    planVerificationEvidence(
      subject({
        sideEffect: true,
      }),
      [
        evidence(1, 'tool_receipt'),
      ],
      policy,
      NOW,
    );

  assert.equal(result.accepted, false);
  assert.deepEqual(
    result.missingKinds,
    ['state_readback'],
  );

  const ready =
    planVerificationEvidence(
      subject({
        sideEffect: true,
      }),
      [
        evidence(1, 'tool_receipt'),
        evidence(2, 'state_readback'),
      ],
      policy,
      NOW,
    );

  assert.equal(ready.accepted, true);
});

test('critical result raises verification depth to three groups and integrity evidence', () => {
  const result =
    planVerificationEvidence(
      subject({
        risk: 'critical',
        verification: 'strict',
      }),
      [
        evidence(1, 'deterministic_test'),
        evidence(2, 'integrity_attestation'),
        evidence(3, 'external_truth'),
      ],
      policy,
      NOW,
    );

  assert.equal(result.accepted, true);
  assert.equal(
    result.minimumIndependentGroups,
    3,
  );
  assert.ok(
    result.requiredKinds.includes(
      'integrity_attestation',
    ),
  );
});

test('cross-result and stale evidence fail closed', () => {
  const wrong = planVerificationEvidence(
    subject(),
    [
      evidence(1, 'external_truth', {
        resultRef:
          'result_ref_2222222222222222',
      }),
    ],
    policy,
    NOW,
  );

  assert.equal(
    wrong.reason,
    'binding_mismatch',
  );

  const stale = planVerificationEvidence(
    subject(),
    [
      evidence(1, 'external_truth', {
        observedAtMs:
          NOW - policy.maxEvidenceAgeMs - 1,
        expiresAtMs: null,
      }),
    ],
    policy,
    NOW,
  );

  assert.equal(
    stale.reason,
    'evidence_time_invalid',
  );
});

test('duplicate evidence ids and malformed subject fail closed', () => {
  const one = evidence(1, 'external_truth');

  assert.equal(
    planVerificationEvidence(
      subject(),
      [one, one],
      policy,
      NOW,
    ).reason,
    'invalid_input',
  );

  assert.equal(
    planVerificationEvidence(
      subject({ goalId: 'bad' }),
      [],
      policy,
      NOW,
    ).reason,
    'invalid_input',
  );
});
