import {
  safeInteger,
} from './intelligenceSecurity';

export type IntelligenceDeliberationSignal =
  Readonly<{
    complexityScore: number;
    uncertaintyScore: number;
    externalTruthRequired: boolean;
    failedToolAttempts: number;
    verificationRequired: boolean;
    eligibleIndependentProviders: number;
  }>;

export type IntelligenceDeliberationRoutingPolicy =
  Readonly<{
    complexityThreshold: number;
    uncertaintyThreshold: number;
    toolFailureThreshold: number;
    reviewExternalTruth: boolean;
    minimumIndependentProviders: number;
  }>;

export type IntelligenceDeliberationMode =
  | 'single'
  | 'parallel-review'
  | 'blocked';

export type IntelligenceDeliberationRoutingDecision =
  Readonly<{
    mode: IntelligenceDeliberationMode;
    reason:
      | 'single_sufficient'
      | 'complexity'

      | 'uncertainty'
      | 'external_truth'
      | 'tool_failure'
      | 'verification_required'
      | 'independent_review_unavailable'
      | 'invalid_input';
  }>;

function score(
  value: unknown,
): value is number {
  return (
    safeInteger(value)
    && Number(value) <= 1000
  );
}

export function validateIntelligenceDeliberationSignal(
  signal: IntelligenceDeliberationSignal,
): boolean {
  return (
    score(signal.complexityScore)
    && score(signal.uncertaintyScore)
    && typeof signal.externalTruthRequired === 'boolean'
    && safeInteger(signal.failedToolAttempts)
    && signal.failedToolAttempts <= 100
    && typeof signal.verificationRequired === 'boolean'
    && safeInteger(signal.eligibleIndependentProviders)
    && signal.eligibleIndependentProviders <= 32
  );
}

export function validateIntelligenceDeliberationRoutingPolicy(
  policy: IntelligenceDeliberationRoutingPolicy,
): boolean {

  return (
    score(policy.complexityThreshold)
    && score(policy.uncertaintyThreshold)
    && safeInteger(policy.toolFailureThreshold)
    && policy.toolFailureThreshold >= 1
    && policy.toolFailureThreshold <= 100
    && typeof policy.reviewExternalTruth === 'boolean'
    && safeInteger(policy.minimumIndependentProviders)
    && policy.minimumIndependentProviders >= 1
    && policy.minimumIndependentProviders <= 8
  );
}

function requestedReason(
  signal: IntelligenceDeliberationSignal,
  policy: IntelligenceDeliberationRoutingPolicy,
): IntelligenceDeliberationRoutingDecision['reason'] | null {
  if (signal.verificationRequired) {
    return 'verification_required';
  }

  if (signal.complexityScore >= policy.complexityThreshold) {
    return 'complexity';
  }

  if (signal.uncertaintyScore >= policy.uncertaintyThreshold) {
    return 'uncertainty';
  }

  if (
    signal.externalTruthRequired
    && policy.reviewExternalTruth
  ) {
    return 'external_truth';
  }

  if (
    signal.failedToolAttempts >= policy.toolFailureThreshold
  ) {

    return 'tool_failure';
  }

  return null;
}

export function decideIntelligenceDeliberationMode(
  signal: IntelligenceDeliberationSignal,
  policy: IntelligenceDeliberationRoutingPolicy,
): IntelligenceDeliberationRoutingDecision {
  if (
    !validateIntelligenceDeliberationSignal(signal)
    || !validateIntelligenceDeliberationRoutingPolicy(policy)
  ) {
    return Object.freeze({
      mode: 'blocked',
      reason: 'invalid_input',
    });
  }

  const reason = requestedReason(signal, policy);

  if (!reason) {
    return Object.freeze({
      mode: 'single',
      reason: 'single_sufficient',
    });
  }

  if (
    signal.eligibleIndependentProviders
    < policy.minimumIndependentProviders
  ) {
    return Object.freeze({
      mode: signal.verificationRequired
        ? 'blocked'
        : 'single',
      reason: 'independent_review_unavailable',
    });
  }

  return Object.freeze({
    mode: 'parallel-review',
    reason,
  });
}

export const DEFAULT_INTELLIGENCE_DELIBERATION_ROUTING_POLICY =
  Object.freeze({
    complexityThreshold: 700,
    uncertaintyThreshold: 550,
    toolFailureThreshold: 1,
    reviewExternalTruth: true,
    minimumIndependentProviders: 2,
  } satisfies IntelligenceDeliberationRoutingPolicy);
