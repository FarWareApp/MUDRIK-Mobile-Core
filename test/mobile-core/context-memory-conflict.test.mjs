import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  contextFromConflictSafeMemory,
} = loadTypeScriptModule(
  'src/core/context/contextCompiler.ts',
);

const ACCOUNT = 'account_1111111111111111';
const POLICY = 'memory_policy_1111111111111111';

function memoryEntry(
  memoryId,
  content,
  topicTags,
) {
  return {
    memoryId,
    category: 'project',
    content,
    topicTags,
    sourceType:
      'explicit_user_statement',
    sourceRef:
      'source_ref_' + memoryId.slice(-16),
    recordRevision: 1,
    updatedAtMs: 4_600_000_000,
    relevanceScore: 4,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsToolAuthority: false,
  };
}

const conflictingA =
  memoryEntry(
    'memory_1111111111111111',
    'Use provider A',
    ['routing'],
  );
const conflictingB =
  memoryEntry(
    'memory_2222222222222222',
    'Use provider B',
    ['routing'],
  );
const safe =
  memoryEntry(
    'memory_3333333333333333',
    'Require strict tests',
    ['quality'],
  );

function retrieval(overrides = {}) {
  return {
    protocolVersion: '1.0',
    accountId: ACCOUNT,
    policyId: POLICY,
    policyRevision: 1,
    purpose: 'interaction_context',
    entries: [
      conflictingA,
      conflictingB,
      safe,
    ],
    totalMatched: 3,
    contextBytes: 900,
    truncated: false,
    retrievedAtMs: 4_600_000_100,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsToolAuthority: false,
    ...overrides,
  };
}

function group(
  state,
  topicTags,
  sources,
) {
  return {
    category: 'project',
    topicTags,
    state,
    sources,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsToolAuthority: false,
  };
}

function source(entry) {
  return {
    memoryId: entry.memoryId,
    revision: entry.recordRevision,
    content: entry.content,
    updatedAtMs: entry.updatedAtMs,
  };
}

function compaction(overrides = {}) {
  return {
    protocolVersion: '1.0',
    accountId: ACCOUNT,
    policyId: POLICY,
    policyRevision: 1,
    groups: [
      group(
        'conflict',
        ['routing'],
        [
          source(conflictingA),
          source(conflictingB),
        ],
      ),
      group(
        'consistent',
        ['quality'],
        [source(safe)],
      ),
    ],
    sourceCount: 3,
    truncated: false,
    generatedAtMs: 4_600_000_100,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsToolAuthority: false,
    ...overrides,
  };
}

test('conflicting memories never enter compiled context candidates', () => {
  const result =
    contextFromConflictSafeMemory(
      retrieval(),
      compaction(),
    );

  assert.equal(result.accepted, true);
  assert.equal(
    result.requiresClarification,
    true,
  );
  assert.equal(result.candidates.length, 1);
  assert.equal(
    result.candidates[0].content,
    'Require strict tests',
  );
  assert.equal(
    result.candidates[0].authority,
    'none',
  );
  assert.deepEqual(
    result.conflictedMemoryIds,
    [
      conflictingA.memoryId,
      conflictingB.memoryId,
    ],
  );
});

test('memory/compaction binding mismatch yields no context', () => {
  const result =
    contextFromConflictSafeMemory(
      retrieval(),
      compaction({
        policyRevision: 2,
      }),
    );

  assert.equal(result.accepted, false);
  assert.deepEqual(
    result.candidates,
    [],
  );
  assert.equal(
    result.requiresClarification,
    false,
  );
});
