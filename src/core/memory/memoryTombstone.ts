import {
  ACCOUNT_ID,
  MEMORY_ID,
  exactObject,
  safeInteger,
} from './memorySecurity';

export type MemoryDeletionReason =
  | 'user_deleted'
  | 'policy_removed'
  | 'source_deleted'
  | 'retention_expired';

export type MemoryTombstone =
  Readonly<{
    protocolVersion: '1.0';
    memoryId: string;
    accountId: string;
    deletedRevision: number;
    deletedAtMs: number;
    reason: MemoryDeletionReason;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsToolAuthority: false;
  }>;

const KEYS = new Set([
  'protocolVersion',
  'memoryId',
  'accountId',
  'deletedRevision',
  'deletedAtMs',
  'reason',
  'grantsExecutionAuthority',
  'grantsSensorAuthority',
  'grantsToolAuthority',
]);

const REASONS =
  new Set([
    'user_deleted',
    'policy_removed',
    'source_deleted',
    'retention_expired',
  ]);

export function parseMemoryTombstone(
  input: unknown,
): MemoryTombstone | null {
  const record =
    exactObject(
      input,
      KEYS,
    );

  if (
    !record
    || record.protocolVersion
      !== '1.0'
    || typeof record.memoryId
      !== 'string'
    || !MEMORY_ID.test(
      record.memoryId,
    )
    || typeof record.accountId
      !== 'string'
    || !ACCOUNT_ID.test(
      record.accountId,
    )
    || !safeInteger(
      record.deletedRevision,
    )
    || (record.deletedRevision as number)
      < 1
    || !safeInteger(
      record.deletedAtMs,
    )
    || typeof record.reason
      !== 'string'
    || !REASONS.has(
      record.reason,
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

  return Object.freeze({
    protocolVersion: '1.0',
    memoryId:
      record.memoryId,
    accountId:
      record.accountId,
    deletedRevision:
      (record.deletedRevision as number),
    deletedAtMs:
      (record.deletedAtMs as number),
    reason:
      (record.reason as MemoryDeletionReason),
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsToolAuthority: false,
  });
}
