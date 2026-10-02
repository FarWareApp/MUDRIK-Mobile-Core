import {
  INTELLIGENCE_MODEL_REF,
  INTELLIGENCE_PLAN_ID,
  INTELLIGENCE_PROVIDER_REF,
  INTELLIGENCE_REQUEST_ID,
  exactObject,
  isSafePublicReference,
  safeInteger,
} from './intelligenceSecurity';

const BODY =
  '[a-z0-9][a-z0-9_-]{15,127}';

const PROPOSAL_ID =
  new RegExp(
    '^intelligence_proposal_' + BODY + '$',
  );

const REVIEW_ID =
  new RegExp(
    '^intelligence_review_' + BODY + '$',
  );

export type IntelligenceDeliberationPolicy =
  Readonly<{
    maxProposals: number;
    minIndependentReviews: number;
    minimumReviewScore: number;
    minimumWinnerMargin: number;
    maxReviewAgeMs: number;
  }>;

export type IntelligenceProposal =
  Readonly<{
    protocolVersion: '1.0';
    requestId: string;
    planId: string;
    proposalId: string;
    providerRef: string;
    modelRef: string;
    generation: number;
    resultRef: string;
    completedAtMs: number;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

export type IntelligenceReviewVerdict =
  | 'accept'
  | 'reject'
  | 'uncertain';

export type IntelligenceReview =
  Readonly<{
    protocolVersion: '1.0';
    reviewId: string;
    requestId: string;
    planId: string;
    proposalId: string;
    reviewerProviderRef: string;
    reviewerModelRef: string;

    verdict: IntelligenceReviewVerdict;
    correctnessScore: number;
    groundednessScore: number;
    instructionFitScore: number;
    policyComplianceScore: number;
    toolEvidenceScore: number | null;
    observedAtMs: number;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

export type IntelligenceDeliberationCandidate =
  Readonly<{
    proposalId: string;
    providerRef: string;
    modelRef: string;
    resultRef: string;
    reviewCount: number;
    aggregateScore: number;
  }>;

export type IntelligenceDeliberationDecision =
  Readonly<{
    accepted: boolean;
    reason:
      | 'selected'
      | 'no_verified_proposal'
      | 'needs_more_evidence'
      | 'invalid_policy'
      | 'invalid_binding';

    selected: IntelligenceDeliberationCandidate | null;
    eligible: readonly IntelligenceDeliberationCandidate[];
  }>;

const PROPOSAL_KEYS =
  new Set([
    'protocolVersion',
    'requestId',
    'planId',
    'proposalId',
    'providerRef',
    'modelRef',
    'generation',
    'resultRef',
    'completedAtMs',
    'grantsExecutionAuthority',
    'grantsSensorAuthority',
    'grantsApprovalAuthority',
    'grantsCapabilityAuthority',
  ]);

const REVIEW_KEYS =
  new Set([
    'protocolVersion',
    'reviewId',
    'requestId',
    'planId',
    'proposalId',
    'reviewerProviderRef',
    'reviewerModelRef',
    'verdict',
    'correctnessScore',
    'groundednessScore',

    'instructionFitScore',
    'policyComplianceScore',
    'toolEvidenceScore',
    'observedAtMs',
    'grantsExecutionAuthority',
    'grantsSensorAuthority',
    'grantsApprovalAuthority',
    'grantsCapabilityAuthority',
  ]);

function authorityFree(
  record: Record<string, unknown>,
): boolean {
  return (
    record.grantsExecutionAuthority === false
    && record.grantsSensorAuthority === false
    && record.grantsApprovalAuthority === false
    && record.grantsCapabilityAuthority === false
  );
}

function boundedScore(
  value: unknown,
): value is number {
  return (
    safeInteger(value)
    && Number(value) <= 1000
  );
}

export function parseIntelligenceProposal(
  input: unknown,
): IntelligenceProposal | null {
  const record = exactObject(input, PROPOSAL_KEYS);

  if (
    !record
    || record.protocolVersion !== '1.0'

    || typeof record.requestId !== 'string'
    || !INTELLIGENCE_REQUEST_ID.test(record.requestId)
    || typeof record.planId !== 'string'
    || !INTELLIGENCE_PLAN_ID.test(record.planId)
    || typeof record.proposalId !== 'string'
    || !PROPOSAL_ID.test(record.proposalId)
    || typeof record.providerRef !== 'string'
    || !INTELLIGENCE_PROVIDER_REF.test(
      record.providerRef,
    )
    || typeof record.modelRef !== 'string'
    || !INTELLIGENCE_MODEL_REF.test(record.modelRef)
    || !safeInteger(record.generation)
    || !isSafePublicReference(record.resultRef, 240)
    || !safeInteger(record.completedAtMs)
    || !authorityFree(record)
  ) {
    return null;
  }

  return Object.freeze({
    protocolVersion: '1.0',
    requestId: record.requestId as string,
    planId: record.planId as string,
    proposalId: record.proposalId as string,
    providerRef: record.providerRef as string,
    modelRef: record.modelRef as string,
    generation: record.generation as number,
    resultRef: record.resultRef as string,

    completedAtMs: record.completedAtMs as number,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}

export function parseIntelligenceReview(
  input: unknown,
): IntelligenceReview | null {
  const record = exactObject(input, REVIEW_KEYS);

  const verdicts =
    new Set<IntelligenceReviewVerdict>([
      'accept',
      'reject',
      'uncertain',
    ]);

  if (
    !record
    || record.protocolVersion !== '1.0'
    || typeof record.reviewId !== 'string'
    || !REVIEW_ID.test(record.reviewId)
    || typeof record.requestId !== 'string'
    || !INTELLIGENCE_REQUEST_ID.test(record.requestId)
    || typeof record.planId !== 'string'
    || !INTELLIGENCE_PLAN_ID.test(record.planId)
    || typeof record.proposalId !== 'string'
    || !PROPOSAL_ID.test(record.proposalId)

    || typeof record.reviewerProviderRef !== 'string'
    || !INTELLIGENCE_PROVIDER_REF.test(
      record.reviewerProviderRef,
    )
    || typeof record.reviewerModelRef !== 'string'
    || !INTELLIGENCE_MODEL_REF.test(
      record.reviewerModelRef,
    )
    || typeof record.verdict !== 'string'
    || !verdicts.has(
      record.verdict as IntelligenceReviewVerdict,
    )
    || !boundedScore(record.correctnessScore)
    || !boundedScore(record.groundednessScore)
    || !boundedScore(record.instructionFitScore)
    || !boundedScore(record.policyComplianceScore)
    || (
      record.toolEvidenceScore !== null
      && !boundedScore(record.toolEvidenceScore)
    )
    || !safeInteger(record.observedAtMs)
    || !authorityFree(record)
  ) {
    return null;
  }

  return Object.freeze({
    protocolVersion: '1.0',
    reviewId: record.reviewId as string,

    requestId: record.requestId as string,
    planId: record.planId as string,
    proposalId: record.proposalId as string,
    reviewerProviderRef:
      record.reviewerProviderRef as string,
    reviewerModelRef:
      record.reviewerModelRef as string,
    verdict:
      record.verdict as IntelligenceReviewVerdict,
    correctnessScore:
      record.correctnessScore as number,
    groundednessScore:
      record.groundednessScore as number,
    instructionFitScore:
      record.instructionFitScore as number,
    policyComplianceScore:
      record.policyComplianceScore as number,
    toolEvidenceScore:
      record.toolEvidenceScore as number | null,
    observedAtMs: record.observedAtMs as number,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}

export function validateIntelligenceDeliberationPolicy(
  policy: IntelligenceDeliberationPolicy,
): boolean {

  return (
    safeInteger(policy.maxProposals)
    && policy.maxProposals >= 1
    && policy.maxProposals <= 5
    && safeInteger(policy.minIndependentReviews)
    && policy.minIndependentReviews >= 1
    && policy.minIndependentReviews <= 5
    && policy.minIndependentReviews
      <= Math.max(1, policy.maxProposals - 1)
    && boundedScore(policy.minimumReviewScore)
    && boundedScore(policy.minimumWinnerMargin)
    && safeInteger(policy.maxReviewAgeMs)
    && policy.maxReviewAgeMs >= 1_000
    && policy.maxReviewAgeMs <= 24 * 60 * 60 * 1000
  );
}

function reviewScore(
  review: IntelligenceReview,
): number {
  const values = [
    review.correctnessScore,
    review.groundednessScore,
    review.instructionFitScore,
    review.policyComplianceScore,
  ];

  if (review.toolEvidenceScore !== null) {
    values.push(review.toolEvidenceScore);
  }

  return Math.round(
    values.reduce((sum, value) => sum + value, 0)
      / values.length,
  );
}

function independentReviewerKey(
  review: IntelligenceReview,
): string {
  return (
    review.reviewerProviderRef
    + ':'
    + review.reviewerModelRef
  );
}

function sameModelPair(
  proposal: IntelligenceProposal,
  review: IntelligenceReview,
): boolean {
  return (
    proposal.providerRef
      === review.reviewerProviderRef
    && proposal.modelRef
      === review.reviewerModelRef
  );
}

function invalidDecision(
  reason:
    | 'invalid_policy'
    | 'invalid_binding',
): IntelligenceDeliberationDecision {
  return Object.freeze({
    accepted: false,
    reason,
    selected: null,
    eligible: Object.freeze([]),
  });
}

export function resolveIntelligenceDeliberation(
  proposals: readonly IntelligenceProposal[],
  reviews: readonly IntelligenceReview[],
  policy: IntelligenceDeliberationPolicy,
  evaluatedAtMs: number,
): IntelligenceDeliberationDecision {

  if (
    !validateIntelligenceDeliberationPolicy(policy)
    || !safeInteger(evaluatedAtMs)
  ) {
    return invalidDecision('invalid_policy');
  }

  if (
    proposals.length < 1
    || proposals.length > policy.maxProposals
  ) {
    return invalidDecision('invalid_binding');
  }

  const requestId = proposals[0]?.requestId;
  const planId = proposals[0]?.planId;
  const proposalIds = new Set<string>();
  const authorPairs = new Set<string>();

  for (const proposal of proposals) {
    const authorKey =
      proposal.providerRef + ':' + proposal.modelRef;

    if (
      proposal.requestId !== requestId
      || proposal.planId !== planId
      || proposal.completedAtMs > evaluatedAtMs
      || proposalIds.has(proposal.proposalId)
      || authorPairs.has(authorKey)
    ) {
      return invalidDecision('invalid_binding');
    }

    proposalIds.add(proposal.proposalId);
    authorPairs.add(authorKey);
  }

  const reviewsByProposal =
    new Map<string, IntelligenceReview[]>();

  const reviewIds = new Set<string>();
  const reviewBindings = new Set<string>();

  for (const review of reviews) {
    if (
      review.requestId !== requestId
      || review.planId !== planId
      || !proposalIds.has(review.proposalId)
      || review.observedAtMs > evaluatedAtMs
      || evaluatedAtMs - review.observedAtMs
        > policy.maxReviewAgeMs
      || reviewIds.has(review.reviewId)
    ) {
      return invalidDecision('invalid_binding');
    }

    const bindingKey =
      review.proposalId
      + ':'
      + independentReviewerKey(review);

    if (reviewBindings.has(bindingKey)) {
      return invalidDecision('invalid_binding');
    }

    const proposal =
      proposals.find(
        (item) => item.proposalId === review.proposalId,
      );

    if (!proposal || sameModelPair(proposal, review)) {
      return invalidDecision('invalid_binding');
    }

    reviewIds.add(review.reviewId);
    reviewBindings.add(bindingKey);
    const list =
      reviewsByProposal.get(review.proposalId) ?? [];
    list.push(review);
    reviewsByProposal.set(review.proposalId, list);
  }

  const eligible: IntelligenceDeliberationCandidate[] = [];

  for (const proposal of proposals) {
    const proposalReviews =
      reviewsByProposal.get(proposal.proposalId) ?? [];
    const acceptedReviews =
      proposalReviews.filter(
        (review) => review.verdict === 'accept',
      );
    const hasReject =
      proposalReviews.some(
        (review) => review.verdict === 'reject',
      );

    if (
      hasReject
      || acceptedReviews.length
        < policy.minIndependentReviews
    ) {
      continue;
    }

    const aggregateScore =
      Math.round(
        acceptedReviews.reduce(
          (sum, review) => sum + reviewScore(review),
          0,
        ) / acceptedReviews.length,
      );

    if (aggregateScore < policy.minimumReviewScore) {
      continue;
    }

    eligible.push(
      Object.freeze({
        proposalId: proposal.proposalId,
        providerRef: proposal.providerRef,
        modelRef: proposal.modelRef,
        resultRef: proposal.resultRef,
        reviewCount: acceptedReviews.length,
        aggregateScore,
      }),
    );
  }

  eligible.sort(
    (left, right) =>
      right.aggregateScore - left.aggregateScore
      || right.reviewCount - left.reviewCount
      || left.providerRef.localeCompare(right.providerRef)
      || left.modelRef.localeCompare(right.modelRef),
  );

  if (eligible.length === 0) {
    return Object.freeze({
      accepted: false,
      reason: 'no_verified_proposal',
      selected: null,
      eligible: Object.freeze([]),
    });
  }

  const winner = eligible[0];
  const runnerUp = eligible[1];

  if (
    runnerUp
    && winner.aggregateScore - runnerUp.aggregateScore
      < policy.minimumWinnerMargin
  ) {
    return Object.freeze({
      accepted: false,
      reason: 'needs_more_evidence',
      selected: null,
      eligible: Object.freeze([...eligible]),
    });
  }

  return Object.freeze({
    accepted: true,
    reason: 'selected',
    selected: winner,
    eligible: Object.freeze([...eligible]),
  });
}
