import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  parseMemoryPolicy,
  retentionForCategory,
} = loadTypeScriptModule(
  'src/core/memory/memoryPolicy.ts',
);

const {
  parseMemoryCandidate,
} = loadTypeScriptModule(
  'src/core/memory/memoryCandidate.ts',
);

const {
  parseMemoryWriteApproval,
} = loadTypeScriptModule(
  'src/core/memory/memoryApproval.ts',
);

const {
  parseMemoryRecord,
  isMemoryRecordActive,
} = loadTypeScriptModule(
  'src/core/memory/memoryRecord.ts',
);

const {
  authorizeMemoryWrite,
} = loadTypeScriptModule(
  'src/core/memory/memoryWritePolicy.ts',
);

const {
  MemoryRegistry,
} = loadTypeScriptModule(
  'src/core/memory/memoryRegistry.ts',
);

const {
  createMemoryAuditEvent,
  parseMemoryAuditEvent,
} = loadTypeScriptModule(
  'src/core/memory/memoryAudit.ts',
);

const {
  createDefaultCompanionProfile,
} = loadTypeScriptModule(
  'src/contracts/Companion.ts',
);

const {
  resolveCompanionMemoryPolicyBinding,
} = loadTypeScriptModule(
  'src/core/companion/companionMemoryBinding.ts',
);

const ACCOUNT =
  'acct_1111111111111111';
const OTHER_ACCOUNT =
  'acct_2222222222222222';
const POLICY =
  'memory_policy_1111111111111111';
const CANDIDATE =
  'memory_candidate_1111111111111111';
const APPROVAL =
  'memory_approval_1111111111111111';
const MEMORY =
  'memory_item_1111111111111111';
const NOW = 1_000_000;
const DAY =
  24 * 60 * 60 * 1000;

function policy(
  overrides = {},
) {
  return {
    protocolVersion: '1.0',
    policyId: POLICY,
    accountId: ACCOUNT,
    mode: 'explicit_only',
    allowedCategories: [
      'language_preference',
      'project',
    ],
    defaultRetentionMs:
      30 * DAY,
    categoryRetentionMs: {
      project: 7 * DAY,
    },
    retrievalEnabled: true,
    maxRetrievalCount: 8,
    maxContextBytes: 16 * 1024,
    conversationReconstructionEnabled:
      true,
    revision: 3,
    updatedAtMs: NOW - 100,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsToolAuthority: false,
    ...overrides,
  };
}

function candidate(
  overrides = {},
) {
  return {
    protocolVersion: '1.0',
    candidateId: CANDIDATE,
    accountId: ACCOUNT,
    policyId: POLICY,
    policyRevision: 3,
    category:
      'language_preference',
    content:
      'Prefer Arabic for everyday conversation.',
    topicTags: [
      'Arabic',
      'Language',
    ],
    sourceType:
      'explicit_user_memory_request',
    sourceRef:
      'conversation:1111111111111111',
    explicitApprovalId:
      APPROVAL,
    createdAtMs: NOW - 50,
    requestedRetentionMs:
      10 * DAY,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsToolAuthority: false,
    ...overrides,
  };
}

function approval(
  overrides = {},
) {
  return {
    protocolVersion: '1.0',
    approvalId: APPROVAL,
    accountId: ACCOUNT,
    policyId: POLICY,
    policyRevision: 3,
    candidateId: CANDIDATE,
    category:
      'language_preference',
    decision: 'approved',
    approvedAtMs: NOW - 25,
    expiresAtMs: NOW + DAY,
    revision: 1,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsToolAuthority: false,
    ...overrides,
  };
}

test(
  'memory policy is strict provider-independent and disabled mode has zero memory surface',
  () => {
    const parsed =
      parseMemoryPolicy(policy());

    assert.ok(parsed);
    assert.deepEqual(
      parsed.allowedCategories,
      [
        'language_preference',
        'project',
      ],
    );
    assert.equal(
      retentionForCategory(
        parsed,
        'project',
      ),
      7 * DAY,
    );
    assert.equal(
      retentionForCategory(
        parsed,
        'language_preference',
      ),
      30 * DAY,
    );

    const disabled =
      parseMemoryPolicy(
        policy({
          mode: 'disabled',
          allowedCategories: [],
          categoryRetentionMs: {},
          retrievalEnabled: false,
          conversationReconstructionEnabled:
            false,
        }),
      );

    assert.ok(disabled);

    assert.equal(
      parseMemoryPolicy(
        policy({
          mode: 'disabled',
        }),
      ),
      null,
    );

    assert.equal(
      parseMemoryPolicy({
        ...policy(),
        provider:
          'some-model-provider',
      }),
      null,
    );
  },
);

