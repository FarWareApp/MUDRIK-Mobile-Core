import {
  ACCOUNT_ID,
  KNOWLEDGE_POLICY_ID,
  WORKSPACE_ID,
  exactObject,
  freezeStrings,
  isSafeReference,
  safeInteger,
} from './knowledgeSecurity';

export const KNOWLEDGE_SOURCE_KINDS =
  Object.freeze([
    'official_docs',
    'first_party_spec',
    'project_docs',
    'repository_docs',
    'approved_web',
  ] as const);

export type KnowledgeSourceKind =
  (typeof KNOWLEDGE_SOURCE_KINDS)[number];

export type KnowledgePolicy =
  Readonly<{
    protocolVersion: '1.0';
    policyId: string;
    accountId: string;
    workspaceId: string;
    enabled: boolean;
    acceptedSourceKinds:
      readonly KnowledgeSourceKind[];
    allowedDomains:
      readonly string[];
    acceptedProvenanceRefs:
      readonly string[];
    preferOfficialSources: boolean;
    requireLicenseMetadata: boolean;
    maxSourceBytes: number;
    maxChunkBytes: number;
    maxChunksPerSource: number;
    maxResults: number;
    maxProjectionBytes: number;
    maxSourceAgeMs: number;
    remoteRefreshAllowed: boolean;
    revision: number;
    updatedAtMs: number;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

const KEYS =
  new Set([
    'protocolVersion',
    'policyId',
    'accountId',
    'workspaceId',
    'enabled',
    'acceptedSourceKinds',
    'allowedDomains',
    'acceptedProvenanceRefs',
    'preferOfficialSources',
    'requireLicenseMetadata',
    'maxSourceBytes',
    'maxChunkBytes',
    'maxChunksPerSource',
    'maxResults',
    'maxProjectionBytes',
    'maxSourceAgeMs',
    'remoteRefreshAllowed',
    'revision',
    'updatedAtMs',
    'grantsExecutionAuthority',
    'grantsSensorAuthority',
    'grantsApprovalAuthority',
    'grantsCapabilityAuthority',
  ]);

function uniqueStrings(
  value: unknown,
  {
    minItems,
    maxItems,
    maxLength,
    normalize,
    validate,
  }: {
    minItems: number;
    maxItems: number;
    maxLength: number;
    normalize?:
      (value: string) => string;
    validate:
      (value: string) => boolean;
  },
): readonly string[] | null {
  if (
    !Array.isArray(value)
    || value.length < minItems
    || value.length > maxItems
  ) {
    return null;
  }

  const normalized =
    value.map((entry) => {
      if (
        typeof entry !== 'string'
        || entry.length < 1
        || entry.length > maxLength
      ) {
        return null;
      }

      const candidate =
        normalize
          ? normalize(entry)
          : entry;

      return validate(candidate)
        ? candidate
        : null;
    });

  if (
    normalized.some(
      (entry) => entry === null,
    )
  ) {
    return null;
  }

  const strings =
    normalized as string[];

  if (
    new Set(strings).size
      !== strings.length
  ) {
    return null;
  }

  return freezeStrings(strings);
}

export function parseKnowledgePolicy(
  input: unknown,
): KnowledgePolicy | null {
  const record =
    exactObject(input, KEYS);

  if (!record) {
    return null;
  }

  const enabled =
    record.enabled === true;

  const kinds =
    uniqueStrings(
      record.acceptedSourceKinds,
      {
        minItems:
          enabled ? 1 : 0,
        maxItems:
          KNOWLEDGE_SOURCE_KINDS.length,
        maxLength: 64,
        validate:
          (value) =>
            (KNOWLEDGE_SOURCE_KINDS as readonly string[])
              .includes(value),
      },
    );

  const domains =
    uniqueStrings(
      record.allowedDomains,
      {
        minItems: 0,
        maxItems: 128,
        maxLength: 253,
        normalize:
          (value) =>
            value.toLowerCase(),
        validate:
          (value) =>
            /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/
              .test(value),
      },
    );

  const provenanceRefs =
    uniqueStrings(
      record.acceptedProvenanceRefs,
      {
        minItems:
          enabled ? 1 : 0,
        maxItems: 128,
        maxLength: 240,
        validate:
          (value) =>
            isSafeReference(
              value,
              240,
            ),
      },
    );

  if (
    record.protocolVersion !== '1.0'
    || typeof record.policyId
      !== 'string'
    || !KNOWLEDGE_POLICY_ID.test(
      record.policyId,
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
    || typeof record.enabled
      !== 'boolean'
    || !kinds
    || !domains
    || !provenanceRefs
    || typeof record
      .preferOfficialSources
      !== 'boolean'
    || typeof record
      .requireLicenseMetadata
      !== 'boolean'
    || !safeInteger(
      record.maxSourceBytes,
    )
    || (record.maxSourceBytes as number)
      < 1024
    || (record.maxSourceBytes as number)
      > 16 * 1024 * 1024
    || !safeInteger(
      record.maxChunkBytes,
    )
    || (record.maxChunkBytes as number)
      < 256
    || (record.maxChunkBytes as number)
      > 64 * 1024
    || (record.maxChunkBytes as number)
      > (record.maxSourceBytes as number)
    || !safeInteger(
      record.maxChunksPerSource,
    )
    || (record.maxChunksPerSource as number)
      < 1
    || (record.maxChunksPerSource as number)
      > 4096
    || !safeInteger(
      record.maxResults,
    )
    || (record.maxResults as number)
      < 1
    || (record.maxResults as number)
      > 128
    || !safeInteger(
      record.maxProjectionBytes,
    )
    || (record.maxProjectionBytes as number)
      < 1024
    || (record.maxProjectionBytes as number)
      > 4 * 1024 * 1024
    || !safeInteger(
      record.maxSourceAgeMs,
    )
    || (record.maxSourceAgeMs as number)
      < 60_000
    || (record.maxSourceAgeMs as number)
      > 365 * 24 * 60 * 60 * 1000
    || typeof record
      .remoteRefreshAllowed
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
    || record.grantsApprovalAuthority
      !== false
    || record.grantsCapabilityAuthority
      !== false
  ) {
    return null;
  }

  if (
    !enabled
    && (
      kinds.length !== 0
      || provenanceRefs.length !== 0
      || record.remoteRefreshAllowed
        !== false
    )
  ) {
    return null;
  }

  return Object.freeze({
    protocolVersion: '1.0',
    policyId:
      record.policyId as string,
    accountId:
      record.accountId as string,
    workspaceId:
      record.workspaceId as string,
    enabled,
    acceptedSourceKinds:
      kinds as readonly KnowledgeSourceKind[],
    allowedDomains: domains,
    acceptedProvenanceRefs:
      provenanceRefs,
    preferOfficialSources:
      record.preferOfficialSources as boolean,
    requireLicenseMetadata:
      record.requireLicenseMetadata as boolean,
    maxSourceBytes:
      record.maxSourceBytes as number,
    maxChunkBytes:
      record.maxChunkBytes as number,
    maxChunksPerSource:
      record.maxChunksPerSource as number,
    maxResults:
      record.maxResults as number,
    maxProjectionBytes:
      record.maxProjectionBytes as number,
    maxSourceAgeMs:
      record.maxSourceAgeMs as number,
    remoteRefreshAllowed:
      record.remoteRefreshAllowed as boolean,
    revision:
      record.revision as number,
    updatedAtMs:
      record.updatedAtMs as number,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}
