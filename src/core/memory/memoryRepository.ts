import {
  parseMemoryPolicy,
  type MemoryPolicy,
} from './memoryPolicy';

import {
  parseMemoryRecord,
  type MemoryRecord,
} from './memoryRecord';

import {
  parseMemoryTombstone,
  type MemoryTombstone,
} from './memoryTombstone';

import {
  ACCOUNT_ID,
  MEMORY_CANDIDATE_ID,
  MEMORY_ID,
  exactObject,
  safeInteger,
} from './memorySecurity';

export type MemoryCandidateBinding =
  Readonly<{
    candidateId: string;
    memoryId: string;
  }>;

export type MemoryRegistryState =
  Readonly<{
    accountId: string;
    snapshotRevision: number;
    policy: MemoryPolicy;
    records: readonly MemoryRecord[];
    tombstones:
      readonly MemoryTombstone[];
    candidateBindings:
      readonly MemoryCandidateBinding[];
  }>;

export type MemoryDurableSnapshot =
  Readonly<{
    protocolVersion: '1.0';
    accountId: string;
    snapshotRevision: number;
    policy: MemoryPolicy;
    records: readonly MemoryRecord[];
    tombstones:
      readonly MemoryTombstone[];
    candidateBindings:
      readonly MemoryCandidateBinding[];
    integrityDigest: string;
    writtenAtMs: number;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsToolAuthority: false;
  }>;

export type MemoryRepositoryWriteResult =
  Readonly<{
    accepted: boolean;
    reason:
      | 'written'
      | 'duplicate'
      | 'revision_conflict'
      | 'invalid_snapshot'
      | 'storage_failure';
    snapshot:
      MemoryDurableSnapshot | null;
  }>;

export interface MemoryIntegrityProvider {
  digest(
    canonicalPayload: string,
  ): Promise<string>;

  verify(
    canonicalPayload: string,
    digest: string,
  ): Promise<boolean>;
}

export interface MemoryRepository {
  loadAccount(
    accountId: string,
  ): Promise<
    MemoryDurableSnapshot | null
  >;

  compareAndSwap(
    expectedRevision: number | null,
    snapshot:
      MemoryDurableSnapshot,
  ): Promise<
    MemoryRepositoryWriteResult
  >;

  deleteAccount(
    accountId: string,
    expectedRevision: number,
  ): Promise<
    MemoryRepositoryWriteResult
  >;
}

const SHA256 =
  /^[a-f0-9]{64}$/;

const KEYS = new Set([
  'protocolVersion',
  'accountId',
  'snapshotRevision',
  'policy',
  'records',
  'tombstones',
  'candidateBindings',
  'integrityDigest',
  'writtenAtMs',
  'grantsExecutionAuthority',
  'grantsSensorAuthority',
  'grantsToolAuthority',
]);

const BINDING_KEYS = new Set([
  'candidateId',
  'memoryId',
]);

function parseBinding(
  input: unknown,
): MemoryCandidateBinding | null {
  const value =
    exactObject(
      input,
      BINDING_KEYS,
    );

  if (
    !value
    || typeof value.candidateId
      !== 'string'
    || !MEMORY_CANDIDATE_ID.test(
      value.candidateId,
    )
    || typeof value.memoryId
      !== 'string'
    || !MEMORY_ID.test(
      value.memoryId,
    )
  ) {
    return null;
  }

  return Object.freeze({
    candidateId:
      value.candidateId,
    memoryId:
      value.memoryId,
  });
}

