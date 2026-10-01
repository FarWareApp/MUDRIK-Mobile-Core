import {
  type KnowledgePolicy,
} from './knowledgePolicy';

import {
  parseKnowledgeSourceInput,
  parseKnowledgeSourceRevision,
  type KnowledgeSourceInput,
  type KnowledgeSourceRevision,
} from './knowledgeSource';

import {
  parseKnowledgeChunk,
  type KnowledgeChunk,
} from './knowledgeChunk';

import {
  SHA256,
  normalizeKnowledgeText,
  safeHttpsLocator,
  utf8ByteLength,
} from './knowledgeSecurity';

export interface KnowledgeDigestProvider {
  digest(
    payload: string,
  ): Promise<string> | string;
}

export type KnowledgeIngestionResult =
  Readonly<{
    accepted: boolean;
    reason: string;
    source:
      KnowledgeSourceRevision | null;
    chunks:
      readonly KnowledgeChunk[];
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

function result(
  accepted: boolean,
  reason: string,
  source:
    KnowledgeSourceRevision | null = null,
  chunks:
    readonly KnowledgeChunk[] = [],
): KnowledgeIngestionResult {
  return Object.freeze({
    accepted,
    reason,
    source,
    chunks:
      Object.freeze([
        ...chunks,
      ]),
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}

async function digest(
  provider:
    KnowledgeDigestProvider,
  payload: string,
): Promise<string | null> {
  try {
    const value =
      await provider.digest(payload);

    return (
      typeof value === 'string'
      && SHA256.test(value)
    )
      ? value
      : null;
  } catch {
    return null;
  }
}

function policyAllows(
  policy: KnowledgePolicy,
  source: KnowledgeSourceInput,
  trustedNowMs: number,
): string | null {
  if (!policy.enabled) {
    return 'knowledge_disabled';
  }

  if (
    source.accountId
      !== policy.accountId
    || source.workspaceId
      !== policy.workspaceId
    || source.policyId
      !== policy.policyId
    || source.policyRevision
      !== policy.revision
  ) {
    return 'binding_mismatch';
  }

  if (
    !policy.acceptedSourceKinds
      .includes(
        source.sourceKind,
      )
  ) {
    return 'source_kind_denied';
  }

  if (
    !policy.acceptedProvenanceRefs
      .includes(
        source.provenanceRef,
      )
  ) {
    return 'provenance_denied';
  }

  if (
    source.observedAtMs
      > trustedNowMs
    || trustedNowMs
      - source.observedAtMs
      > policy.maxSourceAgeMs
    || (
      source.validUntilMs
        !== null
      && source.validUntilMs
        <= trustedNowMs
    )
  ) {
    return 'source_time_invalid';
  }

  if (
    policy.requireLicenseMetadata
    && source.license.licenseId
      === null
  ) {
    return 'license_required';
  }

  if (
    [
      'official_docs',
      'first_party_spec',
      'approved_web',
    ].includes(
      source.sourceKind,
    )
  ) {
    const locator =
      safeHttpsLocator(
        source.canonicalLocator,
      );

    if (
      !locator
      || !policy.allowedDomains
        .includes(locator.domain)
    ) {
      return 'domain_denied';
    }
  }

  if (
    source.official
    && ![
      'official_docs',
      'first_party_spec',
    ].includes(
      source.sourceKind,
    )
  ) {
    return 'official_claim_invalid';
  }

  return null;
}

function chunkRanges(
  text: string,
  maxBytes: number,
): readonly Readonly<{
  start: number;
  end: number;
  text: string;
  bytes: number;
}>[] | null {
  const chunks:
    {
      start: number;
      end: number;
      text: string;
      bytes: number;
    }[] = [];

  let start = 0;
  let index = 0;
  let bytes = 0;

  while (index < text.length) {
    const codePoint =
      text.codePointAt(index);

    if (codePoint === undefined) {
      return null;
    }

    const width =
      codePoint > 0xffff
        ? 2
        : 1;
    const pointBytes =
      codePoint <= 0x7f
        ? 1
        : codePoint <= 0x7ff
          ? 2
          : codePoint <= 0xffff
            ? 3
            : 4;

    if (
      bytes > 0
      && bytes + pointBytes
        > maxBytes
    ) {
      const part =
        text.slice(start, index);

      chunks.push({
        start,
        end: index,
        text: part,
        bytes,
      });

      start = index;
      bytes = 0;
    }

    bytes += pointBytes;
    index += width;
  }

  if (start < text.length) {
    chunks.push({
      start,
      end: text.length,
      text:
        text.slice(start),
      bytes,
    });
  }

  return Object.freeze(
    chunks.map(
      (chunk) =>
        Object.freeze(chunk),
    ),
  );
}

export async function ingestKnowledgeSource(
  {
    policy,
    source: sourceInput,
    trustedNowMs,
    digestProvider,
  }: {
    policy: KnowledgePolicy;
    source: unknown;
    trustedNowMs: number;
    digestProvider:
      KnowledgeDigestProvider;
  },
): Promise<KnowledgeIngestionResult> {
  const source =
    parseKnowledgeSourceInput(
      sourceInput,
    );

  if (
    !source
    || !Number.isSafeInteger(
      trustedNowMs,
    )
    || trustedNowMs < 0
    || !digestProvider
    || typeof digestProvider.digest
      !== 'function'
  ) {
    return result(
      false,
      'ingestion_invalid',
    );
  }

  const denied =
    policyAllows(
      policy,
      source,
      trustedNowMs,
    );

  if (denied) {
    return result(false, denied);
  }

  const content =
    normalizeKnowledgeText(
      source.content,
    );
  const contentBytes =
    utf8ByteLength(content);

  if (
    !content
    || contentBytes < 1
    || contentBytes
      > policy.maxSourceBytes
  ) {
    return result(
      false,
      'source_size_denied',
    );
  }

  const ranges =
    chunkRanges(
      content,
      policy.maxChunkBytes,
    );

  if (
    !ranges
    || ranges.length < 1
    || ranges.length
      > policy.maxChunksPerSource
  ) {
    return result(
      false,
      'chunk_limit_denied',
    );
  }

  const contentDigest =
    await digest(
      digestProvider,
      content,
    );

  if (!contentDigest) {
    return result(
      false,
      'digest_failed',
    );
  }

  const chunks:
    KnowledgeChunk[] = [];

  for (
    let ordinal = 0;
    ordinal < ranges.length;
    ordinal += 1
  ) {
    const range = ranges[ordinal];
    const textDigest =
      await digest(
        digestProvider,
        range.text,
      );

    if (!textDigest) {
      return result(
        false,
        'digest_failed',
      );
    }

    const chunkIdDigest =
      await digest(
        digestProvider,
        [
          source.sourceId,
          String(source.revision),
          String(ordinal),
          contentDigest,
          textDigest,
        ].join(':'),
      );

    if (!chunkIdDigest) {
      return result(
        false,
        'digest_failed',
      );
    }

    const chunk =
      parseKnowledgeChunk({
        protocolVersion: '1.0',
        chunkId:
          'knowledge_chunk_'
          + chunkIdDigest,
        sourceId:
          source.sourceId,
        sourceRevision:
          source.revision,
        sourceDigest:
          contentDigest,
        ordinal,
        charStart:
          range.start,
        charEnd:
          range.end,
        text:
          range.text,
        textDigest,
        byteLength:
          range.bytes,
        official:
          source.official,
        version:
          source.version,
        observedAtMs:
          source.observedAtMs,
        validUntilMs:
          source.validUntilMs,
        provenanceRef:
          source.provenanceRef,
        licenseId:
          source.license.licenseId,
        grantsExecutionAuthority:
          false,
        grantsSensorAuthority:
          false,
        grantsApprovalAuthority:
          false,
        grantsCapabilityAuthority:
          false,
      });

    if (!chunk) {
      return result(
        false,
        'chunk_invalid',
      );
    }

    chunks.push(chunk);
  }

  const durable =
    parseKnowledgeSourceRevision({
      protocolVersion: '1.0',
      sourceId:
        source.sourceId,
      accountId:
        source.accountId,
      workspaceId:
        source.workspaceId,
      policyId:
        source.policyId,
      policyRevision:
        source.policyRevision,
      sourceKind:
        source.sourceKind,
      canonicalLocator:
        source.canonicalLocator,
      publisher:
        source.publisher,
      provenanceType:
        source.provenanceType,
      provenanceRef:
        source.provenanceRef,
      official:
        source.official,
      version:
        source.version,
      revision:
        source.revision,
      contentDigest,
      contentBytes,
      observedAtMs:
        source.observedAtMs,
      validUntilMs:
        source.validUntilMs,
      license:
        source.license,
      state: 'active',
      supersededByRevision:
        null,
      indexedAtMs:
        trustedNowMs,
      grantsExecutionAuthority:
        false,
      grantsSensorAuthority:
        false,
      grantsApprovalAuthority:
        false,
      grantsCapabilityAuthority:
        false,
    });

  if (!durable) {
    return result(
      false,
      'source_invalid',
    );
  }

  return result(
    true,
    'ingested',
    durable,
    chunks,
  );
}
