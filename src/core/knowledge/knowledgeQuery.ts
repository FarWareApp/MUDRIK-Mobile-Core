import {
  ACCOUNT_ID,
  KNOWLEDGE_POLICY_ID,
  KNOWLEDGE_QUERY_ID,
  WORKSPACE_ID,
  exactObject,
  isSafeKnowledgeText,
  isSafeReference,
  safeInteger,
} from './knowledgeSecurity';

import {
  KNOWLEDGE_SOURCE_KINDS,
  type KnowledgeSourceKind,
} from './knowledgePolicy';

export type KnowledgeQueryPurpose =
  | 'technical_reference'
  | 'general_reference';

export type KnowledgeQuery =
  Readonly<{
    protocolVersion: '1.0';
    queryId: string;
    accountId: string;
    workspaceId: string;
    policyId: string;
    policyRevision: number;
    purpose:
      KnowledgeQueryPurpose;
    queryText: string;
    sourceKinds:
      readonly KnowledgeSourceKind[];
    requestedVersion:
      string | null;
    requireCurrent: boolean;
    maxResults: number;
    maxProjectionBytes: number;
    requestedAtMs: number;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

const KEYS =
  new Set([
    'protocolVersion',
    'queryId',
    'accountId',
    'workspaceId',
    'policyId',
    'policyRevision',
    'purpose',
    'queryText',
    'sourceKinds',
    'requestedVersion',
    'requireCurrent',
    'maxResults',
    'maxProjectionBytes',
    'requestedAtMs',
    'grantsExecutionAuthority',
    'grantsSensorAuthority',
    'grantsApprovalAuthority',
    'grantsCapabilityAuthority',
  ]);

const PURPOSES =
  new Set<KnowledgeQueryPurpose>([
    'technical_reference',
    'general_reference',
  ]);

export function parseKnowledgeQuery(
  input: unknown,
): KnowledgeQuery | null {
  const record =
    exactObject(input, KEYS);

  if (
    !record
    || record.protocolVersion !== '1.0'
    || typeof record.queryId !== 'string'
    || !KNOWLEDGE_QUERY_ID.test(
      record.queryId,
    )
    || typeof record.accountId !== 'string'
    || !ACCOUNT_ID.test(
      record.accountId,
    )
    || typeof record.workspaceId !== 'string'
    || !WORKSPACE_ID.test(
      record.workspaceId,
    )
    || typeof record.policyId !== 'string'
    || !KNOWLEDGE_POLICY_ID.test(
      record.policyId,
    )
    || !safeInteger(
      record.policyRevision,
    )
    || (record.policyRevision as number) < 1
    || typeof record.purpose !== 'string'
    || !PURPOSES.has(
      record.purpose as KnowledgeQueryPurpose,
    )
    || !isSafeKnowledgeText(
      record.queryText,
      4096,
    )
    || !Array.isArray(
      record.sourceKinds,
    )
    || record.sourceKinds.length < 1
    || record.sourceKinds.length
      > KNOWLEDGE_SOURCE_KINDS.length
    || record.sourceKinds.some(
      (kind) =>
        typeof kind !== 'string'
        || !(KNOWLEDGE_SOURCE_KINDS as readonly string[])
          .includes(kind),
    )
    || new Set(
      record.sourceKinds,
    ).size !== record.sourceKinds.length
    || (
      record.requestedVersion !== null
      && !isSafeReference(
        record.requestedVersion,
        128,
      )
    )
    || typeof record.requireCurrent
      !== 'boolean'
    || !safeInteger(
      record.maxResults,
    )
    || (record.maxResults as number) < 1
    || (record.maxResults as number) > 128
    || !safeInteger(
      record.maxProjectionBytes,
    )
    || (record.maxProjectionBytes as number)
      < 512
    || (record.maxProjectionBytes as number)
      > 4 * 1024 * 1024
    || !safeInteger(
      record.requestedAtMs,
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
    queryId:
      record.queryId as string,
    accountId:
      record.accountId as string,
    workspaceId:
      record.workspaceId as string,
    policyId:
      record.policyId as string,
    policyRevision:
      record.policyRevision as number,
    purpose:
      record.purpose as KnowledgeQueryPurpose,
    queryText:
      record.queryText as string,
    sourceKinds:
      Object.freeze([
        ...record.sourceKinds,
      ]) as readonly KnowledgeSourceKind[],
    requestedVersion:
      record.requestedVersion as string | null,
    requireCurrent:
      record.requireCurrent as boolean,
    maxResults:
      record.maxResults as number,
    maxProjectionBytes:
      record.maxProjectionBytes as number,
    requestedAtMs:
      record.requestedAtMs as number,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}

export function tokenizeKnowledgeQuery(
  text: string,
): readonly string[] {
  const matches =
    text
      .normalize('NFKC')
      .toLowerCase()
      .match(/[\p{L}\p{N}_-]+/gu)
    ?? [];

  return Object.freeze([
    ...new Set(
      matches
        .filter(
          (token) =>
            token.length >= 2
            && token.length <= 64,
        )
        .slice(0, 128),
    ),
  ]);
}