test(
  'candidate normalizes and sorts tags but cannot contain authority or secret-shaped content',
  () => {
    const parsed =
      parseMemoryCandidate(
        candidate(),
      );

    assert.ok(parsed);
    assert.deepEqual(
      parsed.topicTags,
      [
        'arabic',
        'language',
      ],
    );
    assert.equal(
      parsed.grantsExecutionAuthority,
      false,
    );

    assert.equal(
      parseMemoryCandidate({
        ...candidate(),
        executeTool: true,
      }),
      null,
    );

    const syntheticKey =
      's'
      + 'k-'
      + 'abcdefghijklmnopqrstuvwxyz123456';

    assert.equal(
      parseMemoryCandidate(
        candidate({
          content:
            'Remember '
            + syntheticKey,
        }),
      ),
      null,
    );

    assert.equal(
      parseMemoryCandidate(
        candidate({
          content:
            'secret_ref_0123456789abcdef',
        }),
      ),
      null,
    );
  },
);

test(
  'candidate rejects duplicate normalized tags and unsupported sensitive category',
  () => {
    assert.equal(
      parseMemoryCandidate(
        candidate({
          topicTags: [
            'Arabic',
            'arabic',
          ],
        }),
      ),
      null,
    );

    assert.equal(
      parseMemoryCandidate(
        candidate({
          category: 'health',
        }),
      ),
      null,
    );
  },
);

test(
  'memory approval is exact candidate policy account category and time scoped',
  () => {
    assert.ok(
      parseMemoryWriteApproval(
        approval(),
      ),
    );

    assert.equal(
      parseMemoryWriteApproval({
        ...approval(),
        decision: 'rejected',
      }),
      null,
    );

    assert.equal(
      parseMemoryWriteApproval({
        ...approval(),
        capability:
          'terminal.execute',
      }),
      null,
    );
  },
);

test(
  'explicit-only memory write requires matching approval and creates non-authoritative durable record',
  () => {
    const decision =
      authorizeMemoryWrite({
        policy: policy(),
        candidate: candidate(),
        approval: approval(),
        memoryId: MEMORY,
        trustedNowMs: NOW,
      });

    assert.equal(
      decision.accepted,
      true,
    );
    assert.equal(
      decision.reason,
      'accepted',
    );
    assert.ok(decision.record);
    assert.equal(
      decision.record.memoryId,
      MEMORY,
    );
    assert.equal(
      decision.record.revision,
      1,
    );
    assert.equal(
      decision.record.state,
      'active',
    );
    assert.equal(
      decision.record.expiresAtMs,
      NOW + 10 * DAY,
    );
    assert.equal(
      decision.record
        .grantsExecutionAuthority,
      false,
    );
    assert.equal(
      decision.grantsToolAuthority,
      false,
    );
    assert.equal(
      isMemoryRecordActive(
        decision.record,
        NOW,
      ),
      true,
    );
  },
);

test(
  'disabled policy blocks write even with a valid explicit approval',
  () => {
    const result =
      authorizeMemoryWrite({
        policy: policy({
          mode: 'disabled',
          allowedCategories: [],
          categoryRetentionMs: {},
          retrievalEnabled: false,
          conversationReconstructionEnabled:
            false,
        }),
        candidate: candidate(),
        approval: approval(),
        memoryId: MEMORY,
        trustedNowMs: NOW,
      });

    assert.equal(
      result.accepted,
      false,
    );
    assert.equal(
      result.reason,
      'memory_disabled',
    );
  },
);

