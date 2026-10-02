import type {
  MemoryRetrievalProjection,
} from '../memory/memoryRetrieval';

import type {
  MemoryCompactionProjection,
} from '../memory/memoryCompaction';

import {
  gateMemoryConflicts,
} from '../memory/memoryConflictGate';

import type {
  KnowledgeProjection,
} from '../knowledge/knowledgeRetrieval';

export type ContextSourceKind =
  | 'platform_policy'
  | 'requester_input'
  | 'conversation'
  | 'memory'
  | 'knowledge'
  | 'tool_evidence'
  | 'project_state';

export type ContextAuthority =
  | 'platform'
  | 'requester'
  | 'none';

export type ContextSensitivity =
  | 'public'
  | 'private'
  | 'sensitive';

export type ContextCandidate =
  Readonly<{
    candidateRef: string;
    sourceKind: ContextSourceKind;
    authority: ContextAuthority;
    content: string;
    provenanceRef: string;
    observedAtMs: number;
    expiresAtMs: number | null;
    relevanceScore: number;
    confidenceScore: number;
    tokenEstimate: number;
    sensitivity: ContextSensitivity;
    accountId: string | null;
    workspaceId: string | null;
  }>;

export type ContextCompilerPolicy =
  Readonly<{
    maxEntries: number;
    maxTokens: number;
    allowPrivate: boolean;
    allowSensitive: boolean;
    accountId: string | null;
    workspaceId: string | null;
  }>;

export type CompiledContext =
  Readonly<{
    platform: readonly ContextCandidate[];
    requester: readonly ContextCandidate[];
    evidence: readonly ContextCandidate[];
    totalTokens: number;
    omittedCount: number;
    truncated: boolean;
    compiledAtMs: number;
  }>;

const SAFE_REF =
  /^[A-Za-z0-9][A-Za-z0-9._:@/+\-]{2,239}$/;

function safeInteger(
  value: unknown,
): value is number {
  return (
    Number.isSafeInteger(value)
    && Number(value) >= 0
  );
}

function safeScore(
  value: unknown,
): value is number {
  return (
    safeInteger(value)
    && Number(value) <= 1000
  );
}

export type ContextCompileDecision =
  Readonly<{
    accepted: boolean;
    reason:
      | 'compiled'
      | 'invalid_policy'
      | 'invalid_candidate'
      | 'authoritative_budget_exhausted';
    value: CompiledContext | null;
  }>;

const SOURCE_WEIGHTS:
  Readonly<Record<ContextSourceKind, number>> =
    Object.freeze({
      platform_policy: 1000,
      requester_input: 1000,
      project_state: 900,
      tool_evidence: 850,
      knowledge: 700,
      memory: 650,
      conversation: 600,
    });

function validPolicy(
  policy: ContextCompilerPolicy,
): boolean {
  return (
    safeInteger(policy.maxEntries)
    && policy.maxEntries >= 1
    && policy.maxEntries <= 256
    && safeInteger(policy.maxTokens)
    && policy.maxTokens >= 256
    && policy.maxTokens <= 1_000_000
    && typeof policy.allowPrivate === 'boolean'
    && typeof policy.allowSensitive === 'boolean'
    && (
      policy.accountId === null
      || SAFE_REF.test(policy.accountId)
    )
    && (
      policy.workspaceId === null
      || SAFE_REF.test(policy.workspaceId)
    )
  );
}

function authorityValid(
  candidate: ContextCandidate,
): boolean {
  if (candidate.sourceKind === 'platform_policy') {
    return candidate.authority === 'platform';
  }

  if (candidate.sourceKind === 'requester_input') {
    return candidate.authority === 'requester';
  }

  return candidate.authority === 'none';
}

function validCandidate(
  candidate: ContextCandidate,
): boolean {
  return (
    SAFE_REF.test(candidate.candidateRef)
    && SAFE_REF.test(candidate.provenanceRef)
    && typeof candidate.content === 'string'
    && candidate.content.length >= 1
    && candidate.content.length <= 64 * 1024
    && safeInteger(candidate.observedAtMs)
    && (
      candidate.expiresAtMs === null
      || (
        safeInteger(candidate.expiresAtMs)
        && candidate.expiresAtMs
          > candidate.observedAtMs
      )
    )
    && safeScore(candidate.relevanceScore)
    && safeScore(candidate.confidenceScore)
    && safeInteger(candidate.tokenEstimate)
    && candidate.tokenEstimate >= 1
    && candidate.tokenEstimate <= 64 * 1024
    && ['public', 'private', 'sensitive']
      .includes(candidate.sensitivity)
    && (
      candidate.accountId === null
      || SAFE_REF.test(candidate.accountId)
    )
    && (
      candidate.workspaceId === null
      || SAFE_REF.test(candidate.workspaceId)
    )
    && authorityValid(candidate)
  );
}

