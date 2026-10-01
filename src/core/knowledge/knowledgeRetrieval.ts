import {
  type KnowledgeChunk,
} from './knowledgeChunk';

import {
  type KnowledgePolicy,
} from './knowledgePolicy';

import {
  type KnowledgeQuery,
  tokenizeKnowledgeQuery,
} from './knowledgeQuery';

import {
  type KnowledgeSourceRevision,
} from './knowledgeSource';

import {
  KNOWLEDGE_PROJECTION_ID,
  utf8ByteLength,
} from './knowledgeSecurity';

export type KnowledgeFreshness =
  | 'current'
  | 'stale';

export type KnowledgeProjectionEntry =
  Readonly<{
    chunkId: string;
    sourceId: string;
    sourceRevision: number;
    sourceVersion: string;
    sourceLocator: string;
    publisher: string;
    provenanceRef: string;
    licenseId: string | null;
    official: boolean;
    freshness:
      KnowledgeFreshness;
    rank: number;
    lexicalScore: number;
    text: string;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

export type KnowledgeProjection =
  Readonly<{
    protocolVersion: '1.0';
    projectionId: string;
    queryId: string;
    accountId: string;
    workspaceId: string;
    policyId: string;
    policyRevision: number;
    generation: number;
    generatedAtMs: number;
    entries:
      readonly KnowledgeProjectionEntry[];
    totalBytes: number;
    providerIndependent: true;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

export type KnowledgeCandidate =
  Readonly<{
    source:
      KnowledgeSourceRevision;
    chunk: KnowledgeChunk;
    freshness:
      KnowledgeFreshness;
    lexicalScore: number;
  }>;

function chunkTerms(
  text: string,
): ReadonlySet<string> {
  return new Set(
    tokenizeKnowledgeQuery(text),
  );
}

function lexicalScore(
  queryTerms:
    readonly string[],
  text: string,
): number {
  if (queryTerms.length === 0) {
    return 0;
  }

  const terms = chunkTerms(text);
  let matches = 0;

  for (const term of queryTerms) {
    if (terms.has(term)) {
      matches += 1;
    }
  }

  return matches;
}

export function isKnowledgeSourceCurrent(
  source:
    KnowledgeSourceRevision,
  policy: KnowledgePolicy,
  trustedNowMs: number,
): boolean {
  return (
    source.state === 'active'
    && source.observedAtMs
      <= trustedNowMs
    && trustedNowMs
      - source.observedAtMs
      <= policy.maxSourceAgeMs
    && (
      source.validUntilMs === null
      || source.validUntilMs
        > trustedNowMs
    )
  );
}

export function rankKnowledgeCandidates(
  {
    query,
    policy,
    sources,
    chunksBySource,
    trustedNowMs,
  }: {
    query: KnowledgeQuery;
    policy: KnowledgePolicy;
    sources:
      readonly KnowledgeSourceRevision[];
    chunksBySource:
      ReadonlyMap<
        string,
        readonly KnowledgeChunk[]
      >;
    trustedNowMs: number;
  },
): readonly KnowledgeCandidate[] {
  const queryTerms =
    tokenizeKnowledgeQuery(
      query.queryText,
    );

  if (queryTerms.length === 0) {
    return Object.freeze([]);
  }

  const candidates:
    KnowledgeCandidate[] = [];

  for (const source of sources) {
    if (
      source.accountId
        !== query.accountId
      || source.workspaceId
        !== query.workspaceId
      || source.policyId
        !== query.policyId
      || source.policyRevision
        > query.policyRevision
      || source.state !== 'active'
      || !query.sourceKinds.includes(
        source.sourceKind,
      )
      || (
        query.requestedVersion
          !== null
        && source.version
          !== query.requestedVersion
      )
    ) {
      continue;
    }

    const current =
      isKnowledgeSourceCurrent(
        source,
        policy,
        trustedNowMs,
      );

    if (
      query.requireCurrent
      && !current
    ) {
      continue;
    }

    const chunks =
      chunksBySource.get(
        source.sourceId,
      ) ?? [];

    for (const chunk of chunks) {
      if (
        chunk.sourceRevision
          !== source.revision
        || chunk.sourceDigest
          !== source.contentDigest
      ) {
        continue;
      }

      const overlap =
        lexicalScore(
          queryTerms,
          chunk.text,
        );

      if (overlap < 1) {
        continue;
      }

      let score =
        overlap * 1000;

      if (
        query.purpose
          === 'technical_reference'
        && policy.preferOfficialSources
        && source.official
      ) {
        score += 500;
      }

      if (current) {
        score += 100;
      }

      if (
        query.requestedVersion
          !== null
        && source.version
          === query.requestedVersion
      ) {
        score += 250;
      }

      candidates.push(
        Object.freeze({
          source,
          chunk,
          freshness:
            current
              ? 'current'
              : 'stale',
          lexicalScore: score,
        }),
      );
    }
  }

  candidates.sort(
    (a, b) =>
      b.lexicalScore
        - a.lexicalScore
      || Number(b.source.official)
        - Number(a.source.official)
      || b.source.observedAtMs
        - a.source.observedAtMs
      || a.source.sourceId
        .localeCompare(
          b.source.sourceId,
        )
      || a.chunk.ordinal
        - b.chunk.ordinal,
  );

  return Object.freeze(candidates);
}

function entryBytes(
  candidate:
    KnowledgeCandidate,
): number {
  return (
    utf8ByteLength(
      candidate.chunk.text,
    )
    + utf8ByteLength(
      candidate.source
        .canonicalLocator,
    )
    + utf8ByteLength(
      candidate.source.publisher,
    )
    + utf8ByteLength(
      candidate.source
        .provenanceRef,
    )
    + utf8ByteLength(
      candidate.source.version,
    )
    + 192
  );
}

export function buildKnowledgeProjection(
  {
    projectionId,
    query,
    policy,
    generation,
    candidates,
    trustedNowMs,
  }: {
    projectionId: string;
    query: KnowledgeQuery;
    policy: KnowledgePolicy;
    generation: number;
    candidates:
      readonly KnowledgeCandidate[];
    trustedNowMs: number;
  },
): KnowledgeProjection | null {
  if (
    !KNOWLEDGE_PROJECTION_ID.test(
      projectionId,
    )
    || !Number.isSafeInteger(
      generation,
    )
    || generation < 0
    || !Number.isSafeInteger(
      trustedNowMs,
    )
    || trustedNowMs < 0
  ) {
    return null;
  }

  const resultLimit =
    Math.min(
      query.maxResults,
      policy.maxResults,
    );
  const byteLimit =
    Math.min(
      query.maxProjectionBytes,
      policy.maxProjectionBytes,
    );

  const entries:
    KnowledgeProjectionEntry[] = [];
  let totalBytes = 0;

  for (const candidate of candidates) {
    if (entries.length >= resultLimit) {
      break;
    }

    const bytes =
      entryBytes(candidate);

    if (
      bytes > byteLimit
      || totalBytes + bytes
        > byteLimit
    ) {
      continue;
    }

    entries.push(
      Object.freeze({
        chunkId:
          candidate.chunk.chunkId,
        sourceId:
          candidate.source.sourceId,
        sourceRevision:
          candidate.source.revision,
        sourceVersion:
          candidate.source.version,
        sourceLocator:
          candidate.source
            .canonicalLocator,
        publisher:
          candidate.source.publisher,
        provenanceRef:
          candidate.source
            .provenanceRef,
        licenseId:
          candidate.source
            .license.licenseId,
        official:
          candidate.source.official,
        freshness:
          candidate.freshness,
        rank:
          entries.length + 1,
        lexicalScore:
          candidate.lexicalScore,
        text:
          candidate.chunk.text,
        grantsExecutionAuthority:
          false,
        grantsSensorAuthority:
          false,
        grantsApprovalAuthority:
          false,
        grantsCapabilityAuthority:
          false,
      }),
    );

    totalBytes += bytes;
  }

  return Object.freeze({
    protocolVersion: '1.0',
    projectionId,
    queryId: query.queryId,
    accountId: query.accountId,
    workspaceId:
      query.workspaceId,
    policyId: query.policyId,
    policyRevision:
      query.policyRevision,
    generation,
    generatedAtMs:
      trustedNowMs,
    entries:
      Object.freeze(entries),
    totalBytes,
    providerIndependent: true,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}
