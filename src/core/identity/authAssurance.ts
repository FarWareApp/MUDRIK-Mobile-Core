import type { CapabilityRisk } from '../security/capabilityRisk';
import { parseTrustedEvaluationTime } from './trustedEvaluationTime';

export type AuthenticationAssurance =
  | 'none'
  | 'session'
  | 'verified'
  | 'phishing_resistant';

export type StepUpRequirement = Readonly<{
  minimumAssurance: AuthenticationAssurance;
  maxAuthenticationAgeMs: number | null;
  requiresExplicitApproval: boolean;
}>;

export type AuthenticationDecisionReason =
  | 'allowed'
  | 'invalid_input'
  | 'invalid_evaluation_time'
  | 'insufficient_assurance'
  | 'stale_authentication';

export type AuthenticationDecision = Readonly<{
  allowed: boolean;
  reason: AuthenticationDecisionReason;
  required: StepUpRequirement;
}>;

const ASSURANCE_RANK: Readonly<Record<AuthenticationAssurance, number>> = {
  none: 0,
  session: 1,
  verified: 2,
  phishing_resistant: 3,
};

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const FIVE_MINUTES_MS = 5 * 60 * 1000;

export const BASELINE_STEP_UP_REQUIREMENTS: Readonly<
  Record<CapabilityRisk, StepUpRequirement>
> = {
  low: {
    minimumAssurance: 'session',
    maxAuthenticationAgeMs: null,
    requiresExplicitApproval: false,
  },
  medium: {
    minimumAssurance: 'session',
    maxAuthenticationAgeMs: null,
    requiresExplicitApproval: false,
  },
  high: {
    minimumAssurance: 'verified',
    maxAuthenticationAgeMs: FIFTEEN_MINUTES_MS,
    requiresExplicitApproval: false,
  },
  critical: {
    minimumAssurance: 'phishing_resistant',
    maxAuthenticationAgeMs: FIVE_MINUTES_MS,
    requiresExplicitApproval: true,
  },
};

function isAssurance(value: unknown): value is AuthenticationAssurance {
  return (
    value === 'none' ||
    value === 'session' ||
    value === 'verified' ||
    value === 'phishing_resistant'
  );
}

function isCapabilityRisk(value: unknown): value is CapabilityRisk {
  return (
    value === 'low' ||
    value === 'medium' ||
    value === 'high' ||
    value === 'critical'
  );
}

export function getStepUpRequirement(
  risk: CapabilityRisk,
): StepUpRequirement {
  return BASELINE_STEP_UP_REQUIREMENTS[risk];
}

export function evaluateAuthenticationAssurance(
  input: unknown,
  trustedEvaluationTimeMsInput?: unknown,
): AuthenticationDecision {
  const fallback = BASELINE_STEP_UP_REQUIREMENTS.critical;

  if (
    typeof input !== 'object' ||
    input === null ||
    Array.isArray(input)
  ) {
    return { allowed: false, reason: 'invalid_input', required: fallback };
  }

  const record = input as Record<string, unknown>;
  const allowedKeys = new Set([
    'risk',
    'assurance',
    'nowMs',
    'authenticatedAtMs',
  ]);

  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return { allowed: false, reason: 'invalid_input', required: fallback };
  }

  if (
    !isCapabilityRisk(record.risk) ||
    !isAssurance(record.assurance) ||
    typeof record.nowMs !== 'number' ||
    !Number.isFinite(record.nowMs)
  ) {
    return { allowed: false, reason: 'invalid_input', required: fallback };
  }

  const requirement = getStepUpRequirement(record.risk);

  if (
    ASSURANCE_RANK[record.assurance] <
    ASSURANCE_RANK[requirement.minimumAssurance]
  ) {
    return {
      allowed: false,
      reason: 'insufficient_assurance',
      required: requirement,
    };
  }

  const requiresTrustedTime =
    requirement.maxAuthenticationAgeMs !== null ||
    record.authenticatedAtMs !== undefined;

  const trustedEvaluationTimeMs = requiresTrustedTime
    ? parseTrustedEvaluationTime(trustedEvaluationTimeMsInput)
    : null;

  if (requiresTrustedTime && trustedEvaluationTimeMs === null) {
    return {
      allowed: false,
      reason: 'invalid_evaluation_time',
      required: requirement,
    };
  }

  if (requirement.maxAuthenticationAgeMs !== null) {
    if (
      typeof record.authenticatedAtMs !== 'number' ||
      !Number.isSafeInteger(record.authenticatedAtMs) ||
      record.authenticatedAtMs < 0 ||
      record.authenticatedAtMs > trustedEvaluationTimeMs! ||
      trustedEvaluationTimeMs! - record.authenticatedAtMs >
        requirement.maxAuthenticationAgeMs
    ) {
      return {
        allowed: false,
        reason: 'stale_authentication',
        required: requirement,
      };
    }
  } else if (
    record.authenticatedAtMs !== undefined &&
    (
      typeof record.authenticatedAtMs !== 'number' ||
      !Number.isSafeInteger(record.authenticatedAtMs) ||
      record.authenticatedAtMs < 0 ||
      record.authenticatedAtMs > trustedEvaluationTimeMs!
    )
  ) {
    return { allowed: false, reason: 'invalid_input', required: requirement };
  }

  return { allowed: true, reason: 'allowed', required: requirement };
}
