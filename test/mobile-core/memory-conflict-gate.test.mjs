import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  gateMemoryConflicts,
} = loadTypeScriptModule(
  'src/core/memory/memoryConflictGate.ts',
);

const ACCOUNT = 'account_1111111111111111';
const POLICY = 'memory_policy_1111111111111111';

function entry(
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
    updatedAtMs: 4_400_000_000,
    relevanceScore: 2,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsToolAuthority: false,
  };
}

function retrieval(overrides = {}) {
  return {
    protocolVersion: '1.0',
    accountId: ACCOUNT,
    policyId: POLICY,
    policyRevision: 3,
    purpose: 'interaction_context',
    entries: [
      entry(
        'memory_1111111111111111',
        'Use provider A',
        ['project-routing'],
      ),
      entry(
        'memory_2222222222222222',
        'Use provider B',
        ['project-routing'],
      ),
      entry(
        'memory_3333333333333333',
        'Keep tests strict',
        ['project-quality'],
      ),
    ],
    totalMatched: 3,
    contextBytes: 1000,
    truncated: false,
    retrievedAtMs: 4_400_000_100,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsToolAuthority: false,
    ...overrides,
  };
}

function compaction(overrides = {}) {
  return {
    protocolVersion: '1.0',
    accountId: ACCOUNT,
    policyId: POLICY,
    policyRevision: 3,
    groups: [
      {
        category: 'project',
        topicTags: ['project-routing'],
        state: 'conflict',
        sources: [
          {
            memoryId:
              'memory_1111111111111111',
            revision: 1,
            content: 'Use provider A',
            updatedAtMs: 4_400_000_000,
          },
          {
            memoryId:
              'memory_2222222222222222',
            revision: 1,
            content: 'Use provider B',
            updatedAtMs: 4_400_000_000,
          },
        ],
        grantsExecutionAuthority: false,
        grantsSensorAuthority: false,
        grantsToolAuthority: false,
      },
      {
        category: 'project',
        topicTags: ['project-quality'],
        state: 'consistent',
        sources: [
          {
            memoryId:
              'memory_3333333333333333',
            revision: 1,
            content: 'Keep tests strict',
            updatedAtMs: 4_400_000_000,
          },
        ],
        grantsExecutionAuthority: false,
        grantsSensorAuthority: false,
        grantsToolAuthority: false,
      },
    ],
    sourceCount: 3,
    truncated: false,
    generatedAtMs: 4_400_000_100,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsToolAuthority: false,
    ...overrides,
  };
}

test('conflicting memory group is removed before it can shape context', () => {
  const result =
    gateMemoryConflicts(
      retrieval(),
      compaction(),
    );

  assert.equal(result.accepted, true);
  assert.equal(
    result.reason,
    'conflict_filtered',
  );
  assert.equal(
    result.requiresClarification,
    true,
  );
  assert.deepEqual(
    result.safeEntries.map(
      (item) => item.memoryId,
    ),
    ['memory_3333333333333333'],
  );
  assert.deepEqual(
    result.conflictedMemoryIds,
    [
      'memory_1111111111111111',
      'memory_2222222222222222',
    ],
  );
});

test('consistent memory groups pass through unchanged', () => {
  const clean = compaction({
    groups: [
      {
        ...compaction().groups[1],
      },
    ],
    sourceCount: 1,
  });

  const cleanRetrieval = retrieval({
    entries: [
      retrieval().entries[2],
    ],
    totalMatched: 1,
  });

  const result =
    gateMemoryConflicts(
      cleanRetrieval,
      clean,
    );

  assert.equal(result.accepted, true);
  assert.equal(result.reason, 'safe');
  assert.equal(
    result.requiresClarification,
    false,
  );
  assert.equal(result.safeEntries.length, 1);
});

test('cross-account policy or revision binding fails closed', () => {
  assert.equal(
    gateMemoryConflicts(
      retrieval(),
      compaction({
        accountId:
          'account_2222222222222222',
      }),
    ).reason,
    'invalid_binding',
  );

  assert.equal(
    gateMemoryConflicts(
      retrieval(),
      compaction({
        policyRevision: 4,
      }),
    ).reason,
    'invalid_binding',
  );
});
