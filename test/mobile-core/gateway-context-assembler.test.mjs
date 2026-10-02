import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  assembleGatewayContextEvidence,
} = loadTypeScriptModule(
  'src/core/intelligence/GatewayContextAssembler.ts',
);

const NOW = 80_000_000;

function candidate(
  overrides = {},
) {
  return {
    candidateRef:
      'context_memory_1111111111111111',
    sourceKind: 'memory',
    authority: 'none',
    content: 'prefers concise answers',
    provenanceRef:
      'memory_ref_1111111111111111',
    observedAtMs:
      NOW - 1000,
    expiresAtMs: null,
    relevanceScore: 900,
    confidenceScore: 950,
    tokenEstimate: 10,
    sensitivity: 'private',
    accountId:
      'acct_1111111111111111',
    workspaceId: null,
    ...overrides,
  };
}

const policy = {
  maxEntries: 32,
  maxTokens: 32_000,
  allowPrivate: true,
  allowSensitive: false,
  accountId:
    'acct_1111111111111111',
  workspaceId: null,
};

test(
  'assembler emits only non-authoritative evidence with provenance',
  () => {
    const result =
      assembleGatewayContextEvidence(
        [
          candidate(),
          candidate({
            candidateRef:
              'context_knowledge_2222222222222222',
            sourceKind:
              'knowledge',
            content:
              'document fact',
            provenanceRef:
              'knowledge_ref_2222222222222222',
            confidenceScore: 850,
          }),
        ],
        policy,
        NOW,
      );

    assert.equal(
      result.accepted,
      true,
    );
    assert.deepEqual(
      result.evidence.map(
        (item) =>
          item.sourceKind,
      ),
      ['memory', 'knowledge'],
    );
    assert.ok(
      result.evidence.every(
        (item) =>
          typeof item.provenanceRef
            === 'string',
      ),
    );
  },
);

test(
  'assembler rejects requester or platform authority at evidence boundary',
  () => {
    const result =
      assembleGatewayContextEvidence(
        [
          candidate({
            authority:
              'requester',
            sourceKind:
              'requester_input',
          }),
        ],
        policy,
        NOW,
      );

    assert.equal(
      result.accepted,
      false,
    );
    assert.equal(
      result.reason,
      'invalid_source',
    );
  },
);

test(
  'compiler sensitivity policy removes disallowed sensitive evidence',
  () => {
    const result =
      assembleGatewayContextEvidence(
        [
          candidate({
            sensitivity:
              'sensitive',
          }),
        ],
        policy,
        NOW,
      );

    assert.equal(
      result.accepted,
      true,
    );
    assert.deepEqual(
      result.evidence,
      [],
    );
    assert.equal(
      result.truncated,
      true,
    );
  },
);
