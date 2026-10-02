import type {
  MemoryCompactionProjection,
} from './memoryCompaction';

import type {
  MemoryRetrievalEntry,
  MemoryRetrievalProjection,
} from './memoryRetrieval';

export type MemoryConflictGateDecision =
  Readonly<{
    accepted: boolean;
    reason:
      | 'safe'
      | 'conflict_filtered'
      | 'invalid_binding';
    safeEntries:
      readonly MemoryRetrievalEntry[];
    conflictedMemoryIds:
      readonly string[];
    conflictGroupCount: number;
    requiresClarification: boolean;
  }>;

function groupKey(
  category: string,
  topicTags: readonly string[],
): string {
  return JSON.stringify([
    category,
    [...topicTags],
  ]);
}

export function gateMemoryConflicts(
  retrieval: MemoryRetrievalProjection,
  compaction: MemoryCompactionProjection,
): MemoryConflictGateDecision {
  if (
    typeof retrieval !== 'object'
    || retrieval === null
    || typeof compaction !== 'object'
    || compaction === null
    || retrieval.accountId
      !== compaction.accountId
    || retrieval.policyId
      !== compaction.policyId
    || retrieval.policyRevision
      !== compaction.policyRevision
    || !Array.isArray(retrieval.entries)
    || !Array.isArray(compaction.groups)
  ) {
    return Object.freeze({
      accepted: false,
      reason: 'invalid_binding',
      safeEntries: Object.freeze([]),
      conflictedMemoryIds:
        Object.freeze([]),
      conflictGroupCount: 0,
      requiresClarification: false,
    });
  }

  const conflictedKeys = new Set<string>();
  const conflictedMemoryIds =
    new Set<string>();

  for (const group of compaction.groups) {
    if (group.state !== 'conflict') {
      continue;
    }

    conflictedKeys.add(
      groupKey(
        group.category,
        group.topicTags,
      ),
    );

    for (const source of group.sources) {
      conflictedMemoryIds.add(
        source.memoryId,
      );
    }
  }

  const safeEntries =
    retrieval.entries.filter(
      (entry) =>
        !conflictedKeys.has(
          groupKey(
            entry.category,
            entry.topicTags,
          ),
        )
        && !conflictedMemoryIds.has(
          entry.memoryId,
        ),
    );

  const requiresClarification =
    conflictedMemoryIds.size > 0;

  return Object.freeze({
    accepted: true,
    reason:
      requiresClarification
        ? 'conflict_filtered'
        : 'safe',
    safeEntries:
      Object.freeze([...safeEntries]),
    conflictedMemoryIds:
      Object.freeze(
        [...conflictedMemoryIds].sort(),
      ),
    conflictGroupCount:
      conflictedKeys.size,
    requiresClarification,
  });
}
