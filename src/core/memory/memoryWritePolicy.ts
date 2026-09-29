import {
  parseMemoryCandidate,
  type MemoryCandidate,
} from './memoryCandidate';

import {
  parseMemoryWriteApproval,
  type MemoryWriteApproval,
} from './memoryApproval';

import {
  parseMemoryPolicy,
  retentionForCategory,
  type MemoryPolicy,
} from './memoryPolicy';

import {
  parseMemoryRecord,
  type MemoryRecord,
} from './memoryRecord';

import {
  MEMORY_ID,
  safeInteger,
} from './memorySecurity';

export type MemoryWriteDecision =
  Readonly<{
    accepted: boolean;
    reason:
      | 'accepted'
      | 'invalid_input'
      | 'memory_disabled'
      | 'binding_mismatch'
      | 'stale_policy'
      | 'category_denied'
      | 'approval_invalid'
      | 'time_invalid'
      | 'retention_denied';
    record: MemoryRecord | null;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsToolAuthority: false;
  }>;

function reject(
  reason:
    Exclude<
      MemoryWriteDecision[
        'reason'
      ],
      'accepted'
    >,
): MemoryWriteDecision {
  return Object.freeze({
    accepted: false,
    reason,
    record: null,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsToolAuthority: false,
  });
}

function resolveRetention(
  policy: MemoryPolicy,
  candidate: MemoryCandidate,
): number | null | undefined {
  const allowed =
    retentionForCategory(
      policy,
      candidate.category,
    );

  const requested =
    candidate.requestedRetentionMs;

  if (allowed === null) {
    return requested;
  }

  if (
    requested !== null
    && requested > allowed
  ) {
    return undefined;
  }

  return (
    requested
    ?? allowed
  );
}

function approvalMatches(
  policy: MemoryPolicy,
  candidate: MemoryCandidate,
  approval: MemoryWriteApproval,
): boolean {
  return (
    approval.approvalId
      === candidate.explicitApprovalId
    && approval.accountId
      === candidate.accountId
    && approval.policyId
      === candidate.policyId
    && approval.candidateId
      === candidate.candidateId
    && approval.category
      === candidate.category
    && approval.policyId
      === policy.policyId
  );
}

export function authorizeMemoryWrite(
  input: {
    policy: unknown;
    candidate: unknown;
    approval: unknown;
    memoryId: string;
    trustedNowMs: number;
  },
): MemoryWriteDecision {
  const policy =
    parseMemoryPolicy(
      input.policy,
    );
  const candidate =
    parseMemoryCandidate(
      input.candidate,
    );
  const approval =
    parseMemoryWriteApproval(
      input.approval,
    );

  if (
    !policy
    || !candidate
    || !approval
    || !MEMORY_ID.test(
      input.memoryId,
    )
    || !safeInteger(
      input.trustedNowMs,
    )
  ) {
    return reject(
      'invalid_input',
    );
  }

  if (policy.mode === 'disabled') {
    return reject(
      'memory_disabled',
    );
  }

  if (
    policy.accountId
      !== candidate.accountId
    || policy.policyId
      !== candidate.policyId
    || !approvalMatches(
      policy,
      candidate,
      approval,
    )
  ) {
    return reject(
      'binding_mismatch',
    );
  }

  if (
    policy.revision
      !== candidate.policyRevision
    || approval.policyRevision
      !== policy.revision
  ) {
    return reject(
      'stale_policy',
    );
  }

  if (
    !policy.allowedCategories
      .includes(
        candidate.category,
      )
  ) {
    return reject(
      'category_denied',
    );
  }

  if (
    approval.decision
      !== 'approved'
  ) {
    return reject(
      'approval_invalid',
    );
  }

  if (
    policy.updatedAtMs
      > input.trustedNowMs
    || candidate.createdAtMs
      > input.trustedNowMs
    || approval.approvedAtMs
      > input.trustedNowMs
    || approval.approvedAtMs
      < candidate.createdAtMs
    || approval.expiresAtMs
      <= input.trustedNowMs
  ) {
    return reject(
      'time_invalid',
    );
  }

  const retention =
    resolveRetention(
      policy,
      candidate,
    );

  if (retention === undefined) {
    return reject(
      'retention_denied',
    );
  }

  let expiresAtMs:
    number | null = null;

  if (retention !== null) {
    const calculated =
      input.trustedNowMs
      + retention;

    if (
      !Number.isSafeInteger(
        calculated,
      )
      || calculated
        <= input.trustedNowMs
    ) {
      return reject(
        'retention_denied',
      );
    }

    expiresAtMs =
      calculated;
  }

  const record =
    parseMemoryRecord({
      protocolVersion: '1.0',
      memoryId:
        input.memoryId,
      accountId:
        candidate.accountId,
      category:
        candidate.category,
      content:
        candidate.content,
      topicTags:
        candidate.topicTags,
      sourceType:
        candidate.sourceType,
      sourceRef:
        candidate.sourceRef,
      candidateId:
        candidate.candidateId,
      explicitApprovalId:
        candidate.explicitApprovalId,
      policyId:
        candidate.policyId,
      policyRevision:
        candidate.policyRevision,
      createdAtMs:
        input.trustedNowMs,
      updatedAtMs:
        input.trustedNowMs,
      expiresAtMs,
      revision: 1,
      state: 'active',
      supersededByMemoryId: null,
      grantsExecutionAuthority: false,
      grantsSensorAuthority: false,
      grantsToolAuthority: false,
    });

  if (!record) {
    return reject(
      'invalid_input',
    );
  }

  return Object.freeze({
    accepted: true,
    reason: 'accepted',
    record,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsToolAuthority: false,
  });
}
