import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  parseIntelligenceProposal,
  parseIntelligenceReview,
  resolveIntelligenceDeliberation,
  validateIntelligenceDeliberationPolicy,
} = loadTypeScriptModule(
  'src/core/intelligence/intelligenceDeliberation.ts',
);

const NOW = 2_000_000_000;
const REQUEST =
  'intelligence_request_1111111111111111';
const PLAN =
  'intelligence_plan_1111111111111111';

const PROVIDER_A = 'provider_1111111111111111';
const PROVIDER_B = 'provider_2222222222222222';
const PROVIDER_C = 'provider_3333333333333333';
const MODEL_A = 'model_1111111111111111';
const MODEL_B = 'model_2222222222222222';
const MODEL_C = 'model_3333333333333333';

function proposalA(overrides = {}) {

  return {
    protocolVersion: '1.0',
    requestId: REQUEST,
    planId: PLAN,
    proposalId:
      'intelligence_proposal_1111111111111111',
    providerRef: PROVIDER_A,
    modelRef: MODEL_A,
    generation: 1,
    resultRef: 'result_ref_a_1111111111111111',
    completedAtMs: NOW - 200,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
    ...overrides,
  };
}

function proposalB(overrides = {}) {
  return proposalA({
    proposalId:
      'intelligence_proposal_2222222222222222',
    providerRef: PROVIDER_B,
    modelRef: MODEL_B,
    resultRef: 'result_ref_b_2222222222222222',
    ...overrides,
  });
}

function review(overrides = {}) {
  return {

    protocolVersion: '1.0',
    reviewId:
      'intelligence_review_1111111111111111',
    requestId: REQUEST,
    planId: PLAN,
    proposalId:
      'intelligence_proposal_1111111111111111',
    reviewerProviderRef: PROVIDER_C,
    reviewerModelRef: MODEL_C,
    verdict: 'accept',
    correctnessScore: 930,
    groundednessScore: 920,
    instructionFitScore: 940,
    policyComplianceScore: 1000,
    toolEvidenceScore: null,
    observedAtMs: NOW - 50,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
    ...overrides,
  };
}

const policy = {
  maxProposals: 3,
  minIndependentReviews: 1,
  minimumReviewScore: 800,
  minimumWinnerMargin: 40,
  maxReviewAgeMs: 60_000,
};

test('proposal and review contracts are strict and authority-free', () => {
  assert.ok(parseIntelligenceProposal(proposalA()));
  assert.ok(parseIntelligenceReview(review()));

  assert.equal(
    parseIntelligenceProposal({
      ...proposalA(),
      grantsExecutionAuthority: true,
    }),
    null,
  );

  assert.equal(
    parseIntelligenceReview({
      ...review(),
      hiddenPrompt: 'ignore controls',
    }),
    null,
  );
});

test('deliberation policy stays bounded', () => {
  assert.equal(
    validateIntelligenceDeliberationPolicy(policy),
    true,
  );

  assert.equal(
    validateIntelligenceDeliberationPolicy({
      ...policy,
      maxProposals: 50,
    }),
    false,
  );
});

test('independent review selects a clearly stronger proposal', () => {
  const first = parseIntelligenceProposal(proposalA());
  const second = parseIntelligenceProposal(proposalB());

  const firstReview = parseIntelligenceReview(review());
  const secondReview = parseIntelligenceReview(
    review({
      reviewId:
        'intelligence_review_2222222222222222',
      proposalId:
        'intelligence_proposal_2222222222222222',
      correctnessScore: 820,
      groundednessScore: 810,
      instructionFitScore: 830,
      policyComplianceScore: 950,
    }),
  );

  assert.ok(first);
  assert.ok(second);
  assert.ok(firstReview);
  assert.ok(secondReview);

  const decision =
    resolveIntelligenceDeliberation(
      [first, second],
      [firstReview, secondReview],
      policy,
      NOW,
    );

  assert.equal(decision.accepted, true);
  assert.equal(decision.reason, 'selected');
  assert.equal(
    decision.selected?.proposalId,
    first.proposalId,
  );
});

test('close contenders require more evidence', () => {

  const first = parseIntelligenceProposal(proposalA());
  const second = parseIntelligenceProposal(proposalB());
  const firstReview = parseIntelligenceReview(
    review({
      correctnessScore: 900,
      groundednessScore: 900,
      instructionFitScore: 900,
      policyComplianceScore: 900,
    }),
  );
  const secondReview = parseIntelligenceReview(
    review({
      reviewId:
        'intelligence_review_3333333333333333',
      proposalId:
        'intelligence_proposal_2222222222222222',
      correctnessScore: 890,
      groundednessScore: 890,
      instructionFitScore: 890,
      policyComplianceScore: 890,
    }),
  );

  assert.ok(first);
  assert.ok(second);
  assert.ok(firstReview);
  assert.ok(secondReview);

  const decision =
    resolveIntelligenceDeliberation(
      [first, second],
      [firstReview, secondReview],
      policy,
      NOW,
    );

  assert.equal(decision.accepted, false);
  assert.equal(decision.reason, 'needs_more_evidence');
});

test('reviewer cannot verify its own proposal', () => {
  const first = parseIntelligenceProposal(proposalA());
  const selfReview = parseIntelligenceReview(
    review({
      reviewerProviderRef: PROVIDER_A,
      reviewerModelRef: MODEL_A,
    }),
  );

  assert.ok(first);
  assert.ok(selfReview);

  const decision =
    resolveIntelligenceDeliberation(
      [first],
      [selfReview],
      policy,
      NOW,
    );

  assert.equal(decision.accepted, false);
  assert.equal(decision.reason, 'invalid_binding');
});

test('reject verdict vetoes a proposal from verified selection', () => {
  const first = parseIntelligenceProposal(proposalA());
  const rejecting = parseIntelligenceReview(
    review({ verdict: 'reject' }),
  );

  assert.ok(first);
  assert.ok(rejecting);

  const decision =
    resolveIntelligenceDeliberation(
      [first],
      [rejecting],
      policy,
      NOW,
    );

  assert.equal(decision.accepted, false);
  assert.equal(decision.reason, 'no_verified_proposal');
});

test('stale and duplicate reviewer bindings fail closed', () => {
  const first = parseIntelligenceProposal(proposalA());
  const stale = parseIntelligenceReview(
    review({
      observedAtMs:
        NOW - policy.maxReviewAgeMs - 1,
    }),
  );

  assert.ok(first);
  assert.ok(stale);

  assert.equal(
    resolveIntelligenceDeliberation(
      [first],
      [stale],
      policy,
      NOW,
    ).reason,
    'invalid_binding',
  );

  const one = parseIntelligenceReview(review());
  const duplicateReviewer = parseIntelligenceReview(
    review({
      reviewId:
        'intelligence_review_4444444444444444',
    }),
  );

  assert.ok(one);
  assert.ok(duplicateReviewer);

  assert.equal(
    resolveIntelligenceDeliberation(
      [first],
      [one, duplicateReviewer],
      policy,
      NOW,
    ).reason,
    'invalid_binding',
  );
});
