import {
  type KnowledgeCandidate,
} from './knowledgeRetrieval';

import {
  type KnowledgeQuery,
} from './knowledgeQuery';

import {
  exactObject,
  safeInteger,
} from './knowledgeSecurity';

export type KnowledgeRerankItem =
  Readonly<{
    chunkId: string;
    adjustment: number;
  }>;

export interface KnowledgeReranker {
  rerank(
    input: Readonly<{
      queryId: string;
      queryText: string;
      candidates:
        readonly Readonly<{
          chunkId: string;
          sourceId: string;
          text: string;
          baseScore: number;
          official: boolean;
          freshness:
            'current' | 'stale';
        }>[];
    }>,
  ):
    | Promise<unknown>
    | unknown;
}

export type KnowledgeRerankResult =
  Readonly<{
    candidates:
      readonly KnowledgeCandidate[];
    usedReranker: boolean;
    reason:
      | 'reranked'
      | 'reranker_unavailable'
      | 'reranker_failed'
      | 'reranker_invalid';
  }>;

const ITEM_KEYS =
  new Set([
    'chunkId',
    'adjustment',
  ]);

function parseItems(
  input: unknown,
  candidateIds:
    ReadonlySet<string>,
): readonly KnowledgeRerankItem[]
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
    KnowledgeRerankItem[] = [];

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
      ) > 100
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

function baseResult(
  candidates:
    readonly KnowledgeCandidate[],
  reason:
    KnowledgeRerankResult['reason'],
): KnowledgeRerankResult {
  return Object.freeze({
    candidates:
      Object.freeze([
        ...candidates,
      ]),
    usedReranker: false,
    reason,
  });
}

export async function applyKnowledgeReranker(
  query: KnowledgeQuery,
  candidates:
    readonly KnowledgeCandidate[],
  reranker:
    KnowledgeReranker | null,
): Promise<KnowledgeRerankResult> {
  if (!reranker) {
    return baseResult(
      candidates,
      'reranker_unavailable',
    );
  }

  if (
    typeof reranker.rerank
      !== 'function'
  ) {
    return baseResult(
      candidates,
      'reranker_invalid',
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
      await reranker.rerank(
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
                    official:
                      candidate.source
                        .official,
                    freshness:
                      candidate
                        .freshness,
                  }),
              ),
            ),
        }),
      );
  } catch {
    return baseResult(
      candidates,
      'reranker_failed',
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
      'reranker_invalid',
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

  const reranked =
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

  reranked.sort(
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

  return Object.freeze({
    candidates:
      Object.freeze(reranked),
    usedReranker: true,
    reason: 'reranked',
  });
}
