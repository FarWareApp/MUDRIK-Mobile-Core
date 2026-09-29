import assert from 'node:assert/strict';
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
