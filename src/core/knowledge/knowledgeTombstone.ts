import {
  ACCOUNT_ID,
  KNOWLEDGE_SOURCE_ID,
  WORKSPACE_ID,
  exactObject,
  safeInteger,
} from './knowledgeSecurity';

export type KnowledgeTombstoneReason =
  | 'user_deleted'
  | 'source_revoked'
  | 'workspace_deleted'
  | 'source_replaced';

export type KnowledgeTombstone =
  Readonly<{
    protocolVersion: '1.0';
    sourceId: string;
    accountId: string;
    workspaceId: string;
    deletedRevision: number;
    deletedAtMs: number;
    reason:
      KnowledgeTombstoneReason;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

const KEYS =
  new Set([
    'protocolVersion',
    'sourceId',
    'accountId',
    'workspaceId',
    'deletedRevision',
    'deletedAtMs',
    'reason',
    'grantsExecutionAuthority',
    'grantsSensorAuthority',
    'grantsApprovalAuthority',
    'grantsCapabilityAuthority',
  ]);

const REASONS =
  new Set<KnowledgeTombstoneReason>([
    'user_deleted',
    'source_revoked',
    'workspace_deleted',
    'source_replaced',
  ]);

export function parseKnowledgeTombstone(
  input: unknown,
): KnowledgeTombstone | null {
  const record =
    exactObject(input, KEYS);

  if (
    !record
    || record.protocolVersion !== '1.0'
    || typeof record.sourceId !== 'string'
    || !KNOWLEDGE_SOURCE_ID.test(
      record.sourceId,
    )
    || typeof record.accountId !== 'string'
    || !ACCOUNT_ID.test(
      record.accountId,
    )
    || typeof record.workspaceId !== 'string'
    || !WORKSPACE_ID.test(
      record.workspaceId,
    )
    || !safeInteger(
      record.deletedRevision,
    )
    || (record.deletedRevision as number) < 1
    || !safeInteger(
      record.deletedAtMs,
    )
    || typeof record.reason !== 'string'
    || !REASONS.has(
      record.reason as KnowledgeTombstoneReason,
    )
    || record.grantsExecutionAuthority !== false
    || record.grantsSensorAuthority !== false
    || record.grantsApprovalAuthority !== false
    || record.grantsCapabilityAuthority !== false
  ) {
    return null;
  }

  return Object.freeze({
    protocolVersion: '1.0',
    sourceId:
      record.sourceId as string,
    accountId:
      record.accountId as string,
    workspaceId:
      record.workspaceId as string,
    deletedRevision:
      record.deletedRevision as number,
    deletedAtMs:
      record.deletedAtMs as number,
    reason:
      record.reason as
        KnowledgeTombstoneReason,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}
