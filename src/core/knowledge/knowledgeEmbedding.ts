import {
  type KnowledgeCandidate,
} from './knowledgeRetrieval';

import {
  type KnowledgeQuery,
} from './knowledgeQuery';

import {
  applyKnowledgeReranker,
  type KnowledgeReranker,
  type KnowledgeRerankResult,
} from './knowledgeReranker';

import {
  exactObject,
  safeInteger,
} from './knowledgeSecurity';

export type KnowledgeEmbeddingItem =
  Readonly<{
    chunkId: string;
    adjustment: number;
  }>;

export interface KnowledgeEmbeddingRanker {
  rank(
    input: Readonly<{
      queryId: string;
      queryText: string;
      candidates:
        readonly Readonly<{
          chunkId: string;
          sourceId: string;
          text: string;
          baseScore: number;
        }>[];
    }>,
  ):
    | Promise<unknown>
    | unknown;
}

export type KnowledgeEmbeddingResult =
  Readonly<{
    candidates:
      readonly KnowledgeCandidate[];
    usedEmbeddings: boolean;
    reason:
      | 'embedding_ranked'
      | 'embedding_unavailable'
      | 'embedding_failed'
      | 'embedding_invalid';
  }>;

const ITEM_KEYS =
  new Set([
    'chunkId',
    'adjustment',
  ]);

function baseResult(
  candidates:
    readonly KnowledgeCandidate[],
  reason:
    KnowledgeEmbeddingResult[
      'reason'
    ],
): KnowledgeEmbeddingResult {
  return Object.freeze({
    candidates:
      Object.freeze([
        ...candidates,
      ]),
    usedEmbeddings: false,
    reason,
  });
}

function parseItems(
  input: unknown,
  candidateIds:
    ReadonlySet<string>,
): readonly KnowledgeEmbeddingItem[]
  | null {
  if (
    !Array.isArray(input)
    || input.length
      > candidateIds.size
  ) {
    return null;
  }

  const seen =
    new Set<string>();
  const items:
    KnowledgeEmbeddingItem[] = [];

  for (const value of input) {
    const record =
      exactObject(
        value,
        ITEM_KEYS,
      );

    if (
      !record
      || typeof record.chunkId
        !== 'string'
      || !candidateIds.has(
        record.chunkId,
      )
      || seen.has(
        record.chunkId,
      )
      || !Number.isInteger(
        record.adjustment,
      )
      || !safeInteger(
        Math.abs(
          record.adjustment as number,
        ),
      )
      || Math.abs(
        record.adjustment as number,
      ) > 200
    ) {
      return null;
    }

    seen.add(
      record.chunkId,
    );
    items.push(
      Object.freeze({
        chunkId:
          record.chunkId,
        adjustment:
          record.adjustment as number,
      }),
    );
  }

  return Object.freeze(items);
}

function sortCandidates(
  candidates:
    KnowledgeCandidate[],
): void {
  candidates.sort(
    (a, b) =>
      b.lexicalScore
        - a.lexicalScore
      || Number(
        b.source.official,
      )
        - Number(
          a.source.official,
        )
      || b.source.observedAtMs
        - a.source.observedAtMs
      || a.source.sourceId
        .localeCompare(
          b.source.sourceId,
        )
      || a.chunk.ordinal
        - b.chunk.ordinal,
  );
}

export async function applyKnowledgeEmbeddings(
  query: KnowledgeQuery,
  candidates:
    readonly KnowledgeCandidate[],
  provider:
    KnowledgeEmbeddingRanker | null,
): Promise<
  KnowledgeEmbeddingResult
> {
  if (!provider) {
    return baseResult(
      candidates,
      'embedding_unavailable',
    );
  }

  if (
    typeof provider.rank
      !== 'function'
  ) {
    return baseResult(
      candidates,
      'embedding_invalid',
    );
  }

  const candidateIds =
    new Set(
      candidates.map(
        (candidate) =>
          candidate.chunk.chunkId,
      ),
    );

  let raw: unknown;

  try {
    raw =
      await provider.rank(
        Object.freeze({
          queryId: query.queryId,
          queryText:
            query.queryText,
          candidates:
            Object.freeze(
              candidates.map(
                (candidate) =>
                  Object.freeze({
                    chunkId:
                      candidate.chunk
                        .chunkId,
                    sourceId:
                      candidate.source
                        .sourceId,
                    text:
                      candidate.chunk
                        .text,
                    baseScore:
                      candidate
                        .lexicalScore,
                  }),
              ),
            ),
        }),
      );
  } catch {
    return baseResult(
      candidates,
      'embedding_failed',
    );
  }

  const items =
    parseItems(
      raw,
      candidateIds,
    );

  if (!items) {
    return baseResult(
      candidates,
      'embedding_invalid',
    );
  }

  const adjustments =
    new Map(
      items.map(
        (item) => [
          item.chunkId,
          item.adjustment,
        ],
      ),
    );

  const ranked =
    candidates.map(
      (candidate) =>
        Object.freeze({
          ...candidate,
          lexicalScore:
            candidate.lexicalScore
            + (
              adjustments.get(
                candidate.chunk
                  .chunkId,
              )
              ?? 0
            ),
        }),
    );

  sortCandidates(ranked);

  return Object.freeze({
    candidates:
      Object.freeze(ranked),
    usedEmbeddings: true,
    reason:
      'embedding_ranked',
  });
}

export type KnowledgeRankingPipelineResult =
  Readonly<{
    candidates:
      readonly KnowledgeCandidate[];
    embedding:
      Readonly<{
        used: boolean;
        reason:
          KnowledgeEmbeddingResult[
            'reason'
          ];
      }>;
    reranker:
      Readonly<{
        used: boolean;
        reason:
          KnowledgeRerankResult[
            'reason'
          ];
      }>;
  }>;

export async function applyKnowledgeRankingPipeline(
  query: KnowledgeQuery,
  candidates:
    readonly KnowledgeCandidate[],
  {
    embeddingRanker = null,
    reranker = null,
  }: {
    embeddingRanker?:
      KnowledgeEmbeddingRanker
      | null;
    reranker?:
      KnowledgeReranker | null;
  } = {},
): Promise<
  KnowledgeRankingPipelineResult
> {
  const embedded =
    await applyKnowledgeEmbeddings(
      query,
      candidates,
      embeddingRanker,
    );

  const reranked =
    await applyKnowledgeReranker(
      query,
      embedded.candidates,
      reranker,
    );

  return Object.freeze({
    candidates:
      reranked.candidates,
    embedding:
      Object.freeze({
        used:
          embedded.usedEmbeddings,
        reason:
          embedded.reason,
      }),
    reranker:
      Object.freeze({
        used:
          reranked.usedReranker,
        reason:
          reranked.reason,
      }),
  });
}
