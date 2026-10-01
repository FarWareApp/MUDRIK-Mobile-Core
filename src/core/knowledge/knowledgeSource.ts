import {
  ACCOUNT_ID,
  KNOWLEDGE_POLICY_ID,
  KNOWLEDGE_SOURCE_ID,
  SHA256,
  WORKSPACE_ID,
  exactObject,
  isSafeKnowledgeText,
  isSafeReference,
  safeHttpsLocator,
  safeInteger,
  safeProjectLocator,
} from './knowledgeSecurity';

import {
  KNOWLEDGE_SOURCE_KINDS,
  type KnowledgeSourceKind,
} from './knowledgePolicy';

export type KnowledgeProvenanceType =
  | 'publisher_signed'
  | 'official_domain'
  | 'project_owner'
  | 'manual_approved';

export type KnowledgeUsage =
  | 'internal_reference'
  | 'citation_allowed'
  | 'redistribution_allowed';

export type KnowledgeLicense =
  Readonly<{
    licenseId: string | null;
    usage: KnowledgeUsage;
    attributionRequired: boolean;
  }>;

export type KnowledgeSourceInput =
  Readonly<{
    protocolVersion: '1.0';
    sourceId: string;
    accountId: string;
    workspaceId: string;
    policyId: string;
    policyRevision: number;
    sourceKind: KnowledgeSourceKind;
    canonicalLocator: string;
    publisher: string;
    provenanceType:
      KnowledgeProvenanceType;
    provenanceRef: string;
    official: boolean;
    version: string;
    revision: number;
    observedAtMs: number;
    validUntilMs: number | null;
    license: KnowledgeLicense;
    content: string;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

export type KnowledgeSourceRevision =
  Readonly<{
    protocolVersion: '1.0';
    sourceId: string;
    accountId: string;
    workspaceId: string;
    policyId: string;
    policyRevision: number;
    sourceKind: KnowledgeSourceKind;
    canonicalLocator: string;
    publisher: string;
    provenanceType:
      KnowledgeProvenanceType;
    provenanceRef: string;
    official: boolean;
    version: string;
    revision: number;
    contentDigest: string;
    contentBytes: number;
    observedAtMs: number;
    validUntilMs: number | null;
    license: KnowledgeLicense;
    state:
      | 'active'
      | 'superseded'
      | 'revoked'
      | 'deleted';
    supersededByRevision:
      number | null;
    indexedAtMs: number;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

const LICENSE_KEYS =
  new Set([
    'licenseId',
    'usage',
    'attributionRequired',
  ]);

const INPUT_KEYS =
  new Set([
    'protocolVersion',
    'sourceId',
    'accountId',
    'workspaceId',
    'policyId',
    'policyRevision',
    'sourceKind',
    'canonicalLocator',
    'publisher',
    'provenanceType',
    'provenanceRef',
    'official',
    'version',
    'revision',
    'observedAtMs',
    'validUntilMs',
    'license',
    'content',
    'grantsExecutionAuthority',
    'grantsSensorAuthority',
    'grantsApprovalAuthority',
    'grantsCapabilityAuthority',
  ]);

const REVISION_KEYS =
  new Set([
    'protocolVersion',
    'sourceId',
    'accountId',
    'workspaceId',
    'policyId',
    'policyRevision',
    'sourceKind',
    'canonicalLocator',
    'publisher',
    'provenanceType',
    'provenanceRef',
    'official',
    'version',
    'revision',
    'contentDigest',
    'contentBytes',
    'observedAtMs',
    'validUntilMs',
    'license',
    'state',
    'supersededByRevision',
    'indexedAtMs',
    'grantsExecutionAuthority',
    'grantsSensorAuthority',
    'grantsApprovalAuthority',
    'grantsCapabilityAuthority',
  ]);

const PROVENANCE =
  new Set([
    'publisher_signed',
    'official_domain',
    'project_owner',
    'manual_approved',
  ]);

const USAGE =
  new Set([
    'internal_reference',
    'citation_allowed',
    'redistribution_allowed',
  ]);

const STATES =
  new Set([
    'active',
    'superseded',
    'revoked',
    'deleted',
  ]);

const WEB_KINDS =
  new Set<KnowledgeSourceKind>([
    'official_docs',
    'first_party_spec',
    'approved_web',
  ]);

function parseLicense(
  value: unknown,
): KnowledgeLicense | null {
  const record =
    exactObject(
      value,
      LICENSE_KEYS,
    );

  if (
    !record
    || (
      record.licenseId !== null
      && !isSafeReference(
        record.licenseId,
        160,
      )
    )
    || typeof record.usage
      !== 'string'
    || !USAGE.has(record.usage)
    || typeof record
      .attributionRequired
      !== 'boolean'
  ) {
    return null;
  }

  return Object.freeze({
    licenseId:
      record.licenseId as string | null,
    usage:
      record.usage as KnowledgeUsage,
    attributionRequired:
      record.attributionRequired as boolean,
  });
}

function normalizeLocator(
  kind: KnowledgeSourceKind,
  value: unknown,
): string | null {
  if (WEB_KINDS.has(kind)) {
    return (
      safeHttpsLocator(value)
        ?.canonical
      ?? null
    );
  }

  return safeProjectLocator(value);
}

function baseValid(
  record:
    Record<string, unknown>,
): {
  license: KnowledgeLicense;
  locator: string;
} | null {
  const kind =
    record.sourceKind;

  if (
    record.protocolVersion !== '1.0'
    || typeof record.sourceId
      !== 'string'
    || !KNOWLEDGE_SOURCE_ID.test(
      record.sourceId,
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
    || typeof record.policyId
      !== 'string'
    || !KNOWLEDGE_POLICY_ID.test(
      record.policyId,
    )
    || !safeInteger(
      record.policyRevision,
    )
    || (record.policyRevision as number)
      < 1
    || typeof kind !== 'string'
    || !(KNOWLEDGE_SOURCE_KINDS as readonly string[])
      .includes(kind)
    || !isSafeKnowledgeText(
      record.publisher,
      240,
    )
    || typeof record.provenanceType
      !== 'string'
    || !PROVENANCE.has(
      record.provenanceType,
    )
    || !isSafeReference(
      record.provenanceRef,
      240,
    )
    || typeof record.official
      !== 'boolean'
    || !isSafeReference(
      record.version,
      128,
    )
    || !safeInteger(
      record.revision,
    )
    || (record.revision as number)
      < 1
    || !safeInteger(
      record.observedAtMs,
    )
    || (
      record.validUntilMs !== null
      && (
        !safeInteger(
          record.validUntilMs,
        )
        || (record.validUntilMs as number)
          <= (record.observedAtMs as number)
      )
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

  const sourceKind =
    kind as KnowledgeSourceKind;
  const locator =
    normalizeLocator(
      sourceKind,
      record.canonicalLocator,
    );
  const license =
    parseLicense(record.license);

  if (!locator || !license) {
    return null;
  }

  if (
    record.official === true
    && (
      ![
        'official_docs',
        'first_party_spec',
      ].includes(sourceKind)
      || ![
        'publisher_signed',
        'official_domain',
      ].includes(
        record.provenanceType as string,
      )
    )
  ) {
    return null;
  }

  return {
    license,
    locator,
  };
}

export function parseKnowledgeSourceInput(
  input: unknown,
): KnowledgeSourceInput | null {
  const record =
    exactObject(input, INPUT_KEYS);

  if (!record) {
    return null;
  }

  const base = baseValid(record);

  if (
    !base
    || !isSafeKnowledgeText(
      record.content,
      16 * 1024 * 1024,
    )
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
    policyId:
      record.policyId as string,
    policyRevision:
      record.policyRevision as number,
    sourceKind:
      record.sourceKind as KnowledgeSourceKind,
    canonicalLocator:
      base.locator,
    publisher:
      record.publisher as string,
    provenanceType:
      record.provenanceType as KnowledgeProvenanceType,
    provenanceRef:
      record.provenanceRef as string,
    official:
      record.official as boolean,
    version:
      record.version as string,
    revision:
      record.revision as number,
    observedAtMs:
      record.observedAtMs as number,
    validUntilMs:
      record.validUntilMs as number | null,
    license: base.license,
    content:
      record.content as string,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}

export function parseKnowledgeSourceRevision(
  input: unknown,
): KnowledgeSourceRevision | null {
  const record =
    exactObject(
      input,
      REVISION_KEYS,
    );

  if (!record) {
    return null;
  }

  const base = baseValid(record);

  if (
    !base
    || typeof record.contentDigest
      !== 'string'
    || !SHA256.test(
      record.contentDigest,
    )
    || !safeInteger(
      record.contentBytes,
    )
    || (record.contentBytes as number)
      < 1
    || (record.contentBytes as number)
      > 16 * 1024 * 1024
    || typeof record.state
      !== 'string'
    || !STATES.has(record.state)
    || (
      record.state === 'superseded'
      && (
        !safeInteger(
          record.supersededByRevision,
        )
        || (record.supersededByRevision as number)
          <= (record.revision as number)
      )
    )
    || (
      record.state !== 'superseded'
      && record.supersededByRevision
        !== null
    )
    || !safeInteger(
      record.indexedAtMs,
    )
    || (record.indexedAtMs as number)
      < (record.observedAtMs as number)
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
    policyId:
      record.policyId as string,
    policyRevision:
      record.policyRevision as number,
    sourceKind:
      record.sourceKind as KnowledgeSourceKind,
    canonicalLocator:
      base.locator,
    publisher:
      record.publisher as string,
    provenanceType:
      record.provenanceType as KnowledgeProvenanceType,
    provenanceRef:
      record.provenanceRef as string,
    official:
      record.official as boolean,
    version:
      record.version as string,
    revision:
      record.revision as number,
    contentDigest:
      record.contentDigest as string,
    contentBytes:
      record.contentBytes as number,
    observedAtMs:
      record.observedAtMs as number,
    validUntilMs:
      record.validUntilMs as number | null,
    license: base.license,
    state:
      record.state as KnowledgeSourceRevision['state'],
    supersededByRevision:
      record.supersededByRevision as number | null,
    indexedAtMs:
      record.indexedAtMs as number,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}

export function sourceDomain(
  source:
    Pick<
      KnowledgeSourceRevision,
      'sourceKind' |
      'canonicalLocator'
    >,
): string | null {
  if (!WEB_KINDS.has(
    source.sourceKind,
  )) {
    return null;
  }

  return (
    safeHttpsLocator(
      source.canonicalLocator,
    )?.domain
    ?? null
  );
}