export function parseMemoryDurableSnapshot(
  input: unknown,
): MemoryDurableSnapshot | null {
  const root =
    exactObject(
      input,
      KEYS,
    );

  if (
    !root
    || root.protocolVersion
      !== '1.0'
    || typeof root.accountId
      !== 'string'
    || !ACCOUNT_ID.test(
      root.accountId,
    )
    || !safeInteger(
      root.snapshotRevision,
    )
    || (root.snapshotRevision as number)
      < 1
    || !Array.isArray(root.records)
    || root.records.length > 4096
    || !Array.isArray(
      root.tombstones,
    )
    || root.tombstones.length > 4096
    || !Array.isArray(
      root.candidateBindings,
    )
    || root.candidateBindings.length
      > 4096
    || typeof root.integrityDigest
      !== 'string'
    || !SHA256.test(
      root.integrityDigest,
    )
    || !safeInteger(
      root.writtenAtMs,
    )
    || root.grantsExecutionAuthority
      !== false
    || root.grantsSensorAuthority
      !== false
    || root.grantsToolAuthority
      !== false
  ) {
    return null;
  }

  const policy =
    parseMemoryPolicy(root.policy);

  if (
    !policy
    || policy.accountId
      !== root.accountId
  ) {
    return null;
  }

  const records:
    MemoryRecord[] = [];
  const tombstones:
    MemoryTombstone[] = [];
  const bindings:
    MemoryCandidateBinding[] = [];

  const recordIds =
    new Set<string>();
  const tombstoneIds =
    new Set<string>();
  const candidateIds =
    new Set<string>();
  const boundMemoryIds =
    new Set<string>();

  for (const inputRecord of root.records) {
    const record =
      parseMemoryRecord(
        inputRecord,
      );

    if (
      !record
      || record.accountId
        !== root.accountId
      || record.policyId
        !== policy.policyId
      || record.policyRevision
        > policy.revision
      || record.updatedAtMs
        > (root.writtenAtMs as number)
      || recordIds.has(
        record.memoryId,
      )
    ) {
      return null;
    }

    recordIds.add(
      record.memoryId,
    );
    records.push(record);
  }

  for (
    const inputTombstone of
      root.tombstones
  ) {
    const tombstone =
      parseMemoryTombstone(
        inputTombstone,
      );

    if (
      !tombstone
      || tombstone.accountId
        !== root.accountId
      || tombstone.deletedAtMs
        > (root.writtenAtMs as number)
      || tombstoneIds.has(
        tombstone.memoryId,
      )
      || recordIds.has(
        tombstone.memoryId,
      )
    ) {
      return null;
    }

    tombstoneIds.add(
      tombstone.memoryId,
    );
    tombstones.push(tombstone);
  }

  const knownMemoryIds =
    new Set([
      ...recordIds,
      ...tombstoneIds,
    ]);

  for (
    const inputBinding of
      root.candidateBindings
  ) {
    const binding =
      parseBinding(
        inputBinding,
      );

    if (
      !binding
      || candidateIds.has(
        binding.candidateId,
      )
      || boundMemoryIds.has(
        binding.memoryId,
      )
      || !knownMemoryIds.has(
        binding.memoryId,
      )
    ) {
      return null;
    }

    candidateIds.add(
      binding.candidateId,
    );
    boundMemoryIds.add(
      binding.memoryId,
    );
    bindings.push(binding);
  }

  if (
    boundMemoryIds.size
      !== knownMemoryIds.size
  ) {
    return null;
  }

  for (const record of records) {
    const binding =
      bindings.find(
        (entry) =>
          entry.memoryId
            === record.memoryId,
      );

    if (
      !binding
      || binding.candidateId
        !== record.candidateId
    ) {
      return null;
    }
  }

  records.sort(
    (left, right) =>
      left.memoryId.localeCompare(
        right.memoryId,
      ),
  );

  tombstones.sort(
    (left, right) =>
      left.memoryId.localeCompare(
        right.memoryId,
      ),
  );

  bindings.sort(
    (left, right) =>
      left.candidateId.localeCompare(
        right.candidateId,
      ),
  );

  return Object.freeze({
    protocolVersion: '1.0',
    accountId:
      root.accountId,
    snapshotRevision:
      root.snapshotRevision as number,
    policy,
    records:
      Object.freeze(records),
    tombstones:
      Object.freeze(tombstones),
    candidateBindings:
      Object.freeze(bindings),
    integrityDigest:
      root.integrityDigest,
    writtenAtMs:
      root.writtenAtMs as number,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsToolAuthority: false,
  });
}

