import {
  ACCOUNT_ID,
  KNOWLEDGE_POLICY_ID,
  KNOWLEDGE_QUERY_ID,
  KNOWLEDGE_SOURCE_ID,
  WORKSPACE_ID,
  exactObject,
  isSafeReference,
  safeInteger,
} from './knowledgeSecurity';

export type KnowledgeAuditKind =
  | 'policy_updated'
  | 'source_ingested'
  | 'source_rejected'
  | 'source_deleted'
  | 'source_revoked'
  | 'query_completed'
  | 'query_denied'
  | 'snapshot_restored'
  | 'snapshot_rejected';

export type KnowledgeAuditEvent =
  Readonly<{
    protocolVersion: '1.0';
    eventId: string;
    kind: KnowledgeAuditKind;
    accountId: string;
    workspaceId: string;
    policyId: string | null;
    sourceId: string | null;
    queryId: string | null;
    reasonCode: string;
    occurredAtMs: number;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

const EVENT_ID =
  /^knowledge_event_[a-z0-9][a-z0-9_-]{15,127}$/;

const REASON =
  /^[a-z][a-z0-9_-]{0,95}$/;

const KINDS =
  new Set<KnowledgeAuditKind>([
    'policy_updated',
    'source_ingested',
    'source_rejected',
    'source_deleted',
    'source_revoked',
    'query_completed',
    'query_denied',
    'snapshot_restored',
    'snapshot_rejected',
  ]);

const KEYS =
  new Set([
    'protocolVersion',
    'eventId',
    'kind',
    'accountId',
    'workspaceId',
    'policyId',
    'sourceId',
    'queryId',
    'reasonCode',
    'occurredAtMs',
    'grantsExecutionAuthority',
    'grantsSensorAuthority',
    'grantsApprovalAuthority',
    'grantsCapabilityAuthority',
  ]);

export function parseKnowledgeAuditEvent(
  input: unknown,
): KnowledgeAuditEvent | null {
  const record =
    exactObject(input, KEYS);

  if (
    !record
    || record.protocolVersion
      !== '1.0'
    || typeof record.eventId
      !== 'string'
    || !EVENT_ID.test(
      record.eventId,
    )
    || typeof record.kind
      !== 'string'
    || !KINDS.has(
      record.kind as KnowledgeAuditKind,
    )
    || typeof record.accountId
      !== 'string'
    || !ACCOUNT_ID.test(
      record.accountId,
    )
    || typeof record.workspaceId
      !== 'string'
    || !WORKSPACE_ID.test(
      record.workspaceId,
    )
    || (
      record.policyId !== null
      && (
        typeof record.policyId
          !== 'string'
        || !KNOWLEDGE_POLICY_ID.test(
          record.policyId,
        )
      )
    )
    || (
      record.sourceId !== null
      && (
        typeof record.sourceId
          !== 'string'
        || !KNOWLEDGE_SOURCE_ID.test(
          record.sourceId,
        )
      )
    )
    || (
      record.queryId !== null
      && (
        typeof record.queryId
          !== 'string'
        || !KNOWLEDGE_QUERY_ID.test(
          record.queryId,
        )
      )
    )
    || typeof record.reasonCode
      !== 'string'
    || !REASON.test(
      record.reasonCode,
    )
    || !safeInteger(
      record.occurredAtMs,
    )
    || record.grantsExecutionAuthority
      !== false
    || record.grantsSensorAuthority
      !== false
    || record.grantsApprovalAuthority
      !== false
    || record.grantsCapabilityAuthority
      !== false
  ) {
    return null;
  }

  return Object.freeze({
    protocolVersion: '1.0',
    eventId:
      record.eventId as string,
    kind:
      record.kind as
        KnowledgeAuditKind,
    accountId:
      record.accountId as string,
    workspaceId:
      record.workspaceId as string,
    policyId:
      record.policyId as
        string | null,
    sourceId:
      record.sourceId as
        string | null,
    queryId:
      record.queryId as
        string | null,
    reasonCode:
      record.reasonCode as string,
    occurredAtMs:
      record.occurredAtMs as number,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}

export function createKnowledgeAuditEvent(
  input: Omit<
    KnowledgeAuditEvent,
    | 'protocolVersion'
    | 'grantsExecutionAuthority'
    | 'grantsSensorAuthority'
    | 'grantsApprovalAuthority'
    | 'grantsCapabilityAuthority'
  >,
): KnowledgeAuditEvent | null {
  return parseKnowledgeAuditEvent({
    protocolVersion: '1.0',
    ...input,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}

export function isSafeKnowledgeAuditReference(
  value: unknown,
): boolean {
  return (
    value === null
    || isSafeReference(
      value,
      240,
    )
  );
}
