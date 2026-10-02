import {
  safeInteger,
  isSafeReference,
} from './knowledgeSecurity';

const DIGEST =
  /^[a-f0-9]{64}$/;

const BODY =
  '[a-z0-9][a-z0-9_-]{15,127}';

const CLAIM_ID =
  new RegExp('^knowledge_claim_' + BODY + '$');

export type KnowledgeClaimObservation =
  Readonly<{
    claimId: string;
    valueDigest: string;
    sourceId: string;
    publisher: string;
    provenanceRef: string;
    official: boolean;
    current: boolean;
    confidenceScore: number;
    observedAtMs: number;
  }>;

export type KnowledgeConsensusPolicy =
  Readonly<{
    minimumIndependentSources: number;
    minimumWeightedSupport: number;
    contradictionVetoWeight: number;
    maximumObservationAgeMs: number;
    requireOfficialSupport: boolean;
    requireCurrentSupport: boolean;
  }>;

export type KnowledgeConsensusDecision =
  Readonly<{
    accepted: boolean;
    reason:
      | 'supported'
      | 'invalid_input'
      | 'insufficient_independence'
      | 'insufficient_support'
      | 'official_support_missing'
      | 'current_support_missing'
      | 'contradicted'
      | 'no_observations';
    selectedValueDigest: string | null;
    independentSupporters: number;
    weightedSupport: number;
    weightedOpposition: number;
    conflictingValueDigests: readonly string[];
  }>;

function safeScore(
  value: unknown,
): value is number {
  return (
    safeInteger(value)
    && Number(value) <= 1000
  );
}

function validObservation(
  value: KnowledgeClaimObservation,
  trustedNowMs: number,
  maximumObservationAgeMs: number,
): boolean {
  return (
    CLAIM_ID.test(value.claimId)
    && DIGEST.test(value.valueDigest)
    && isSafeReference(value.sourceId, 240)
    && typeof value.publisher === 'string'
    && value.publisher.length >= 1
    && value.publisher.length <= 240
    && isSafeReference(value.provenanceRef, 240)
    && typeof value.official === 'boolean'
    && typeof value.current === 'boolean'
    && safeScore(value.confidenceScore)
    && safeInteger(value.observedAtMs)
    && value.observedAtMs <= trustedNowMs
    && trustedNowMs - value.observedAtMs
      <= maximumObservationAgeMs
  );
}

export function validateKnowledgeConsensusPolicy(
  policy: KnowledgeConsensusPolicy,
): boolean {
  return (
    safeInteger(policy.minimumIndependentSources)
    && policy.minimumIndependentSources >= 1
    && policy.minimumIndependentSources <= 16
    && safeInteger(policy.minimumWeightedSupport)
    && policy.minimumWeightedSupport >= 1
    && policy.minimumWeightedSupport <= 100_000
    && safeInteger(policy.contradictionVetoWeight)
    && policy.contradictionVetoWeight >= 1
    && policy.contradictionVetoWeight <= 100_000
    && safeInteger(policy.maximumObservationAgeMs)
    && policy.maximumObservationAgeMs >= 1_000
    && policy.maximumObservationAgeMs
      <= 365 * 24 * 60 * 60 * 1000
    && typeof policy.requireOfficialSupport === 'boolean'
    && typeof policy.requireCurrentSupport === 'boolean'
  );
}

function sourceWeight(
  observation: KnowledgeClaimObservation,
): number {
  const officialBonus =
    observation.official ? 400 : 0;
  const freshnessBonus =
    observation.current ? 200 : 0;

  return (
    observation.confidenceScore
    + officialBonus
    + freshnessBonus
  );
}

function emptyDecision(
  reason: KnowledgeConsensusDecision['reason'],
): KnowledgeConsensusDecision {
  return Object.freeze({
    accepted: false,
    reason,
    selectedValueDigest: null,
    independentSupporters: 0,
    weightedSupport: 0,
    weightedOpposition: 0,
    conflictingValueDigests: Object.freeze([]),
  });
}