export function snapshotState(
  snapshot:
    MemoryDurableSnapshot,
): MemoryRegistryState {
  return Object.freeze({
    accountId:
      snapshot.accountId,
    snapshotRevision:
      snapshot.snapshotRevision,
    policy:
      snapshot.policy,
    records:
      snapshot.records,
    tombstones:
      snapshot.tombstones,
    candidateBindings:
      snapshot.candidateBindings,
  });
}

export function validateMemoryRepositoryLoad(
  input: unknown,
  accountId: string,
): MemoryDurableSnapshot | null {
  if (!ACCOUNT_ID.test(accountId)) {
    return null;
  }

  const snapshot =
    parseMemoryDurableSnapshot(
      input,
    );

  if (
    !snapshot
    || snapshot.accountId
      !== accountId
  ) {
    return null;
  }

  return snapshot;
}

const verifiedSnapshots =
  new WeakSet<object>();

function canonicalize(
  value: unknown,
): string {
  if (
    value === null
    || typeof value !== 'object'
  ) {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return (
      '['
      + value.map(canonicalize)
        .join(',')
      + ']'
    );
  }

  const record =
    value as Record<
      string,
      unknown
    >;

  return (
    '{'
    + Object.keys(record)
      .sort()
      .map(
        (key) =>
          JSON.stringify(key)
          + ':'
          + canonicalize(
            record[key],
          ),
      )
      .join(',')
    + '}'
  );
}

function snapshotPayload(
  snapshot:
    Omit<
      MemoryDurableSnapshot,
      'integrityDigest'
    >,
): string {
  return canonicalize(snapshot);
}

export function isVerifiedMemoryDurableSnapshot(
  value: unknown,
): value is MemoryDurableSnapshot {
  return (
    typeof value === 'object'
    && value !== null
    && verifiedSnapshots.has(
      value as object,
    )
  );
}

export async function verifyMemoryDurableSnapshot(
  input: unknown,
  integrityProvider:
    MemoryIntegrityProvider,
): Promise<
  MemoryDurableSnapshot | null
> {
  if (
    !integrityProvider
    || typeof integrityProvider.verify
      !== 'function'
  ) {
    return null;
  }

  const parsed =
    parseMemoryDurableSnapshot(
      input,
    );

  if (!parsed) {
    return null;
  }

  const {
    integrityDigest,
    ...body
  } = parsed;

  let accepted = false;

  try {
    accepted =
      await integrityProvider.verify(
        snapshotPayload(body),
        integrityDigest,
      );
  } catch {
    accepted = false;
  }

  if (!accepted) {
    return null;
  }

  verifiedSnapshots.add(
    parsed as object,
  );

  return parsed;
}

export async function sealMemoryRegistryState(
  state:
    MemoryRegistryState,
  writtenAtMs: number,
  integrityProvider:
    MemoryIntegrityProvider,
): Promise<
  MemoryDurableSnapshot | null
> {
  if (
    !state
    || !ACCOUNT_ID.test(
      state.accountId,
    )
    || !safeInteger(
      state.snapshotRevision,
    )
    || state.snapshotRevision < 1
    || !safeInteger(
      writtenAtMs,
    )
    || !integrityProvider
    || typeof integrityProvider.digest
      !== 'function'
  ) {
    return null;
  }

  const body =
    Object.freeze({
      protocolVersion:
        '1.0' as const,
      accountId:
        state.accountId,
      snapshotRevision:
        state.snapshotRevision,
      policy:
        state.policy,
      records:
        state.records,
      tombstones:
        state.tombstones,
      candidateBindings:
        state.candidateBindings,
      writtenAtMs,
      grantsExecutionAuthority:
        false as const,
      grantsSensorAuthority:
        false as const,
      grantsToolAuthority:
        false as const,
    });

  let integrityDigest: string;

  try {
    integrityDigest =
      await integrityProvider.digest(
        snapshotPayload(body),
      );
  } catch {
    return null;
  }

  if (!SHA256.test(
    integrityDigest,
  )) {
    return null;
  }

  const parsed =
    parseMemoryDurableSnapshot({
      ...body,
      integrityDigest,
    });

  if (!parsed) {
    return null;
  }

  verifiedSnapshots.add(
    parsed as object,
  );

  return parsed;
}