test(
  'cross-account stale-policy wrong-candidate and wrong-category approvals fail closed',
  () => {
    const cases = [
      {
        policy: policy({
          accountId:
            OTHER_ACCOUNT,
        }),
        expected:
          'binding_mismatch',
      },
      {
        candidate:
          candidate({
            policyRevision: 2,
          }),
        expected:
          'stale_policy',
      },
      {
        approval:
          approval({
            candidateId:
              'memory_candidate_2222222222222222',
          }),
        expected:
          'binding_mismatch',
      },
      {
        approval:
          approval({
            category: 'project',
          }),
        expected:
          'binding_mismatch',
      },
    ];

    for (const item of cases) {
      const result =
        authorizeMemoryWrite({
          policy:
            item.policy
            ?? policy(),
          candidate:
            item.candidate
            ?? candidate(),
          approval:
            item.approval
            ?? approval(),
          memoryId: MEMORY,
          trustedNowMs: NOW,
        });

      assert.equal(
        result.accepted,
        false,
      );
      assert.equal(
        result.reason,
        item.expected,
      );
    }
  },
);

test(
  'retention request cannot exceed policy and expiry uses trusted acceptance time',
  () => {
    const denied =
      authorizeMemoryWrite({
        policy: policy(),
        candidate:
          candidate({
            category: 'project',
            requestedRetentionMs:
              8 * DAY,
          }),
        approval:
          approval({
            category: 'project',
          }),
        memoryId: MEMORY,
        trustedNowMs: NOW,
      });

    assert.equal(
      denied.accepted,
      false,
    );
    assert.equal(
      denied.reason,
      'retention_denied',
    );

    const allowed =
      authorizeMemoryWrite({
        policy: policy(),
        candidate:
          candidate({
            category: 'project',
            requestedRetentionMs:
              null,
          }),
        approval:
          approval({
            category: 'project',
          }),
        memoryId: MEMORY,
        trustedNowMs: NOW,
      });

    assert.equal(
      allowed.accepted,
      true,
    );
    assert.equal(
      allowed.record.expiresAtMs,
      NOW + 7 * DAY,
    );
  },
);

test(
  'future candidate expired approval and approval before candidate fail trusted-time checks',
  () => {
    const cases = [
      {
        candidate:
          candidate({
            createdAtMs:
              NOW + 1,
          }),
        approval: approval({
          approvedAtMs:
            NOW + 2,
          expiresAtMs:
            NOW + DAY,
        }),
      },
      {
        approval:
          approval({
            expiresAtMs: NOW,
          }),
      },
      {
        approval:
          approval({
            approvedAtMs:
              NOW - 100,
          }),
      },
    ];

    for (const item of cases) {
      const result =
        authorizeMemoryWrite({
          policy: policy(),
          candidate:
            item.candidate
            ?? candidate(),
          approval:
            item.approval
            ?? approval(),
          memoryId: MEMORY,
          trustedNowMs: NOW,
        });

      assert.equal(
        result.accepted,
        false,
      );
      assert.equal(
        result.reason,
        'time_invalid',
      );
    }
  },
);

test(
  'record parser rejects supersession inconsistencies and expiration is retrieval-safe',
  () => {
    const active =
      authorizeMemoryWrite({
        policy: policy(),
        candidate: candidate(),
        approval: approval(),
        memoryId: MEMORY,
        trustedNowMs: NOW,
      }).record;

    assert.ok(active);

    assert.equal(
      parseMemoryRecord({
        ...active,
        state: 'superseded',
        supersededByMemoryId: null,
      }),
      null,
    );

    assert.equal(
      isMemoryRecordActive(
        active,
        active.expiresAtMs,
      ),
      false,
    );
  },
);


function retrievalRequest(
  overrides = {},
) {
  return {
    protocolVersion: '1.0',
    accountId: ACCOUNT,
    policyId: POLICY,
    policyRevision: 3,
    purpose:
      'interaction_context',
    queryTags: ['arabic'],
    categories: [
      'language_preference',
    ],
    maxResults: 4,
    maxContextBytes: 4096,
    requestedAtMs: NOW + 1,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsToolAuthority: false,
    ...overrides,
  };
}

function reconstructionInput(
  memoryProjection,
) {
  return {
    accountId: ACCOUNT,
    conversationId:
      'conv_1111111111111111',
    transcript: [{
      messageId:
        'msg_1111111111111111',
      role: 'user',
      content: 'Hello',
      occurredAtMs: NOW,
    }],
    ephemeralContext: [],
    memoryProjection,
    generatedAtMs: NOW + 1,
    maxBytes: 64 * 1024,
  };
}

