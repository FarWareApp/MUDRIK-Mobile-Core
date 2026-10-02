import assert from 'node:assert/strict';
import test from 'node:test';

import { loadTypeScriptModule } from './loadTypeScriptModule.mjs';

const { evaluateKnowledgeGrounding } = loadTypeScriptModule(
  'src/core/knowledge/knowledgeGroundingGate.ts',
);

const CLAIM_A = 'knowledge_claim_grounding_0000000000001';
const CLAIM_B = 'knowledge_claim_grounding_0000000000002';

const supported = {
  accepted: true,
  reason: 'supported',
  selectedValueDigest: 'a'.repeat(64),
  independentSupporters: 2,
  weightedSupport: 2200,
  weightedOpposition: 0,
  conflictingValueDigests: [],
};

function claim(overrides = {}) {
  return {
    claimId: CLAIM_A,
    material: true,
    consensus: supported,
    citationRefs: ['citation_ref_1111111111111111'],
    ...overrides,
  };
}

const policy = {
  requireCitationForMaterialClaims: true,
  maxUnsupportedNonMaterialClaims: 1,
  allowUncertaintyDisclosure: true,
  researchExhausted: false,
};

test('fully supported cited claims can answer', () => {
  assert.deepEqual(
    evaluateKnowledgeGrounding([claim()], policy),
    {
      action: 'answer',
      reason: 'fully_grounded',
      unsupportedClaimIds: [],
      contradictedClaimIds: [],
      missingCitationClaimIds: [],
    },
  );
});

test('material contradiction forces more research', () => {
  const result = evaluateKnowledgeGrounding(
    [
      claim({
        consensus: {
          ...supported,
          accepted: false,
          reason: 'contradicted',
          weightedOpposition: 1500,
          conflictingValueDigests: ['b'.repeat(64)],
        },
      }),
    ],
    policy,
  );

  assert.equal(result.action, 'research_more');
  assert.equal(result.reason, 'material_claim_contradicted');
});

test('missing citation on supported material claim is not silently accepted', () => {
  const result = evaluateKnowledgeGrounding(
    [claim({ citationRefs: [] })],
    policy,
  );

  assert.equal(result.action, 'research_more');
  assert.equal(result.reason, 'citation_missing');
});

test('non-material uncertainty may be disclosed instead of fabricated away', () => {
  const result = evaluateKnowledgeGrounding(
    [
      claim(),
      claim({
        claimId: CLAIM_B,
        material: false,
        citationRefs: [],
        consensus: {
          ...supported,
          accepted: false,
          reason: 'insufficient_independence',
          independentSupporters: 1,
          weightedSupport: 900,
        },
      }),
    ],
    policy,
  );

  assert.equal(result.action, 'answer_with_uncertainty');
  assert.equal(result.reason, 'uncertainty_disclosed');
  assert.deepEqual(result.unsupportedClaimIds, [CLAIM_B]);
});

test('exhausted evidence blocks unresolved material claim', () => {
  const result = evaluateKnowledgeGrounding(
    [
      claim({
        consensus: {
          ...supported,
          accepted: false,
          reason: 'insufficient_support',
          weightedSupport: 500,
        },
      }),
    ],
    {
      ...policy,
      researchExhausted: true,
    },
  );

  assert.equal(result.action, 'block');
  assert.equal(result.reason, 'evidence_exhausted');
});

test('duplicate claim identifiers fail closed', () => {
  const result = evaluateKnowledgeGrounding(
    [claim(), claim()],
    policy,
  );

  assert.equal(result.action, 'block');
  assert.equal(result.reason, 'invalid_input');
});