export function evaluateKnowledgeConsensus(
  claimId: string,
  observations: readonly KnowledgeClaimObservation[],
  policy: KnowledgeConsensusPolicy,
  trustedNowMs: number,
): KnowledgeConsensusDecision {
  if (
    !CLAIM_ID.test(claimId)
    || !validateKnowledgeConsensusPolicy(policy)
    || !safeInteger(trustedNowMs)
    || !Array.isArray(observations)
    || observations.length > 1024
  ) {
    return emptyDecision('invalid_input');
  }

  if (observations.length === 0) {
    return emptyDecision('no_observations');
  }

  const seenSourceIds = new Set<string>();
  const valid: KnowledgeClaimObservation[] = [];

  for (const observation of observations) {
    if (
      observation.claimId !== claimId
      || !validObservation(
        observation,
        trustedNowMs,
        policy.maximumObservationAgeMs,
      )
      || seenSourceIds.has(observation.sourceId)
    ) {
      return emptyDecision('invalid_input');
    }

    seenSourceIds.add(observation.sourceId);
    valid.push(observation);
  }

  const byValue =
    new Map<
      string,
      {
        supporters: KnowledgeClaimObservation[];
        weight: number;
      }
    >();

  for (const observation of valid) {
    const group =
      byValue.get(observation.valueDigest)
      ?? {
        supporters: [],
        weight: 0,
      };

    group.supporters.push(observation);
    group.weight += sourceWeight(observation);
    byValue.set(
      observation.valueDigest,
      group,
    );
  }

  const ranked =
    [...byValue.entries()]
      .sort(
        (left, right) =>
          right[1].weight - left[1].weight
          || right[1].supporters.length
            - left[1].supporters.length
          || left[0].localeCompare(right[0]),
      );

  const winner = ranked[0];
  if (!winner) {
    return emptyDecision('no_observations');
  }

  const [selectedValueDigest, selected] = winner;
  const opposition =
    ranked
      .slice(1)
      .reduce(
        (sum, entry) => sum + entry[1].weight,
        0,
      );

  const conflicts =
    Object.freeze(
      ranked
        .slice(1)
        .map((entry) => entry[0]),
    );

  const hasOfficial =
    selected.supporters.some(
      (observation) => observation.official,
    );
  const hasCurrent =
    selected.supporters.some(
      (observation) => observation.current,
    );

  if (
    opposition
      >= policy.contradictionVetoWeight
  ) {
    return Object.freeze({
      accepted: false,
      reason: 'contradicted',
      selectedValueDigest,
      independentSupporters:
        selected.supporters.length,
      weightedSupport: selected.weight,
      weightedOpposition: opposition,
      conflictingValueDigests: conflicts,
    });
  }

  if (
    selected.supporters.length
      < policy.minimumIndependentSources
  ) {
    return Object.freeze({
      accepted: false,
      reason: 'insufficient_independence',
      selectedValueDigest,
      independentSupporters:
        selected.supporters.length,
      weightedSupport: selected.weight,
      weightedOpposition: opposition,
      conflictingValueDigests: conflicts,
    });
  }

  if (
    selected.weight
      < policy.minimumWeightedSupport
  ) {
    return Object.freeze({
      accepted: false,
      reason: 'insufficient_support',
      selectedValueDigest,
      independentSupporters:
        selected.supporters.length,
      weightedSupport: selected.weight,
      weightedOpposition: opposition,
      conflictingValueDigests: conflicts,
    });
  }

  if (
    policy.requireOfficialSupport
    && !hasOfficial
  ) {
    return Object.freeze({
      accepted: false,
      reason: 'official_support_missing',
      selectedValueDigest,
      independentSupporters:
        selected.supporters.length,
      weightedSupport: selected.weight,
      weightedOpposition: opposition,
      conflictingValueDigests: conflicts,
    });
  }

  if (
    policy.requireCurrentSupport
    && !hasCurrent
  ) {
    return Object.freeze({
      accepted: false,
      reason: 'current_support_missing',
      selectedValueDigest,
      independentSupporters:
        selected.supporters.length,
      weightedSupport: selected.weight,
      weightedOpposition: opposition,
      conflictingValueDigests: conflicts,
    });
  }

  return Object.freeze({
    accepted: true,
    reason: 'supported',
    selectedValueDigest,
    independentSupporters:
      selected.supporters.length,
    weightedSupport: selected.weight,
    weightedOpposition: opposition,
    conflictingValueDigests: conflicts,
  });
}

export const DEFAULT_KNOWLEDGE_CONSENSUS_POLICY =
  Object.freeze({
    minimumIndependentSources: 2,
    minimumWeightedSupport: 1800,
    contradictionVetoWeight: 1200,
    maximumObservationAgeMs:
      30 * 24 * 60 * 60 * 1000,
    requireOfficialSupport: false,
    requireCurrentSupport: true,
  } satisfies KnowledgeConsensusPolicy);