function integrityProvider() {
  const digest = async (payload) =>
    crypto
      .createHash('sha256')
      .update(
        'section16-test-key:',
      )
      .update(payload)
      .digest('hex');

  return {
    digest,
    async verify(
      payload,
      expected,
    ) {
      return (
        await digest(payload)
      ) === expected;
    },
  };
}

test(
  'registry retrieval projection is provenance-bound and invalidated by deletion while fresh reconstruction remains available',
  () => {
    const registry =
      new MemoryRegistry();

    assert.equal(
      registry.setPolicy(
        policy(),
      ).accepted,
      true,
    );

    const created =
      registry.create({
        candidate: candidate(),
        approval: approval(),
        memoryId: MEMORY,
        trustedNowMs: NOW,
      });

    assert.equal(
      created.accepted,
      true,
    );

    const retrieval =
      registry.retrieve(
        retrievalRequest(),
        NOW + 1,
      );

    assert.equal(
      retrieval.accepted,
      true,
    );
    assert.ok(
      retrieval.projection,
    );

    const reconstructed =
      registry.reconstruct(
        reconstructionInput(
          retrieval.projection,
        ),
      );

    assert.ok(reconstructed);
    assert.equal(
      reconstructed.memoryIncluded,
      true,
    );

    const copiedProjection =
      JSON.parse(
        JSON.stringify(
          retrieval.projection,
        ),
      );

    assert.equal(
      registry.reconstruct(
        reconstructionInput(
          copiedProjection,
        ),
      ),
      null,
    );

    const deleted =
      registry.delete({
        accountId: ACCOUNT,
        memoryId: MEMORY,
        expectedRevision: 1,
        reason: 'user_deleted',
        trustedNowMs: NOW + 2,
      });

    assert.equal(
      deleted.accepted,
      true,
    );

    assert.equal(
      registry.reconstruct(
        reconstructionInput(
          retrieval.projection,
        ),
      ),
      null,
    );

    const fresh =
      registry.reconstruct(
        reconstructionInput(null),
      );

    assert.ok(fresh);
    assert.equal(
      fresh.memoryIncluded,
      false,
    );
  },
);

test(
  'compaction preserves conflicting facts and is invalidated by policy revision changes',
  () => {
    const registry =
      new MemoryRegistry();

    registry.setPolicy(policy());

    const secondCandidate =
      'memory_candidate_2222222222222222';
    const secondApproval =
      'memory_approval_2222222222222222';
    const secondMemory =
      'memory_item_2222222222222222';

    assert.equal(
      registry.create({
        candidate: candidate(),
        approval: approval(),
        memoryId: MEMORY,
        trustedNowMs: NOW,
      }).accepted,
      true,
    );

    assert.equal(
      registry.create({
        candidate: candidate({
          candidateId:
            secondCandidate,
          content:
            'Prefer German for everyday conversation.',
          explicitApprovalId:
            secondApproval,
        }),
        approval: approval({
          approvalId:
            secondApproval,
          candidateId:
            secondCandidate,
        }),
        memoryId:
          secondMemory,
        trustedNowMs: NOW,
      }).accepted,
      true,
    );

    const compacted =
      registry.compact({
        accountId: ACCOUNT,
        maxGroups: 8,
        maxBytes: 16 * 1024,
        trustedNowMs:
          NOW + 1,
      });

    assert.ok(compacted);
    assert.equal(
      compacted.groups.length,
      1,
    );
    assert.equal(
      compacted.groups[0].state,
      'conflict',
    );
    assert.deepEqual(
      compacted.groups[0]
        .sources
        .map(
          (entry) =>
            entry.memoryId,
        )
        .sort(),
      [
        MEMORY,
        secondMemory,
      ].sort(),
    );
    assert.equal(
      registry
        .isCurrentDerivedProjection(
          ACCOUNT,
          compacted,
        ),
      true,
    );

    assert.equal(
      registry.setPolicy(
        policy({
          revision: 4,
          updatedAtMs:
            NOW + 2,
        }),
      ).accepted,
      true,
    );

    assert.equal(
      registry
        .isCurrentDerivedProjection(
          ACCOUNT,
          compacted,
        ),
      false,
    );
  },
);

