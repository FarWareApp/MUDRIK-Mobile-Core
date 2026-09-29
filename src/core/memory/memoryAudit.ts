import {
  ACCOUNT_ID,
  MEMORY_ID,
  MEMORY_POLICY_ID,
  exactObject,
  safeInteger,
} from './memorySecurity';

export type MemoryAuditEventType =
  | 'policy_updated'
  | 'memory_created'
  | 'memory_deleted'
  | 'memory_superseded'
  | 'retrieval_performed'
  | 'retrieval_denied'
  | 'compaction_performed';

export type MemoryAuditEvent =
  Readonly<{
    protocolVersion: '1.0';
    auditId: string;
    accountId: string;
    eventType: MemoryAuditEventType;
    reasonCode: string;
    memoryId: string | null;
    policyId: string | null;
    sourceCount: number | null;
    resultCount: number | null;
    occurredAtMs: number;
    containsPrivateContent: false;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsToolAuthority: false;
  }>;

const AUDIT_ID =
  /^memaudit_[a-z0-9][a-z0-9_-]{15,127}$/;

const REASON_CODE =
  /^[a-z][a-z0-9_-]{0,63}$/;

const EVENT_TYPES =
  new Set<MemoryAuditEventType>([
    'policy_updated',
    'memory_created',
    'memory_deleted',
    'memory_superseded',
    'retrieval_performed',
    'retrieval_denied',
    'compaction_performed',
  ]);

const KEYS = new Set([
  'protocolVersion',
  'auditId',
  'accountId',
  'eventType',
  'reasonCode',
  'memoryId',
  'policyId',
  'sourceCount',
  'resultCount',
  'occurredAtMs',
  'containsPrivateContent',
  'grantsExecutionAuthority',
  'grantsSensorAuthority',
  'grantsToolAuthority',
]);

function boundedCount(
  value: unknown,
): value is number | null {
  return (
    value === null
    || (
      safeInteger(value)
      && (value as number) >= 0
      && (value as number) <= 4096
    )
  );
}

export function parseMemoryAuditEvent(
  input: unknown,
): MemoryAuditEvent | null {
  const record =
    exactObject(input, KEYS);

  if (
    !record
    || record.protocolVersion !== '1.0'
    || typeof record.auditId !== 'string'
    || !AUDIT_ID.test(record.auditId)
    || typeof record.accountId !== 'string'
    || !ACCOUNT_ID.test(record.accountId)
    || typeof record.eventType !== 'string'
    || !EVENT_TYPES.has(
      record.eventType as MemoryAuditEventType,
    )
    || typeof record.reasonCode !== 'string'
    || !REASON_CODE.test(record.reasonCode)
    || (
      record.memoryId !== null
      && (
        typeof record.memoryId !== 'string'
        || !MEMORY_ID.test(record.memoryId)
      )
    )
    || (
      record.policyId !== null
      && (
        typeof record.policyId !== 'string'
        || !MEMORY_POLICY_ID.test(
          record.policyId,
        )
      )
    )
    || !boundedCount(record.sourceCount)
    || !boundedCount(record.resultCount)
    || !safeInteger(record.occurredAtMs)
    || record.containsPrivateContent !== false
    || record.grantsExecutionAuthority !== false
    || record.grantsSensorAuthority !== false
    || record.grantsToolAuthority !== false
  ) {
    return null;
  }

  return Object.freeze({
    protocolVersion: '1.0',
    auditId: record.auditId,
    accountId: record.accountId,
    eventType:
      record.eventType as MemoryAuditEventType,
    reasonCode: record.reasonCode,
    memoryId:
      record.memoryId as string | null,
    policyId:
      record.policyId as string | null,
    sourceCount:
      record.sourceCount as number | null,
    resultCount:
      record.resultCount as number | null,
    occurredAtMs:
      record.occurredAtMs as number,
    containsPrivateContent: false,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsToolAuthority: false,
  });
}

export type MemoryAuditEventInput =
  Readonly<{
    auditId: string;
    accountId: string;
    eventType:
      MemoryAuditEventType;
    reasonCode: string;
    memoryId: string | null;
    policyId: string | null;
    sourceCount: number | null;
    resultCount: number | null;
    occurredAtMs: number;
  }>;

export interface MemoryAuditSink {
  append(
    event: MemoryAuditEvent,
  ): void | Promise<void>;
}

export function createMemoryAuditEvent(
  input: MemoryAuditEventInput,
): MemoryAuditEvent | null {
  return parseMemoryAuditEvent({
    protocolVersion: '1.0',
    auditId: input.auditId,
    accountId: input.accountId,
    eventType: input.eventType,
    reasonCode: input.reasonCode,
    memoryId: input.memoryId,
    policyId: input.policyId,
    sourceCount: input.sourceCount,
    resultCount: input.resultCount,
    occurredAtMs:
      input.occurredAtMs,
    containsPrivateContent: false,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsToolAuthority: false,
  });
}
