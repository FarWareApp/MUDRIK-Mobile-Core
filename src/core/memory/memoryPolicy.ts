import {
  MEMORY_CATEGORIES,
  isMemoryCategory,
  type MemoryCategory,
} from './memoryCategories';

import {
  ACCOUNT_ID,
  MEMORY_POLICY_ID,
  exactObject,
  freezeStrings,
  isPlainObject,
  safeInteger,
} from './memorySecurity';

export type MemoryPolicyMode =
  | 'disabled'
  | 'explicit_only';

export type MemoryRetentionValue =
  number | null;

export type MemoryPolicy =
  Readonly<{
    protocolVersion: '1.0';
    policyId: string;
    accountId: string;
    mode: MemoryPolicyMode;
    allowedCategories:
      readonly MemoryCategory[];
    defaultRetentionMs:
      MemoryRetentionValue;
    categoryRetentionMs:
      Readonly<
        Partial<
          Record<
            MemoryCategory,
            MemoryRetentionValue
          >
        >
      >;
    retrievalEnabled: boolean;
    maxRetrievalCount: number;
    maxContextBytes: number;
    conversationReconstructionEnabled:
      boolean;
    revision: number;
    updatedAtMs: number;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsToolAuthority: false;
  }>;

const KEYS = new Set([
  'protocolVersion',
  'policyId',
  'accountId',
  'mode',
  'allowedCategories',
  'defaultRetentionMs',
  'categoryRetentionMs',
  'retrievalEnabled',
  'maxRetrievalCount',
  'maxContextBytes',
  'conversationReconstructionEnabled',
  'revision',
  'updatedAtMs',
  'grantsExecutionAuthority',
  'grantsSensorAuthority',
  'grantsToolAuthority',
]);

const RETENTION_MIN_MS =
  60 * 60 * 1000;

const RETENTION_MAX_MS =
  10 * 365 * 24 * 60 * 60 * 1000;

function validRetention(
  value: unknown,
): value is MemoryRetentionValue {
  return (
    value === null
    || (
      safeInteger(value)
      && value >= RETENTION_MIN_MS
      && value <= RETENTION_MAX_MS
    )
  );
}

function parseCategories(
  value: unknown,
): readonly MemoryCategory[] | null {
  if (
    !Array.isArray(value)
    || value.length
      > MEMORY_CATEGORIES.length
    || value.some(
      (entry) =>
        !isMemoryCategory(entry),
    )
  ) {
    return null;
  }

  const unique =
    [...new Set(
      value as MemoryCategory[],
    )].sort();

  if (unique.length !== value.length) {
    return null;
  }

  return freezeStrings(
    unique,
  ) as readonly MemoryCategory[];
}

function parseRetentionOverrides(
  value: unknown,
): Readonly<
  Partial<
    Record<
      MemoryCategory,
      MemoryRetentionValue
    >
  >
> | null {
  if (!isPlainObject(value)) {
    return null;
  }

  const result:
    Partial<
      Record<
        MemoryCategory,
        MemoryRetentionValue
      >
    > = {};

  for (
    const [
      key,
      retention,
    ] of Object.entries(value)
  ) {
    if (
      !isMemoryCategory(key)
      || !validRetention(retention)
    ) {
      return null;
    }

    result[key] = retention;
  }

  return Object.freeze(result);
}

export function parseMemoryPolicy(
  input: unknown,
): MemoryPolicy | null {
  const record =
    exactObject(
      input,
      KEYS,
    );

  if (
    !record
    || record.protocolVersion
      !== '1.0'
    || typeof record.policyId
      !== 'string'
    || !MEMORY_POLICY_ID.test(
      record.policyId,
    )
    || typeof record.accountId
      !== 'string'
    || !ACCOUNT_ID.test(
      record.accountId,
    )
    || ![
      'disabled',
      'explicit_only',
    ].includes(
      record.mode as string,
    )
    || !validRetention(
      record.defaultRetentionMs,
    )
    || typeof record.retrievalEnabled
      !== 'boolean'
    || !Number.isInteger(
      record.maxRetrievalCount,
    )
    || (record.maxRetrievalCount as number)
      < 1
    || (record.maxRetrievalCount as number)
      > 32
    || !Number.isInteger(
      record.maxContextBytes,
    )
    || (record.maxContextBytes as number)
      < 512
    || (record.maxContextBytes as number)
      > 64 * 1024
    || typeof record
      .conversationReconstructionEnabled
      !== 'boolean'
    || !safeInteger(
      record.revision,
    )
    || (record.revision as number)
      < 1
    || !safeInteger(
      record.updatedAtMs,
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

  const allowedCategories =
    parseCategories(
      record.allowedCategories,
    );

  const categoryRetentionMs =
    parseRetentionOverrides(
      record.categoryRetentionMs,
    );

  if (
    !allowedCategories
    || !categoryRetentionMs
  ) {
    return null;
  }

  if (
    record.mode === 'disabled'
    && (
      allowedCategories.length !== 0
      || record.retrievalEnabled
        !== false
      || record
        .conversationReconstructionEnabled
        !== false
    )
  ) {
    return null;
  }

  for (
    const category of
      Object.keys(
        categoryRetentionMs,
      )
  ) {
    if (
      !allowedCategories.includes(
        category as MemoryCategory,
      )
    ) {
      return null;
    }
  }

  return Object.freeze({
    protocolVersion: '1.0',
    policyId:
      record.policyId,
    accountId:
      record.accountId,
    mode:
      (record.mode as MemoryPolicyMode),
    allowedCategories,
    defaultRetentionMs:
      (record.defaultRetentionMs as MemoryRetentionValue),
    categoryRetentionMs,
    retrievalEnabled:
      record.retrievalEnabled,
    maxRetrievalCount:
      (record.maxRetrievalCount as number),
    maxContextBytes:
      (record.maxContextBytes as number),
    conversationReconstructionEnabled:
      record
        .conversationReconstructionEnabled,
    revision:
      (record.revision as number),
    updatedAtMs:
      (record.updatedAtMs as number),
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsToolAuthority: false,
  });
}

export function retentionForCategory(
  policy: MemoryPolicy,
  category: MemoryCategory,
): MemoryRetentionValue {
  return (
    policy.categoryRetentionMs[
      category
    ]
    ?? policy.defaultRetentionMs
  );
}
