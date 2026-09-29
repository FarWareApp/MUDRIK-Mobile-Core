import {
  parseMemoryPolicy,
} from './memoryPolicy';

import {
  isMemoryRecordActive,
  parseMemoryRecord,
  type MemoryRecord,
} from './memoryRecord';

import {
  ACCOUNT_ID,
  exactObject,
  safeInteger,
} from './memorySecurity';

export type MemoryCompactionState =
  | 'consistent'
  | 'conflict';

export type MemoryCompactionSource =
  Readonly<{
    memoryId: string;
    revision: number;
    content: string;
    updatedAtMs: number;
  }>;

export type MemoryCompactionGroup =
  Readonly<{
    category: MemoryRecord['category'];
    topicTags: readonly string[];
    state: MemoryCompactionState;
    sources:
      readonly MemoryCompactionSource[];
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsToolAuthority: false;
  }>;

export type MemoryCompactionProjection =
  Readonly<{
    protocolVersion: '1.0';
    accountId: string;
    policyId: string;
    policyRevision: number;
    groups:
      readonly MemoryCompactionGroup[];
    sourceCount: number;
    truncated: boolean;
    generatedAtMs: number;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsToolAuthority: false;
  }>;

const REQUEST_KEYS = new Set([
  'accountId',
  'maxGroups',
  'maxBytes',
  'trustedNowMs',
]);

function utf8Bytes(
  value: string,
): number {
  return new TextEncoder()
    .encode(value)
    .byteLength;
}

function groupKey(
  record: MemoryRecord,
): string {
  return JSON.stringify([
    record.category,
    record.topicTags,
  ]);
}

function source(
  record: MemoryRecord,
): MemoryCompactionSource {
  return Object.freeze({
    memoryId: record.memoryId,
    revision: record.revision,
    content: record.content,
    updatedAtMs: record.updatedAtMs,
  });
}

export function compactMemories(
  input: {
    policy: unknown;
    records: readonly unknown[];
    request: unknown;
  },
): MemoryCompactionProjection | null {
  const policy =
    parseMemoryPolicy(input.policy);
  const request =
    exactObject(
      input.request,
      REQUEST_KEYS,
    );

  if (
    !policy
    || !request
    || !Array.isArray(input.records)
    || input.records.length > 4096
    || typeof request.accountId !== 'string'
    || !ACCOUNT_ID.test(request.accountId)
    || request.accountId !== policy.accountId
    || !safeInteger(request.maxGroups)
    || (request.maxGroups as number) < 1
    || (request.maxGroups as number) > 256
    || !safeInteger(request.maxBytes)
    || (request.maxBytes as number) < 1024
    || (request.maxBytes as number)
      > policy.maxContextBytes
    || !safeInteger(request.trustedNowMs)
    || policy.mode === 'disabled'
    || !policy.retrievalEnabled
  ) {
    return null;
  }

  const active: MemoryRecord[] = [];

  for (const value of input.records) {
    const record =
      parseMemoryRecord(value);

    if (!record) {
      return null;
    }

    if (
      record.accountId
        !== policy.accountId
    ) {
      continue;
    }

    if (
      record.policyRevision
        > policy.revision
      || !policy.allowedCategories
        .includes(record.category)
    ) {
      return null;
    }

    if (
      isMemoryRecordActive(
        record,
        request.trustedNowMs as number,
      )
    ) {
      active.push(record);
    }
  }

  active.sort(
    (left, right) =>
      left.category.localeCompare(
        right.category,
      )
      || JSON.stringify(
        left.topicTags,
      ).localeCompare(
        JSON.stringify(
          right.topicTags,
        ),
      )
      || right.updatedAtMs
        - left.updatedAtMs
      || left.memoryId.localeCompare(
        right.memoryId,
      ),
  );

  const grouped =
    new Map<string, MemoryRecord[]>();

  for (const record of active) {
    const key = groupKey(record);
    const values =
      grouped.get(key) ?? [];
    values.push(record);
    grouped.set(key, values);
  }

  const groups:
    MemoryCompactionGroup[] = [];
  let bytes = 0;
  let truncated = false;

  for (
    const values of grouped.values()
  ) {
    const contents =
      new Set(
        values.map(
          (record) =>
            record.content,
        ),
      );

    const group =
      Object.freeze({
        category:
          values[0].category,
        topicTags:
          values[0].topicTags,
        state:
          (
            contents.size > 1
              ? 'conflict'
              : 'consistent'
          ) as MemoryCompactionState,
        sources:
          Object.freeze(
            values.map(source),
          ),
        grantsExecutionAuthority: false,
        grantsSensorAuthority: false,
        grantsToolAuthority: false,
      });

    const nextBytes =
      utf8Bytes(
        JSON.stringify(group),
      );

    if (
      groups.length
        >= (request.maxGroups as number)
      || bytes + nextBytes
        > (request.maxBytes as number)
    ) {
      truncated = true;
      break;
    }

    groups.push(group);
    bytes += nextBytes;
  }

  return Object.freeze({
    protocolVersion: '1.0',
    accountId: policy.accountId,
    policyId: policy.policyId,
    policyRevision:
      policy.revision,
    groups:
      Object.freeze(groups),
    sourceCount:
      active.length,
    truncated,
    generatedAtMs:
      request.trustedNowMs as number,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsToolAuthority: false,
  });
}
