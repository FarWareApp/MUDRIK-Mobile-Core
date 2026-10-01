import {
  KNOWLEDGE_CHUNK_ID,
  KNOWLEDGE_SOURCE_ID,
  SHA256,
  exactObject,
  isSafeKnowledgeText,
  isSafeReference,
  safeInteger,
} from './knowledgeSecurity';

export type KnowledgeChunk =
  Readonly<{
    protocolVersion: '1.0';
    chunkId: string;
    sourceId: string;
    sourceRevision: number;
    sourceDigest: string;
    ordinal: number;
    charStart: number;
    charEnd: number;
    text: string;
    textDigest: string;
    byteLength: number;
    official: boolean;
    version: string;
    observedAtMs: number;
    validUntilMs: number | null;
    provenanceRef: string;
    licenseId: string | null;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

const KEYS =
  new Set([
    'protocolVersion',
    'chunkId',
    'sourceId',
    'sourceRevision',
    'sourceDigest',
    'ordinal',
    'charStart',
    'charEnd',
    'text',
    'textDigest',
    'byteLength',
    'official',
    'version',
    'observedAtMs',
    'validUntilMs',
    'provenanceRef',
    'licenseId',
    'grantsExecutionAuthority',
    'grantsSensorAuthority',
    'grantsApprovalAuthority',
    'grantsCapabilityAuthority',
  ]);

export function parseKnowledgeChunk(
  input: unknown,
): KnowledgeChunk | null {
  const record =
    exactObject(input, KEYS);

  if (
    !record
    || record.protocolVersion
      !== '1.0'
    || typeof record.chunkId
      !== 'string'
    || !KNOWLEDGE_CHUNK_ID.test(
      record.chunkId,
    )
    || typeof record.sourceId
      !== 'string'
    || !KNOWLEDGE_SOURCE_ID.test(
      record.sourceId,
    )
    || !safeInteger(
      record.sourceRevision,
    )
    || (record.sourceRevision as number)
      < 1
    || typeof record.sourceDigest
      !== 'string'
    || !SHA256.test(
      record.sourceDigest,
    )
    || !safeInteger(
      record.ordinal,
    )
    || !safeInteger(
      record.charStart,
    )
    || !safeInteger(
      record.charEnd,
    )
    || (record.charEnd as number)
      <= (record.charStart as number)
    || !isSafeKnowledgeText(
      record.text,
      64 * 1024,
    )
    || typeof record.textDigest
      !== 'string'
    || !SHA256.test(
      record.textDigest,
    )
    || !safeInteger(
      record.byteLength,
    )
    || (record.byteLength as number)
      < 1
    || (record.byteLength as number)
      > 64 * 1024
    || typeof record.official
      !== 'boolean'
    || !isSafeReference(
      record.version,
      128,
    )
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
    || !isSafeReference(
      record.provenanceRef,
      240,
    )
    || (
      record.licenseId !== null
      && !isSafeReference(
        record.licenseId,
        160,
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

  return Object.freeze({
    protocolVersion: '1.0',
    chunkId:
      record.chunkId as string,
    sourceId:
      record.sourceId as string,
    sourceRevision:
      record.sourceRevision as number,
    sourceDigest:
      record.sourceDigest as string,
    ordinal:
      record.ordinal as number,
    charStart:
      record.charStart as number,
    charEnd:
      record.charEnd as number,
    text:
      record.text as string,
    textDigest:
      record.textDigest as string,
    byteLength:
      record.byteLength as number,
    official:
      record.official as boolean,
    version:
      record.version as string,
    observedAtMs:
      record.observedAtMs as number,
    validUntilMs:
      record.validUntilMs as number | null,
    provenanceRef:
      record.provenanceRef as string,
    licenseId:
      record.licenseId as string | null,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}
