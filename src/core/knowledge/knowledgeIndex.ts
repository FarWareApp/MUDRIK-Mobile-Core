import {
  parseKnowledgeChunk,
  type KnowledgeChunk,
} from './knowledgeChunk';

import {
  parseKnowledgeSourceRevision,
  type KnowledgeSourceRevision,
} from './knowledgeSource';

import {
  KNOWLEDGE_SOURCE_ID,
  SHA256,
  safeInteger,
} from './knowledgeSecurity';

export type KnowledgeIndexEntry =
  Readonly<{
    protocolVersion: '1.0';
    indexVersion:
      'knowledge_lexical.v1';
    sourceId: string;
    sourceRevision: number;
    sourceDigest: string;
    chunkCount: number;
    chunkIds:
      readonly string[];
    builtAtMs: number;
    providerIndependent: true;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

export type PreparedKnowledgeIndex =
  Readonly<{
    entry: KnowledgeIndexEntry;
    chunks:
      readonly KnowledgeChunk[];
  }>;

export type KnowledgeIndexResult =
  Readonly<{
    accepted: boolean;
    duplicate: boolean;
    reason: string;
    entry:
      KnowledgeIndexEntry | null;
  }>;

export interface KnowledgeDerivedIndexAdapter {
  prepare(
    source: unknown,
    chunks: unknown,
  ): PreparedKnowledgeIndex | null;

  publish(
    prepared:
      PreparedKnowledgeIndex,
  ): KnowledgeIndexResult;

  invalidate(
    sourceId: string,
    throughRevision: number,
  ): boolean;

  getEntry(
    sourceId: string,
  ): KnowledgeIndexEntry | null;

  getChunks(
    sourceId: string,
    sourceRevision?: number,
    sourceDigest?: string,
  ): readonly KnowledgeChunk[];

  restore(
    source: unknown,
    chunks: unknown,
  ): boolean;
}

function result(
  accepted: boolean,
  reason: string,
  entry:
    KnowledgeIndexEntry | null = null,
  duplicate = false,
): KnowledgeIndexResult {
  return Object.freeze({
    accepted,
    duplicate,
    reason,
    entry,
  });
}

function sameEntry(
  left: KnowledgeIndexEntry,
  right: KnowledgeIndexEntry,
): boolean {
  return (
    left.sourceId === right.sourceId
    && left.sourceRevision
      === right.sourceRevision
    && left.sourceDigest
      === right.sourceDigest
    && left.chunkCount
      === right.chunkCount
    && left.builtAtMs
      === right.builtAtMs
    && JSON.stringify(
      left.chunkIds,
    ) === JSON.stringify(
      right.chunkIds,
    )
  );
}

export function prepareKnowledgeIndex(
  sourceInput: unknown,
  chunksInput: unknown,
): PreparedKnowledgeIndex | null {
  const source =
    parseKnowledgeSourceRevision(
      sourceInput,
    );

  if (
    !source
    || source.state !== 'active'
    || !Array.isArray(chunksInput)
    || chunksInput.length < 1
    || chunksInput.length > 4096
  ) {
    return null;
  }

  const chunks:
    KnowledgeChunk[] = [];
  const ids =
    new Set<string>();
  let previousEnd = 0;
  let totalBytes = 0;

  for (
    let index = 0;
    index < chunksInput.length;
    index += 1
  ) {
    const chunk =
      parseKnowledgeChunk(
        chunksInput[index],
      );

    if (
      !chunk
      || chunk.sourceId
        !== source.sourceId
      || chunk.sourceRevision
        !== source.revision
      || chunk.sourceDigest
        !== source.contentDigest
      || chunk.ordinal !== index
      || chunk.charStart
        !== previousEnd
      || ids.has(chunk.chunkId)
    ) {
      return null;
    }

    ids.add(chunk.chunkId);
    previousEnd =
      chunk.charEnd;
    totalBytes +=
      chunk.byteLength;
    chunks.push(chunk);
  }

  if (
    totalBytes
      !== source.contentBytes
  ) {
    return null;
  }

  const entry:
    KnowledgeIndexEntry =
      Object.freeze({
        protocolVersion: '1.0',
        indexVersion:
          'knowledge_lexical.v1',
        sourceId:
          source.sourceId,
        sourceRevision:
          source.revision,
        sourceDigest:
          source.contentDigest,
        chunkCount:
          chunks.length,
        chunkIds:
          Object.freeze(
            chunks.map(
              (chunk) =>
                chunk.chunkId,
            ),
          ),
        builtAtMs:
          source.indexedAtMs,
        providerIndependent: true,
        grantsExecutionAuthority:
          false,
        grantsSensorAuthority:
          false,
        grantsApprovalAuthority:
          false,
        grantsCapabilityAuthority:
          false,
      });

  return Object.freeze({
    entry,
    chunks:
      Object.freeze(chunks),
  });
}

export function parseKnowledgeIndexEntry(
  input: unknown,
): KnowledgeIndexEntry | null {
  if (
    typeof input !== 'object'
    || input === null
    || Array.isArray(input)
  ) {
    return null;
  }

  const record =
    input as Record<
      string,
      unknown
    >;
  const keys =
    new Set([
      'protocolVersion',
      'indexVersion',
      'sourceId',
      'sourceRevision',
      'sourceDigest',
      'chunkCount',
      'chunkIds',
      'builtAtMs',
      'providerIndependent',
      'grantsExecutionAuthority',
      'grantsSensorAuthority',
      'grantsApprovalAuthority',
      'grantsCapabilityAuthority',
    ]);

  if (
    Object.keys(record).length
      !== keys.size
    || Object.keys(record).some(
      (key) => !keys.has(key),
    )
    || record.protocolVersion
      !== '1.0'
    || record.indexVersion
      !== 'knowledge_lexical.v1'
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
      record.chunkCount,
    )
    || (record.chunkCount as number)
      < 1
    || (record.chunkCount as number)
      > 4096
    || !Array.isArray(
      record.chunkIds,
    )
    || record.chunkIds.length
      !== record.chunkCount
    || record.chunkIds.some(
      (chunkId) =>
        typeof chunkId !== 'string'
        || !/^knowledge_chunk_[a-f0-9]{64}$/
          .test(chunkId),
    )
    || new Set(
      record.chunkIds,
    ).size !== record.chunkIds.length
    || !safeInteger(
      record.builtAtMs,
    )
    || record.providerIndependent
      !== true
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
    indexVersion:
      'knowledge_lexical.v1',
    sourceId:
      record.sourceId as string,
    sourceRevision:
      record.sourceRevision as number,
    sourceDigest:
      record.sourceDigest as string,
    chunkCount:
      record.chunkCount as number,
    chunkIds:
      Object.freeze([
        ...(record.chunkIds as string[]),
      ]),
    builtAtMs:
      record.builtAtMs as number,
    providerIndependent: true,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}

export class KnowledgeDerivedIndex
  implements
    KnowledgeDerivedIndexAdapter {
  private readonly records =
    new Map<
      string,
      Readonly<{
        entry: KnowledgeIndexEntry;
        chunks:
          readonly KnowledgeChunk[];
      }>
    >();

  private readonly prepared =
    new WeakSet<object>();

  prepare(
    source: unknown,
    chunks: unknown,
  ): PreparedKnowledgeIndex | null {
    const value =
      prepareKnowledgeIndex(
        source,
        chunks,
      );

    if (value) {
      this.prepared.add(value);
    }

    return value;
  }

  publish(
    prepared:
      PreparedKnowledgeIndex,
  ): KnowledgeIndexResult {
    if (
      !prepared
      || typeof prepared
        !== 'object'
      || !this.prepared.has(
        prepared,
      )
    ) {
      return result(
        false,
        'index_preparation_invalid',
      );
    }

    const parsedEntry =
      parseKnowledgeIndexEntry(
        prepared.entry,
      );

    if (
      !parsedEntry
      || prepared.chunks.length
        !== parsedEntry.chunkCount
      || prepared.chunks.some(
        (chunk, index) =>
          chunk.sourceId
            !== parsedEntry.sourceId
          || chunk.sourceRevision
            !== parsedEntry
              .sourceRevision
          || chunk.sourceDigest
            !== parsedEntry
              .sourceDigest
          || chunk.ordinal !== index
          || chunk.chunkId
            !== parsedEntry
              .chunkIds[index],
      )
    ) {
      return result(
        false,
        'index_preparation_corrupt',
      );
    }

    const current =
      this.records.get(
        parsedEntry.sourceId,
      );

    if (current) {
      if (
        parsedEntry.sourceRevision
          < current.entry
            .sourceRevision
      ) {
        return result(
          false,
          'index_revision_stale',
          current.entry,
        );
      }

      if (
        parsedEntry.sourceRevision
          === current.entry
            .sourceRevision
      ) {
        return sameEntry(
          parsedEntry,
          current.entry,
        )
          ? result(
              true,
              'duplicate',
              current.entry,
              true,
            )
          : result(
              false,
              'index_revision_conflict',
              current.entry,
            );
      }
    }

    this.records.set(
      parsedEntry.sourceId,
      Object.freeze({
        entry: parsedEntry,
        chunks:
          Object.freeze([
            ...prepared.chunks,
          ]),
      }),
    );

    this.prepared.delete(
      prepared,
    );

    return result(
      true,
      'index_published',
      parsedEntry,
    );
  }

  invalidate(
    sourceId: string,
    throughRevision: number,
  ): boolean {
    if (
      !KNOWLEDGE_SOURCE_ID.test(
        sourceId,
      )
      || !safeInteger(
        throughRevision,
      )
      || throughRevision < 1
    ) {
      return false;
    }

    const current =
      this.records.get(sourceId);

    if (
      current
      && current.entry
        .sourceRevision
        <= throughRevision
    ) {
      this.records.delete(sourceId);
    }

    return true;
  }

  getEntry(
    sourceId: string,
  ): KnowledgeIndexEntry | null {
    return (
      this.records.get(
        sourceId,
      )?.entry
      ?? null
    );
  }

  getChunks(
    sourceId: string,
    sourceRevision?: number,
    sourceDigest?: string,
  ): readonly KnowledgeChunk[] {
    const current =
      this.records.get(sourceId);

    if (!current) {
      return Object.freeze([]);
    }

    if (
      sourceRevision !== undefined
      && current.entry
        .sourceRevision
        !== sourceRevision
    ) {
      return Object.freeze([]);
    }

    if (
      sourceDigest !== undefined
      && current.entry
        .sourceDigest
        !== sourceDigest
    ) {
      return Object.freeze([]);
    }

    return current.chunks;
  }

  restore(
    source: unknown,
    chunks: unknown,
  ): boolean {
    const prepared =
      this.prepare(
        source,
        chunks,
      );

    if (!prepared) {
      return false;
    }

    return this.publish(
      prepared,
    ).accepted;
  }
}
