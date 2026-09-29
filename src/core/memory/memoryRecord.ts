import {
  isMemoryCategory,
  type MemoryCategory,
} from './memoryCategories';

import type {
  MemorySourceType,
} from './memoryCandidate';

import {
  parseCanonicalMemoryTopicTags,
} from './memoryTopic';

import {
  ACCOUNT_ID,
  MEMORY_APPROVAL_ID,
  MEMORY_CANDIDATE_ID,
  MEMORY_ID,
  MEMORY_POLICY_ID,
  exactObject,
  isSafeMemoryText,
  isSafeReference,
  safeInteger,
} from './memorySecurity';

export type MemoryRecordState =
  | 'active'
  | 'superseded';

export type MemoryRecord =
  Readonly<{
    protocolVersion: '1.0';
    memoryId: string;
    accountId: string;
    category: MemoryCategory;
    content: string;
    topicTags: readonly string[];
    sourceType: MemorySourceType;
    sourceRef: string;
    candidateId: string;
    explicitApprovalId: string;
    policyId: string;
    policyRevision: number;
    createdAtMs: number;
    updatedAtMs: number;
    expiresAtMs: number | null;
    revision: number;
    state: MemoryRecordState;
    supersededByMemoryId:
      string | null;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsToolAuthority: false;
  }>;

const KEYS = new Set([
  'protocolVersion',
  'memoryId',
  'accountId',
  'category',
  'content',
  'topicTags',
  'sourceType',
  'sourceRef',
  'candidateId',
  'explicitApprovalId',
  'policyId',
  'policyRevision',
  'createdAtMs',
  'updatedAtMs',
  'expiresAtMs',
  'revision',
  'state',
  'supersededByMemoryId',
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

export function parseMemoryRecord(
  input: unknown,
): MemoryRecord | null {
  const value =
    exactObject(
      input,
      KEYS,
    );

  if (
    !value
    || value.protocolVersion
      !== '1.0'
    || typeof value.memoryId
      !== 'string'
    || !MEMORY_ID.test(
      value.memoryId,
    )
    || typeof value.accountId
      !== 'string'
    || !ACCOUNT_ID.test(
      value.accountId,
    )
    || !isMemoryCategory(
      value.category,
    )
    || !isSafeMemoryText(
      value.content,
      2000,
    )
    || typeof value.sourceType
      !== 'string'
    || !SOURCES.has(
      value.sourceType,
    )
    || !isSafeReference(
      value.sourceRef,
    )
    || typeof value.candidateId
      !== 'string'
    || !MEMORY_CANDIDATE_ID.test(
      value.candidateId,
    )
    || typeof value.explicitApprovalId
      !== 'string'
    || !MEMORY_APPROVAL_ID.test(
      value.explicitApprovalId,
    )
    || typeof value.policyId
      !== 'string'
    || !MEMORY_POLICY_ID.test(
      value.policyId,
    )
    || !safeInteger(
      value.policyRevision,
    )
    || (value.policyRevision as number)
      < 1
    || !safeInteger(
      value.createdAtMs,
    )
    || !safeInteger(
      value.updatedAtMs,
    )
    || (value.updatedAtMs as number)
      < (value.createdAtMs as number)
    || (
      value.expiresAtMs !== null
      && (
        !safeInteger(
          value.expiresAtMs,
        )
        || (value.expiresAtMs as number)
          <= (value.createdAtMs as number)
      )
    )
    || !safeInteger(
      value.revision,
    )
    || (value.revision as number)
      < 1
    || ![
      'active',
      'superseded',
    ].includes(
      value.state as string,
    )
    || (
      value.supersededByMemoryId
        !== null
      && (
        typeof value
          .supersededByMemoryId
          !== 'string'
        || !MEMORY_ID.test(
          value.supersededByMemoryId,
        )
        || value.supersededByMemoryId
          === value.memoryId
      )
    )
    || (
      value.state === 'active'
      && value.supersededByMemoryId
        !== null
    )
    || (
      value.state === 'superseded'
      && value.supersededByMemoryId
        === null
    )
    || value.grantsExecutionAuthority
      !== false
    || value.grantsSensorAuthority
      !== false
    || value.grantsToolAuthority
      !== false
  ) {
    return null;
  }

  const topicTags =
    parseCanonicalMemoryTopicTags(
      value.topicTags,
    );

  if (!topicTags) {
    return null;
  }

  return Object.freeze({
    protocolVersion: '1.0',
    memoryId:
      value.memoryId,
    accountId:
      value.accountId,
    category:
      value.category,
    content:
      value.content,
    topicTags,
    sourceType:
      (value.sourceType as MemorySourceType),
    sourceRef:
      value.sourceRef,
    candidateId:
      value.candidateId,
    explicitApprovalId:
      value.explicitApprovalId,
    policyId:
      value.policyId,
    policyRevision:
      (value.policyRevision as number),
    createdAtMs:
      (value.createdAtMs as number),
    updatedAtMs:
      (value.updatedAtMs as number),
    expiresAtMs:
      (value.expiresAtMs as number | null),
    revision:
      (value.revision as number),
    state:
      (value.state as MemoryRecordState),
    supersededByMemoryId:
      (value.supersededByMemoryId as string | null),
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsToolAuthority: false,
  });
}

export function isMemoryRecordActive(
  record: MemoryRecord,
  trustedNowMs: number,
): boolean {
  return (
    record.state === 'active'
    && safeInteger(trustedNowMs)
    && (
      record.expiresAtMs === null
      || record.expiresAtMs
        > trustedNowMs
    )
  );
}
