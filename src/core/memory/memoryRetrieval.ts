import {
  isMemoryCategory,
  type MemoryCategory,
} from './memoryCategories';

import {
  parseMemoryPolicy,
  type MemoryPolicy,
} from './memoryPolicy';

import {
  isMemoryRecordActive,
  parseMemoryRecord,
  type MemoryRecord,
} from './memoryRecord';

import {
  parseMemoryTopicTags,
} from './memoryTopic';

import {
  ACCOUNT_ID,
  MEMORY_POLICY_ID,
  exactObject,
  freezeStrings,
  safeInteger,
} from './memorySecurity';

export type MemoryRetrievalPurpose =
  | 'interaction_context'
  | 'conversation_reconstruction';

export type MemoryRetrievalRequest =
  Readonly<{
    protocolVersion: '1.0';
    accountId: string;
    policyId: string;
    policyRevision: number;
    purpose:
      MemoryRetrievalPurpose;
    queryTags: readonly string[];
    categories:
      readonly MemoryCategory[];
    maxResults: number;
    maxContextBytes: number;
    requestedAtMs: number;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsToolAuthority: false;
  }>;

export type MemoryRetrievalEntry =
  Readonly<{
    memoryId: string;
    category: MemoryCategory;
    content: string;
    topicTags: readonly string[];
    sourceType:
      MemoryRecord['sourceType'];
    sourceRef: string;
    recordRevision: number;
    updatedAtMs: number;
    relevanceScore: number;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsToolAuthority: false;
  }>;

export type MemoryRetrievalProjection =
  Readonly<{
    protocolVersion: '1.0';
    accountId: string;
    policyId: string;
    policyRevision: number;
    purpose:
      MemoryRetrievalPurpose;
    entries:
      readonly MemoryRetrievalEntry[];
    totalMatched: number;
    contextBytes: number;
    truncated: boolean;
    retrievedAtMs: number;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsToolAuthority: false;
  }>;

export type MemoryRetrievalDecision =
  Readonly<{
    accepted: boolean;
    reason:
      | 'accepted'
      | 'invalid_input'
      | 'invalid_record'
      | 'memory_disabled'
      | 'retrieval_disabled'
      | 'binding_mismatch'
      | 'stale_policy'
      | 'category_denied'
      | 'reconstruction_disabled'
      | 'limit_denied'
      | 'time_invalid';
    projection:
      MemoryRetrievalProjection | null;
  }>;

const REQUEST_KEYS = new Set([
  'protocolVersion',
  'accountId',
  'policyId',
  'policyRevision',
  'purpose',
  'queryTags',
  'categories',
  'maxResults',
  'maxContextBytes',
  'requestedAtMs',
  'grantsExecutionAuthority',
  'grantsSensorAuthority',
  'grantsToolAuthority',
]);

function parseCategories(
  value: unknown,
): readonly MemoryCategory[] | null {
  if (
    !Array.isArray(value)
    || value.length < 1
    || value.length > 8
    || value.some(
      (entry) =>
        !isMemoryCategory(entry),
    )
  ) {
    return null;
  }

  const categories =
    [...new Set(
      value as MemoryCategory[],
    )].sort();

  if (
    categories.length
      !== value.length
  ) {
    return null;
  }

  return freezeStrings(
    categories,
  ) as readonly MemoryCategory[];
}