function scopeConflicts(
  candidate: ContextCandidate,
  policy: ContextCompilerPolicy,
): boolean {
  return (
    (
      candidate.accountId !== null
      && policy.accountId !== null
      && candidate.accountId !== policy.accountId
    )
    || (
      candidate.workspaceId !== null
      && policy.workspaceId !== null
      && candidate.workspaceId !== policy.workspaceId
    )
  );
}

function sensitivityAllowed(
  candidate: ContextCandidate,
  policy: ContextCompilerPolicy,
): boolean {
  if (candidate.sensitivity === 'public') {
    return true;
  }

  if (candidate.sensitivity === 'private') {
    return policy.allowPrivate;
  }

  return policy.allowSensitive;
}

function evidenceRank(
  candidate: ContextCandidate,
  compiledAtMs: number,
): number {
  const ageMs =
    Math.max(
      0,
      compiledAtMs - candidate.observedAtMs,
    );
  const ageDays =
    Math.floor(
      ageMs / (24 * 60 * 60 * 1000),
    );
  const recency =
    Math.max(0, 200 - ageDays);

  return (
    candidate.relevanceScore * 3
    + candidate.confidenceScore * 2
    + SOURCE_WEIGHTS[candidate.sourceKind]
    + recency
  );
}

function freezeCandidate(
  candidate: ContextCandidate,
): ContextCandidate {
  return Object.freeze({
    ...candidate,
  });
}

export function compileContext(
  candidates: readonly ContextCandidate[],
  policy: ContextCompilerPolicy,
  compiledAtMs: number,
): ContextCompileDecision {
  if (
    !validPolicy(policy)
    || !safeInteger(compiledAtMs)
    || !Array.isArray(candidates)
    || candidates.length > 4096
  ) {
    return Object.freeze({
      accepted: false,
      reason: 'invalid_policy',
      value: null,
    });
  }

  const seen = new Set<string>();

  for (const candidate of candidates) {
    if (
      !validCandidate(candidate)
      || seen.has(candidate.candidateRef)
      || candidate.observedAtMs > compiledAtMs
      || scopeConflicts(candidate, policy)
    ) {
      return Object.freeze({
        accepted: false,
        reason: 'invalid_candidate',
        value: null,
      });
    }

    seen.add(candidate.candidateRef);
  }

  const eligible =
    candidates.filter(
      (candidate) =>
        sensitivityAllowed(candidate, policy)
        && (
          candidate.expiresAtMs === null
          || candidate.expiresAtMs > compiledAtMs
        ),
    );

  const platform =
    eligible
      .filter(
        (candidate) =>
          candidate.authority === 'platform',
      )
      .sort(
        (left, right) =>
          left.observedAtMs - right.observedAtMs
          || left.candidateRef.localeCompare(
            right.candidateRef,
          ),
      );

  const requester =
    eligible
      .filter(
        (candidate) =>
          candidate.authority === 'requester',
      )
      .sort(
        (left, right) =>
          left.observedAtMs - right.observedAtMs
          || left.candidateRef.localeCompare(
            right.candidateRef,
          ),
      );

  const authoritative = [
    ...platform,
    ...requester,
  ];

  const authoritativeTokens =
    authoritative.reduce(
      (sum, candidate) =>
        sum + candidate.tokenEstimate,
      0,
    );

  if (
    authoritative.length > policy.maxEntries
    || authoritativeTokens > policy.maxTokens
  ) {
    return Object.freeze({
      accepted: false,
      reason: 'authoritative_budget_exhausted',
      value: null,
    });
  }

  const evidenceCandidates =
    eligible
      .filter(
        (candidate) =>
          candidate.authority === 'none',
      )
      .sort(
        (left, right) =>
          evidenceRank(right, compiledAtMs)
          - evidenceRank(left, compiledAtMs)
          || right.observedAtMs
            - left.observedAtMs
          || left.candidateRef.localeCompare(
            right.candidateRef,
          ),
      );

  const evidence: ContextCandidate[] = [];
  let totalTokens = authoritativeTokens;
  let totalEntries = authoritative.length;

  for (const candidate of evidenceCandidates) {
    if (
      totalEntries + 1 > policy.maxEntries
      || totalTokens + candidate.tokenEstimate
        > policy.maxTokens
    ) {
      continue;
    }

    evidence.push(freezeCandidate(candidate));
    totalTokens += candidate.tokenEstimate;
    totalEntries += 1;
  }

  const selectedCount =
    authoritative.length + evidence.length;

  return Object.freeze({
    accepted: true,
    reason: 'compiled',
    value: Object.freeze({
      platform:
        Object.freeze(
          platform.map(freezeCandidate),
        ),
      requester:
        Object.freeze(
          requester.map(freezeCandidate),
        ),
      evidence:
        Object.freeze(evidence),
      totalTokens,
      omittedCount:
        candidates.length - selectedCount,
      truncated:
        selectedCount < candidates.length,
      compiledAtMs,
    }),
  });
}