test(
  'sealed snapshot verifies before restore and preserves deletion replay protection across restart',
  async () => {
    const registry =
      new MemoryRegistry();

    registry.setPolicy(policy());
    registry.create({
      candidate: candidate(),
      approval: approval(),
      memoryId: MEMORY,
      trustedNowMs: NOW,
    });
    registry.delete({
      accountId: ACCOUNT,
      memoryId: MEMORY,
      expectedRevision: 1,
      reason: 'user_deleted',
      trustedNowMs: NOW + 1,
    });

    const provider =
      integrityProvider();

    const snapshot =
      await registry.sealSnapshot(
        ACCOUNT,
        NOW + 2,
        provider,
      );

    assert.ok(snapshot);
    assert.equal(
      snapshot.records.length,
      0,
    );
    assert.equal(
      snapshot.tombstones.length,
      1,
    );
    assert.equal(
      snapshot.candidateBindings
        .length,
      1,
    );

    const serialized =
      JSON.parse(
        JSON.stringify(snapshot),
      );

    const direct =
      new MemoryRegistry()
        .restoreSnapshot(
          serialized,
        );

    assert.equal(
      direct.accepted,
      false,
    );
    assert.equal(
      direct.reason,
      'snapshot_unverified',
    );

    const tampered = {
      ...serialized,
      integrityDigest:
        '0'.repeat(64),
    };

    const tamperedResult =
      await new MemoryRegistry()
        .verifyAndRestoreSnapshot(
          tampered,
          provider,
        );

    assert.equal(
      tamperedResult.accepted,
      false,
    );
    assert.equal(
      tamperedResult.reason,
      'snapshot_integrity_failed',
    );

    const restarted =
      new MemoryRegistry();

    const restored =
      await restarted
        .verifyAndRestoreSnapshot(
          serialized,
          provider,
        );

    assert.equal(
      restored.accepted,
      true,
    );

    const replay =
      restarted.create({
        candidate: candidate(),
        approval: approval(),
        memoryId:
          'memory_item_3333333333333333',
        trustedNowMs: NOW + 3,
      });

    assert.equal(
      replay.accepted,
      false,
    );
    assert.equal(
      replay.reason,
      'candidate_replay',
    );
  },
);

test(
  'memory audit factory remains content-free and strict parser rejects private payload fields',
  () => {
    const event =
      createMemoryAuditEvent({
        auditId:
          'memaudit_1111111111111111',
        accountId: ACCOUNT,
        eventType:
          'memory_deleted',
        reasonCode:
          'user_deleted',
        memoryId: MEMORY,
        policyId: POLICY,
        sourceCount: 1,
        resultCount: 0,
        occurredAtMs: NOW,
      });

    assert.ok(event);
    assert.equal(
      event.containsPrivateContent,
      false,
    );
    assert.equal(
      Object.hasOwn(
        event,
        'content',
      ),
      false,
    );

    assert.equal(
      parseMemoryAuditEvent({
        ...event,
        content:
          'private memory text',
      }),
      null,
    );
  },
);


