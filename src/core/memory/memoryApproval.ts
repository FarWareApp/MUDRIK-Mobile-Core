import {
  isMemoryCategory,
  type MemoryCategory,
} from './memoryCategories';

import {
  ACCOUNT_ID,
  MEMORY_APPROVAL_ID,
  MEMORY_CANDIDATE_ID,
  MEMORY_POLICY_ID,
  exactObject,
  safeInteger,
} from './memorySecurity';

export type MemoryWriteApproval =
  Readonly<{
    protocolVersion: '1.0';
    approvalId: string;
    accountId: string;
    policyId: string;
    policyRevision: number;
    candidateId: string;
    category: MemoryCategory;
    decision: 'approved';
    approvedAtMs: number;
    expiresAtMs: number;
    revision: number;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsToolAuthority: false;
  }>;

const KEYS = new Set([
  'protocolVersion',
  'approvalId',
  'accountId',
  'policyId',
  'policyRevision',
  'candidateId',
  'category',
  'decision',
  'approvedAtMs',
  'expiresAtMs',
  'revision',
  'grantsExecutionAuthority',
  'grantsSensorAuthority',
  'grantsToolAuthority',
]);

export function parseMemoryWriteApproval(
  input: unknown,
): MemoryWriteApproval | null {
  const record =
    exactObject(
      input,
      KEYS,
    );

  if (
    !record
    || record.protocolVersion
      !== '1.0'
    || typeof record.approvalId
      !== 'string'
    || !MEMORY_APPROVAL_ID.test(
      record.approvalId,
    )
    || typeof record.accountId
      !== 'string'
    || !ACCOUNT_ID.test(
      record.accountId,
    )
    || typeof record.policyId
      !== 'string'
    || !MEMORY_POLICY_ID.test(
      record.policyId,
    )
    || !safeInteger(
      record.policyRevision,
    )
    || (record.policyRevision as number)
      < 1
    || typeof record.candidateId
      !== 'string'
    || !MEMORY_CANDIDATE_ID.test(
      record.candidateId,
    )
    || !isMemoryCategory(
      record.category,
    )
    || record.decision
      !== 'approved'
    || !safeInteger(
      record.approvedAtMs,
    )
    || !safeInteger(
      record.expiresAtMs,
    )
    || (record.expiresAtMs as number)
      <= (record.approvedAtMs as number)
    || !safeInteger(
      record.revision,
    )
    || (record.revision as number)
      < 1
    || record.grantsExecutionAuthority
      !== false
    || record.grantsSensorAuthority
      !== false
    || record.grantsToolAuthority
      !== false
  ) {
    return null;
  }

  return Object.freeze({
    protocolVersion: '1.0',
    approvalId:
      record.approvalId,
    accountId:
      record.accountId,
    policyId:
      record.policyId,
    policyRevision:
      (record.policyRevision as number),
    candidateId:
      record.candidateId,
    category:
      record.category,
    decision: 'approved',
    approvedAtMs:
      (record.approvedAtMs as number),
    expiresAtMs:
      (record.expiresAtMs as number),
    revision:
      (record.revision as number),
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsToolAuthority: false,
  });
}
