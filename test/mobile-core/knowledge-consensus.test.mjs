import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  evaluateKnowledgeConsensus,
  validateKnowledgeConsensusPolicy,
} = loadTypeScriptModule(
  'src/core/knowledge/knowledgeConsensus.ts',
);

const NOW = 4_000_000_000;
const CLAIM =
  'knowledge_claim_release_00000000000001';
const VALUE_A = 'a'.repeat(64);
const VALUE_B = 'b'.repeat(64);

const policy = {
  minimumIndependentSources: 2,
  minimumWeightedSupport: 1800,
  contradictionVetoWeight: 1200,
  maximumObservationAgeMs:
    30 * 24 * 60 * 60 * 1000,
  requireOfficialSupport: false,
  requireCurrentSupport: true,
};

function observation(
  sourceId,
  valueDigest = VALUE_A,
  overrides = {},
) {
  return {
    claimId: CLAIM,
    valueDigest,
    sourceId,
    publisher:
      'publisher_' + sourceId.slice(-8),
    provenanceRef:
      'provenance_ref_' + sourceId,
    official: false,
    current: true,
    confidenceScore: 900,
    observedAtMs: NOW - 1000,
    ...overrides,
  };
}

test('independent current sources can support a claim', () => {
  assert.equal(
    validateKnowledgeConsensusPolicy(policy),
    true,
  );

  const result =
    evaluateKnowledgeConsensus(
      CLAIM,
      [
        observation(
          'knowledge_source_1111111111111111',
        ),
        observation(
          'knowledge_source_2222222222222222',
        ),
      ],
      policy,
      NOW,
    );

  assert.equal(result.accepted, true);
  assert.equal(result.reason, 'supported');
  assert.equal(
    result.independentSupporters,
    2,
  );
  assert.equal(
    result.selectedValueDigest,
    VALUE_A,
  );
});

test('duplicate source identity is rejected instead of double counted', () => {
  const source =
    'knowledge_source_1111111111111111';

  const result =
    evaluateKnowledgeConsensus(
      CLAIM,
      [
        observation(source),
        observation(source),
      ],
      policy,
      NOW,
    );

  assert.equal(result.accepted, false);
  assert.equal(result.reason, 'invalid_input');
});

test('strong conflicting evidence vetoes false certainty', () => {
  const result =
    evaluateKnowledgeConsensus(
      CLAIM,
      [
        observation(
          'knowledge_source_1111111111111111',
          VALUE_A,
          {
            official: true,
            confidenceScore: 1000,
          },
        ),
        observation(
          'knowledge_source_2222222222222222',
          VALUE_A,
        ),
        observation(
          'knowledge_source_3333333333333333',
          VALUE_B,
          {
            official: true,
            confidenceScore: 1000,
          },
        ),
      ],
      policy,
      NOW,
    );

  assert.equal(result.accepted, false);
  assert.equal(result.reason, 'contradicted');
  assert.ok(
    result.conflictingValueDigests.includes(
      VALUE_B,
    ),
  );
});

test('official support can be required for high-trust answers', () => {
  const result =
    evaluateKnowledgeConsensus(
      CLAIM,
      [
        observation(
          'knowledge_source_1111111111111111',
        ),
        observation(
          'knowledge_source_2222222222222222',
        ),
      ],
      {
        ...policy,
        requireOfficialSupport: true,
      },
      NOW,
    );

  assert.equal(result.accepted, false);
  assert.equal(
    result.reason,
    'official_support_missing',
  );
});

test('stale observations are not silently used', () => {
  const old =
    NOW
    - policy.maximumObservationAgeMs
    - 1;

  const result =
    evaluateKnowledgeConsensus(
      CLAIM,
      [
        observation(
          'knowledge_source_1111111111111111',
          VALUE_A,
          { observedAtMs: old },
        ),
      ],
      policy,
      NOW,
    );

  assert.equal(result.accepted, false);
  assert.equal(result.reason, 'invalid_input');
});

test('current-support policy rejects stale-only consensus', () => {
  const relaxedAge = {
    ...policy,
    maximumObservationAgeMs:
      365 * 24 * 60 * 60 * 1000,
    requireCurrentSupport: true,
  };

  const result =
    evaluateKnowledgeConsensus(
      CLAIM,
      [
        observation(
          'knowledge_source_1111111111111111',
          VALUE_A,
          { current: false },
        ),
        observation(
          'knowledge_source_2222222222222222',
          VALUE_A,
          { current: false },
        ),
      ],
      relaxedAge,
      NOW,
    );

  assert.equal(result.accepted, false);
  assert.equal(
    result.reason,
    'current_support_missing',
  );
});
