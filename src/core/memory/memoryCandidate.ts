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
  freezeStrings,
  isSafeMemoryText,
  isSafeReference,
  safeInteger,
} from './memorySecurity';

export type MemorySourceType =
  | 'explicit_user_statement'
  | 'explicit_user_memory_request'
  | 'conversation_reference'
  | 'project_reference'
  | 'imported_user_data';

export type MemoryCandidate =
  Readonly<{
    protocolVersion: '1.0';
    candidateId: string;
    accountId: string;
    policyId: string;
    policyRevision: number;
    category: MemoryCategory;
    content: string;
    topicTags: readonly string[];
    sourceType: MemorySourceType;
    sourceRef: string;
    explicitApprovalId: string;
    createdAtMs: number;
    requestedRetentionMs:
      number | null;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsToolAuthority: false;
  }>;

const KEYS = new Set([
  'protocolVersion',
  'candidateId',
  'accountId',
  'policyId',
  'policyRevision',
  'category',
  'content',
  'topicTags',
  'sourceType',
  'sourceRef',
  'explicitApprovalId',
  'createdAtMs',
  'requestedRetentionMs',
  'grantsExecutionAuthority',
  'grantsSensorAuthority',
  'grantsToolAuthority',
]);

const SOURCES =
  new Set([
    'explicit_user_statement',
    'explicit_user_memory_request',
    'conversation_reference',
    'project_reference',
    'imported_user_data',
  ]);

function normalizeTag(
  value: unknown,
): string | null {
  if (
    typeof value !== 'string'
    || value.length < 1
    || value.length > 80
    || /[\u0000-\u001F\u007F]/
      .test(value)
  ) {
    return null;
  }

  const normalized =
    value
      .normalize('NFKC')
      .trim()
      .toLowerCase();

  if (
    normalized.length < 1
    || normalized.length > 80
    || !isSafeMemoryText(
      normalized,
      80,
    )
  ) {
    return null;
  }

  return normalized;
}

function parseTags(
  value: unknown,
): readonly string[] | null {
  if (
    !Array.isArray(value)
    || value.length > 32
  ) {
    return null;
  }

  const tags:
    string[] = [];

  for (const entry of value) {
    const normalized =
      normalizeTag(entry);

    if (!normalized) {
      return null;
    }

    tags.push(normalized);
  }

  const unique =
    [...new Set(tags)].sort();

  if (unique.length !== tags.length) {
    return null;
  }

  return freezeStrings(unique);
}

export function parseMemoryCandidate(
  input: unknown,
): MemoryCandidate | null {
  const record =
    exactObject(
      input,
      KEYS,
    );

  if (
    !record
    || record.protocolVersion
      !== '1.0'
    || typeof record.candidateId
      !== 'string'
    || !MEMORY_CANDIDATE_ID.test(
      record.candidateId,
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
    || !isMemoryCategory(
      record.category,
    )
    || !isSafeMemoryText(
      record.content,
      2000,
    )
    || typeof record.sourceType
      !== 'string'
    || !SOURCES.has(
      record.sourceType,
    )
    || !isSafeReference(
      record.sourceRef,
    )
    || typeof record.explicitApprovalId
      !== 'string'
    || !MEMORY_APPROVAL_ID.test(
      record.explicitApprovalId,
    )
    || !safeInteger(
      record.createdAtMs,
    )
    || (
      record.requestedRetentionMs
        !== null
      && (
        !safeInteger(
          record.requestedRetentionMs,
        )
        || (record.requestedRetentionMs as number)
          < 60 * 60 * 1000
        || (record.requestedRetentionMs as number)
          > 10 * 365 * 24
            * 60 * 60 * 1000
      )
    )
    || record.grantsExecutionAuthority
      !== false
    || record.grantsSensorAuthority
      !== false
    || record.grantsToolAuthority
      !== false
  ) {
    return null;
  }

  const topicTags =
    parseTags(record.topicTags);

  if (!topicTags) {
    return null;
  }

  return Object.freeze({
    protocolVersion: '1.0',
    candidateId:
      record.candidateId,
    accountId:
      record.accountId,
    policyId:
      record.policyId,
    policyRevision:
      (record.policyRevision as number),
    category:
      record.category,
    content:
      record.content,
    topicTags,
    sourceType:
      (record.sourceType as MemorySourceType),
    sourceRef:
      record.sourceRef,
    explicitApprovalId:
      record.explicitApprovalId,
    createdAtMs:
      (record.createdAtMs as number),
    requestedRetentionMs:
      (record.requestedRetentionMs as number | null),
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsToolAuthority: false,
  });
}