export function parseMemoryRetrievalRequest(
  input: unknown,
): MemoryRetrievalRequest | null {
  const record =
    exactObject(
      input,
      REQUEST_KEYS,
    );

  if (
    !record
    || record.protocolVersion
      !== '1.0'
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
    || ![
      'interaction_context',
      'conversation_reconstruction',
    ].includes(
      record.purpose as string,
    )
    || !Number.isInteger(
      record.maxResults,
    )
    || (record.maxResults as number)
      < 1
    || (record.maxResults as number)
      > 32
    || !Number.isInteger(
      record.maxContextBytes,
    )
    || (record.maxContextBytes as number)
      < 256
    || (record.maxContextBytes as number)
      > 64 * 1024
    || !safeInteger(
      record.requestedAtMs,
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

  const queryTags =
    parseMemoryTopicTags(
      record.queryTags,
    );
  const categories =
    parseCategories(
      record.categories,
    );

  if (!queryTags || !categories) {
    return null;
  }

  return Object.freeze({
    protocolVersion: '1.0',
    accountId:
      record.accountId,
    policyId:
      record.policyId,
    policyRevision:
      (record.policyRevision as number),
    purpose:
      (record.purpose as MemoryRetrievalPurpose),
    queryTags,
    categories,
    maxResults:
      (record.maxResults as number),
    maxContextBytes:
      (record.maxContextBytes as number),
    requestedAtMs:
      (record.requestedAtMs as number),
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsToolAuthority: false,
  });
}

function reject(
  reason:
    Exclude<
      MemoryRetrievalDecision[
        'reason'
      ],
      'accepted'
    >,
): MemoryRetrievalDecision {
  return Object.freeze({
    accepted: false,
    reason,
    projection: null,
  });
}

function utf8ByteLength(
  value: string,
): number {
  let bytes = 0;

  for (const symbol of value) {
    const codePoint =
      symbol.codePointAt(0)
      ?? 0;

    if (codePoint <= 0x7f) {
      bytes += 1;
    } else if (
      codePoint <= 0x7ff
    ) {
      bytes += 2;
    } else if (
      codePoint <= 0xffff
    ) {
      bytes += 3;
    } else {
      bytes += 4;
    }
  }

  return bytes;
}

function relevanceScore(
  queryTags:
    readonly string[],
  record:
    MemoryRecord,
): number {
  const recordTags =
    new Set(record.topicTags);

  return queryTags.reduce(
    (score, tag) =>
      score
      + (
        recordTags.has(tag)
          ? 1
          : 0
      ),
    0,
  );
}

function projectEntry(
  record: MemoryRecord,
  score: number,
): MemoryRetrievalEntry {
  return Object.freeze({
    memoryId:
      record.memoryId,
    category:
      record.category,
    content:
      record.content,
    topicTags:
      record.topicTags,
    sourceType:
      record.sourceType,
    sourceRef:
      record.sourceRef,
    recordRevision:
      record.revision,
    updatedAtMs:
      record.updatedAtMs,
    relevanceScore:
      score,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsToolAuthority: false,
  });
}

function entryBytes(
  entry: MemoryRetrievalEntry,
): number {
  return utf8ByteLength(
    JSON.stringify(entry),
  );
}

function currentPolicyAllows(
  policy: MemoryPolicy,
  record: MemoryRecord,
): boolean {
  return (
    record.policyId
      === policy.policyId
    && record.policyRevision
      <= policy.revision
    && policy.allowedCategories
      .includes(record.category)
  );
}

export function retrieveMemories(
  input: {
    policy: unknown;
    request: unknown;
    records:
      readonly unknown[];
    trustedNowMs: number;
  },
): MemoryRetrievalDecision {
  const policy =
    parseMemoryPolicy(
      input.policy,
    );
  const request =
    parseMemoryRetrievalRequest(
      input.request,
    );

  if (
    !policy
    || !request
    || !Array.isArray(input.records)
    || input.records.length > 4096
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

  if (!policy.retrievalEnabled) {
    return reject(
      'retrieval_disabled',
    );
  }

  if (
    request.accountId
      !== policy.accountId
    || request.policyId
      !== policy.policyId
  ) {
    return reject(
      'binding_mismatch',
    );
  }

  if (
    request.policyRevision
      !== policy.revision
  ) {
    return reject(
      'stale_policy',
    );
  }

  if (
    request.categories.some(
      (category) =>
        !policy.allowedCategories
          .includes(category),
    )
  ) {
    return reject(
      'category_denied',
    );
  }

  if (
    request.purpose
      === 'conversation_reconstruction'
    && !policy
      .conversationReconstructionEnabled
  ) {
    return reject(
      'reconstruction_disabled',
    );
  }

  if (
    request.maxResults
      > policy.maxRetrievalCount
    || request.maxContextBytes
      > policy.maxContextBytes
  ) {
    return reject(
      'limit_denied',
    );
  }

  if (
    request.requestedAtMs
      > input.trustedNowMs
    || request.requestedAtMs
      < policy.updatedAtMs
  ) {
    return reject(
      'time_invalid',
    );
  }

  const records:
    MemoryRecord[] = [];

  for (const value of input.records) {
    const parsed =
      parseMemoryRecord(value);

    if (!parsed) {
      return reject(
        'invalid_record',
      );
    }

    if (
      parsed.accountId
        !== policy.accountId
    ) {
      continue;
    }

    if (
      parsed.policyRevision
        > policy.revision
    ) {
      return reject(
        'invalid_record',
      );
    }

    records.push(parsed);
  }

  const categorySet =
    new Set(
      request.categories,
    );

  const ranked =
    records
      .filter(
        (record) =>
          isMemoryRecordActive(
            record,
            input.trustedNowMs,
          )
          && currentPolicyAllows(
            policy,
            record,
          )
          && categorySet.has(
            record.category,
          ),
      )
      .map(
        (record) => ({
          record,
          score:
            relevanceScore(
              request.queryTags,
              record,
            ),
        }),
      )
      .filter(
        (entry) =>
          entry.score > 0,
      )
      .sort(
        (left, right) =>
          right.score
            - left.score
          || right.record
            .updatedAtMs
            - left.record
              .updatedAtMs
          || left.record
            .memoryId
            .localeCompare(
              right.record.memoryId,
            ),
      );

  const entries:
    MemoryRetrievalEntry[] = [];
  let contextBytes = 0;
  let truncated = false;

  for (const rankedEntry of ranked) {
    if (
      entries.length
        >= request.maxResults
    ) {
      truncated = true;
      break;
    }

    const projection =
      projectEntry(
        rankedEntry.record,
        rankedEntry.score,
      );
    const bytes =
      entryBytes(projection);

    if (
      contextBytes + bytes
        > request.maxContextBytes
    ) {
      truncated = true;
      continue;
    }

    entries.push(projection);
    contextBytes += bytes;
  }

  return Object.freeze({
    accepted: true,
    reason: 'accepted',
    projection:
      Object.freeze({
        protocolVersion: '1.0',
        accountId:
          policy.accountId,
        policyId:
          policy.policyId,
        policyRevision:
          policy.revision,
        purpose:
          request.purpose,
        entries:
          Object.freeze(entries),
        totalMatched:
          ranked.length,
        contextBytes,
        truncated:
          truncated
          || entries.length
            < ranked.length,
        retrievedAtMs:
          input.trustedNowMs,
        grantsExecutionAuthority:
          false,
        grantsSensorAuthority:
          false,
        grantsToolAuthority:
          false,
      }),
  });
}