function utf8ByteLength(
  value: string,
): number {
  let bytes = 0;

  for (const symbol of value) {
    const codePoint =
      symbol.codePointAt(0) ?? 0;

    if (codePoint <= 0x7f) {
      bytes += 1;
    } else if (codePoint <= 0x7ff) {
      bytes += 2;
    } else if (codePoint <= 0xffff) {
      bytes += 3;
    } else {
      bytes += 4;
    }
  }

  return bytes;
}

function tokenEstimate(
  value: string,
): number {
  return Math.max(
    1,
    Math.ceil(
      utf8ByteLength(value) / 3,
    ),
  );
}

function memoryConfidence(
  sourceType: string,
): number {
  if (
    sourceType === 'explicit_user_statement'
    || sourceType
      === 'explicit_user_memory_request'
  ) {
    return 950;
  }

  if (sourceType === 'project_reference') {
    return 850;
  }

  if (sourceType === 'conversation_reference') {
    return 750;
  }

  return 650;
}

export function contextFromMemoryProjection(
  projection: MemoryRetrievalProjection,
): readonly ContextCandidate[] {
  return Object.freeze(
    projection.entries.map(
      (entry) =>
        Object.freeze({
          candidateRef:
            'context_memory_' + entry.memoryId,
          sourceKind: 'memory' as const,
          authority: 'none' as const,
          content: entry.content,
          provenanceRef: entry.sourceRef,
          observedAtMs: entry.updatedAtMs,
          expiresAtMs: null,
          relevanceScore:
            Math.min(
              1000,
              entry.relevanceScore * 200,
            ),
          confidenceScore:
            memoryConfidence(
              entry.sourceType,
            ),
          tokenEstimate:
            tokenEstimate(entry.content),
          sensitivity: 'private' as const,
          accountId: projection.accountId,
          workspaceId: null,
        }),
    ),
  );
}

export type ConflictSafeMemoryContext =
  Readonly<{
    accepted: boolean;
    candidates: readonly ContextCandidate[];
    conflictedMemoryIds: readonly string[];
    conflictGroupCount: number;
    requiresClarification: boolean;
  }>;

export function contextFromConflictSafeMemory(
  projection: MemoryRetrievalProjection,
  compaction: MemoryCompactionProjection,
): ConflictSafeMemoryContext {
  const gated =
    gateMemoryConflicts(
      projection,
      compaction,
    );

  if (!gated.accepted) {
    return Object.freeze({
      accepted: false,
      candidates: Object.freeze([]),
      conflictedMemoryIds:
        Object.freeze([]),
      conflictGroupCount: 0,
      requiresClarification: false,
    });
  }

  const candidates =
    gated.safeEntries.map(
      (entry) =>
        Object.freeze({
          candidateRef:
            'context_memory_' + entry.memoryId,
          sourceKind: 'memory' as const,
          authority: 'none' as const,
          content: entry.content,
          provenanceRef: entry.sourceRef,
          observedAtMs: entry.updatedAtMs,
          expiresAtMs: null,
          relevanceScore:
            Math.min(
              1000,
              entry.relevanceScore * 200,
            ),
          confidenceScore:
            memoryConfidence(
              entry.sourceType,
            ),
          tokenEstimate:
            tokenEstimate(entry.content),
          sensitivity: 'private' as const,
          accountId: projection.accountId,
          workspaceId: null,
        }),
    );

  return Object.freeze({
    accepted: true,
    candidates:
      Object.freeze(candidates),
    conflictedMemoryIds:
      gated.conflictedMemoryIds,
    conflictGroupCount:
      gated.conflictGroupCount,
    requiresClarification:
      gated.requiresClarification,
  });
}

function knowledgeConfidence(
  official: boolean,
  freshness: 'current' | 'stale',
): number {
  if (official && freshness === 'current') {
    return 950;
  }
  if (official) {
    return 700;
  }
  return freshness === 'current'
    ? 800
    : 550;
}

export function contextFromKnowledgeProjection(
  projection: KnowledgeProjection,
): readonly ContextCandidate[] {
  return Object.freeze(
    projection.entries.map(
      (entry) =>
        Object.freeze({
          candidateRef:
            'context_knowledge_' + entry.chunkId,
          sourceKind: 'knowledge' as const,
          authority: 'none' as const,
          content: entry.text,
          provenanceRef:
            entry.provenanceRef,
          observedAtMs:
            projection.generatedAtMs,
          expiresAtMs: null,
          relevanceScore:
            Math.min(
              1000,
              Math.max(
                1,
                entry.lexicalScore,
              ),
            ),
          confidenceScore:
            knowledgeConfidence(
              entry.official,
              entry.freshness,
            ),
          tokenEstimate:
            tokenEstimate(entry.text),
          sensitivity: 'private' as const,
          accountId: projection.accountId,
          workspaceId:
            projection.workspaceId,
        }),
    ),
  );
}