function companionProfile(
  overrides = {},
) {
  return {
    ...createDefaultCompanionProfile(),
    memoryPolicyId: POLICY,
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

test(
  'companion memory binding is exact-account exact-policy reference only and cannot widen memory authority',
  () => {
    const bound =
      resolveCompanionMemoryPolicyBinding(
        companionProfile(),
        policy(),
        ACCOUNT,
      );

    assert.equal(
      bound.bound,
      true,
    );
    assert.equal(
      bound.retrievalPermitted,
      true,
    );
    assert.equal(
      bound.policyRevision,
      3,
    );
    assert.equal(
      bound.grantsMemoryAuthority,
      false,
    );
    assert.equal(
      bound.grantsMemoryCategoryAccess,
      false,
    );
    assert.equal(
      bound.grantsRetrievalAuthority,
      false,
    );
    assert.equal(
      Object.hasOwn(
        bound,
        'allowedCategories',
      ),
      false,
    );

    const wrongAccount =
      resolveCompanionMemoryPolicyBinding(
        companionProfile(),
        policy(),
        OTHER_ACCOUNT,
      );

    assert.equal(
      wrongAccount.bound,
      false,
    );
    assert.equal(
      wrongAccount.reason,
      'account_mismatch',
    );

    const wrongPolicy =
      resolveCompanionMemoryPolicyBinding(
        companionProfile(),
        policy({
          policyId:
            'memory_policy_2222222222222222',
        }),
        ACCOUNT,
      );

    assert.equal(
      wrongPolicy.bound,
      false,
    );
    assert.equal(
      wrongPolicy.reason,
      'policy_mismatch',
    );

    const disabled =
      resolveCompanionMemoryPolicyBinding(
        companionProfile(),
        policy({
          mode: 'disabled',
          allowedCategories: [],
          categoryRetentionMs: {},
          retrievalEnabled: false,
          conversationReconstructionEnabled:
            false,
        }),
        ACCOUNT,
      );

    assert.equal(
      disabled.bound,
      true,
    );
    assert.equal(
      disabled.retrievalPermitted,
      false,
    );
    assert.equal(
      disabled.reason,
      'memory_disabled',
    );
  },
);

test(
  'registry policy and candidate replay rules are idempotent conflict-safe and revision ordered',
  () => {
    const registry =
      new MemoryRegistry();

    const firstPolicy =
      registry.setPolicy(
        policy(),
      );

    assert.equal(
      firstPolicy.accepted,
      true,
    );

    const duplicatePolicy =
      registry.setPolicy(
        policy(),
      );

    assert.equal(
      duplicatePolicy.accepted,
      true,
    );
    assert.equal(
      duplicatePolicy.duplicate,
      true,
    );

    const sameRevisionConflict =
      registry.setPolicy(
        policy({
          maxRetrievalCount: 7,
        }),
      );

    assert.equal(
      sameRevisionConflict.accepted,
      false,
    );
    assert.equal(
      sameRevisionConflict.reason,
      'policy_revision_conflict',
    );

    const stale =
      registry.setPolicy(
        policy({
          revision: 2,
          updatedAtMs:
            NOW - 200,
        }),
      );

    assert.equal(
      stale.accepted,
      false,
    );
    assert.equal(
      stale.reason,
      'stale_policy',
    );

    const gap =
      registry.setPolicy(
        policy({
          revision: 5,
          updatedAtMs:
            NOW + 1,
        }),
      );

    assert.equal(
      gap.accepted,
      false,
    );
    assert.equal(
      gap.reason,
      'policy_revision_gap',
    );

    const created =
      registry.create({
        candidate: candidate(),
        approval: approval(),
        memoryId: MEMORY,
        trustedNowMs: NOW,
      });

    assert.equal(
      created.accepted,
      true,
    );

    const duplicate =
      registry.create({
        candidate: candidate(),
        approval: approval(),
        memoryId: MEMORY,
        trustedNowMs: NOW,
      });

    assert.equal(
      duplicate.accepted,
      true,
    );
    assert.equal(
      duplicate.duplicate,
      true,
    );

    const candidateReplay =
      registry.create({
        candidate: candidate(),
        approval: approval(),
        memoryId:
          'memory_item_3333333333333333',
        trustedNowMs: NOW,
      });

    assert.equal(
      candidateReplay.accepted,
      false,
    );
    assert.equal(
      candidateReplay.reason,
      'candidate_replay',
    );

    const otherCandidate =
      'memory_candidate_3333333333333333';
    const otherApproval =
      'memory_approval_3333333333333333';

    const memoryConflict =
      registry.create({
        candidate: candidate({
          candidateId:
            otherCandidate,
          explicitApprovalId:
            otherApproval,
        }),
        approval: approval({
          approvalId:
            otherApproval,
          candidateId:
            otherCandidate,
        }),
        memoryId: MEMORY,
        trustedNowMs: NOW,
      });

    assert.equal(
      memoryConflict.accepted,
      false,
    );
    assert.equal(
      memoryConflict.reason,
      'memory_id_conflict',
    );
  },
);

test(
  'supersession preserves old provenance and rejects stale repeat updates',
  () => {
    const registry =
      new MemoryRegistry();

    registry.setPolicy(policy());
    registry.create({
      candidate: candidate(),
      approval: approval(),
      memoryId: MEMORY,
      trustedNowMs: NOW,
    });

    const nextCandidate =
      'memory_candidate_4444444444444444';
    const nextApproval =
      'memory_approval_4444444444444444';
    const nextMemory =
      'memory_item_4444444444444444';

    const superseded =
      registry.supersede({
        accountId: ACCOUNT,
        currentMemoryId: MEMORY,
        expectedRevision: 1,
        candidate: candidate({
          candidateId:
            nextCandidate,
          content:
            'Prefer concise Arabic for everyday conversation.',
          explicitApprovalId:
            nextApproval,
        }),
        approval: approval({
          approvalId:
            nextApproval,
          candidateId:
            nextCandidate,
        }),
        newMemoryId:
          nextMemory,
        trustedNowMs:
          NOW + 1,
      });

    assert.equal(
      superseded.accepted,
      true,
    );
    assert.equal(
      superseded.reason,
      'superseded',
    );

    const state =
      registry.exportAccountState(
        ACCOUNT,
      );

    assert.ok(state);

    const oldRecord =
      state.records.find(
        (record) =>
          record.memoryId
            === MEMORY,
      );
    const newRecord =
      state.records.find(
        (record) =>
          record.memoryId
            === nextMemory,
      );

    assert.ok(oldRecord);
    assert.ok(newRecord);
    assert.equal(
      oldRecord.state,
      'superseded',
    );
    assert.equal(
      oldRecord.revision,
      2,
    );
    assert.equal(
      oldRecord
        .supersededByMemoryId,
      nextMemory,
    );
    assert.equal(
      newRecord.state,
      'active',
    );

    const staleRepeat =
      registry.supersede({
        accountId: ACCOUNT,
        currentMemoryId: MEMORY,
        expectedRevision: 1,
        candidate: candidate({
          candidateId:
            'memory_candidate_5555555555555555',
          explicitApprovalId:
            'memory_approval_5555555555555555',
        }),
        approval: approval({
          approvalId:
            'memory_approval_5555555555555555',
          candidateId:
            'memory_candidate_5555555555555555',
        }),
        newMemoryId:
          'memory_item_5555555555555555',
        trustedNowMs:
          NOW + 2,
      });

    assert.equal(
      staleRepeat.accepted,
      false,
    );
    assert.equal(
      staleRepeat.reason,
      'supersession_source_invalid',
    );
  },
);

test(
  'retrieval is account category time count byte and expiry bounded',
  () => {
    const registry =
      new MemoryRegistry();

    registry.setPolicy(policy());

    registry.create({
      candidate: candidate({
        requestedRetentionMs:
          60 * 60 * 1000,
      }),
      approval: approval(),
      memoryId: MEMORY,
      trustedNowMs: NOW,
    });

    const wrongAccount =
      registry.retrieve(
        retrievalRequest({
          accountId:
            OTHER_ACCOUNT,
        }),
        NOW + 1,
      );

    assert.equal(
      wrongAccount.accepted,
      false,
    );
    assert.equal(
      wrongAccount.reason,
      'binding_mismatch',
    );

    const deniedCategory =
      registry.retrieve(
        retrievalRequest({
          categories: ['routine'],
        }),
        NOW + 1,
      );

    assert.equal(
      deniedCategory.accepted,
      false,
    );
    assert.equal(
      deniedCategory.reason,
      'category_denied',
    );

    const deniedCount =
      registry.retrieve(
        retrievalRequest({
          maxResults: 9,
        }),
        NOW + 1,
      );

    assert.equal(
      deniedCount.accepted,
      false,
    );
    assert.equal(
      deniedCount.reason,
      'limit_denied',
    );

    const deniedBytes =
      registry.retrieve(
        retrievalRequest({
          maxContextBytes:
            16 * 1024 + 1,
        }),
        NOW + 1,
      );

    assert.equal(
      deniedBytes.accepted,
      false,
    );
    assert.equal(
      deniedBytes.reason,
      'limit_denied',
    );

    const futureRequest =
      registry.retrieve(
        retrievalRequest({
          requestedAtMs:
            NOW + 10,
        }),
        NOW + 5,
      );

    assert.equal(
      futureRequest.accepted,
      false,
    );
    assert.equal(
      futureRequest.reason,
      'time_invalid',
    );

    const afterExpiry =
      NOW + 60 * 60 * 1000;

    const expired =
      registry.retrieve(
        retrievalRequest({
          requestedAtMs:
            afterExpiry,
        }),
        afterExpiry,
      );

    assert.equal(
      expired.accepted,
      true,
    );
    assert.equal(
      expired.projection.entries
        .length,
      0,
    );

    assert.equal(
      registry.purgeExpired(
        ACCOUNT,
        afterExpiry,
      ),
      1,
    );

    const tombstone =
      registry.getTombstone(
        MEMORY,
      );

    assert.ok(tombstone);
    assert.equal(
      tombstone.reason,
      'retention_expired',
    );
    assert.equal(
      Object.hasOwn(
        tombstone,
        'content',
      ),
      false,
    );
  },
);

test(
  'policy disable invalidates prior retrieval projection and blocks further durable memory context',
  () => {
    const registry =
      new MemoryRegistry();

    assert.equal(
      registry.setPolicy(
        policy(),
      ).accepted,
      true,
    );

    assert.equal(
      registry.create({
        candidate: candidate(),
        approval: approval(),
        memoryId: MEMORY,
        trustedNowMs: NOW,
      }).accepted,
      true,
    );

    const retrieved =
      registry.retrieve(
        retrievalRequest(),
        NOW + 1,
      );

    assert.equal(
      retrieved.accepted,
      true,
    );
    assert.ok(
      retrieved.projection,
    );

    const disabledPolicy =
      policy({
        mode: 'disabled',
        allowedCategories: [],
        categoryRetentionMs: {},
        retrievalEnabled: false,
        conversationReconstructionEnabled:
          false,
        revision: 4,
        updatedAtMs: NOW + 2,
      });

    const disabled =
      registry.setPolicy(
        disabledPolicy,
      );

    assert.equal(
      disabled.accepted,
      true,
    );

    assert.equal(
      registry.reconstruct(
        reconstructionInput(
          retrieved.projection,
        ),
      ),
      null,
    );

    const afterDisable =
      registry.retrieve(
        retrievalRequest({
          policyRevision: 4,
          requestedAtMs: NOW + 3,
        }),
        NOW + 3,
      );

    assert.equal(
      afterDisable.accepted,
      false,
    );

    const fresh =
      registry.reconstruct(
        reconstructionInput(null),
      );

    assert.ok(fresh);
    assert.equal(
      fresh.memoryIncluded,
      false,
    );
  },
);

test(
  'supersession invalidates prior compaction and reconstruction never mutates source inputs',
  () => {
    const registry =
      new MemoryRegistry();

    registry.setPolicy(policy());

    assert.equal(
      registry.create({
        candidate: candidate(),
        approval: approval(),
        memoryId: MEMORY,
        trustedNowMs: NOW,
      }).accepted,
      true,
    );

    const compacted =
      registry.compact({
        accountId: ACCOUNT,
        policyId: POLICY,
        policyRevision: 3,
        categories: [
          'language_preference',
        ],
        maxGroups: 8,
        maxBytes: 8192,
        trustedNowMs: NOW + 1,
      });

    assert.ok(compacted);
    assert.equal(
      registry
        .isCurrentDerivedProjection(
          ACCOUNT,
          compacted,
        ),
      true,
    );

    const nextCandidate =
      'memory_candidate_6666666666666666';
    const nextApproval =
      'memory_approval_6666666666666666';
    const nextMemory =
      'memory_item_6666666666666666';

    const superseded =
      registry.supersede({
        accountId: ACCOUNT,
        currentMemoryId: MEMORY,
        expectedRevision: 1,
        candidate: candidate({
          candidateId:
            nextCandidate,
          content:
            'Prefer concise Arabic responses.',
          explicitApprovalId:
            nextApproval,
          createdAtMs: NOW + 2,
        }),
        approval: approval({
          approvalId:
            nextApproval,
          candidateId:
            nextCandidate,
          approvedAtMs: NOW + 3,
          expiresAtMs:
            NOW + DAY,
        }),
        newMemoryId:
          nextMemory,
        trustedNowMs: NOW + 4,
      });

    assert.equal(
      superseded.accepted,
      true,
    );

    assert.equal(
      registry
        .isCurrentDerivedProjection(
          ACCOUNT,
          compacted,
        ),
      false,
    );

    const retrieved =
      registry.retrieve(
        retrievalRequest({
          requestedAtMs: NOW + 5,
        }),
        NOW + 5,
      );

    assert.equal(
      retrieved.accepted,
      true,
    );

    const input =
      reconstructionInput(
        retrieved.projection,
      );
    const before =
      JSON.parse(
        JSON.stringify(input),
      );

    const reconstructed =
      registry.reconstruct(input);

    assert.ok(reconstructed);
    assert.deepEqual(
      input,
      before,
    );
    assert.equal(
      input.transcript[0].content,
      'Hello',
    );
  },
);
