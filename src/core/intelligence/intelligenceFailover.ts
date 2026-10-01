import {
  INTELLIGENCE_MODEL_REF,
  INTELLIGENCE_PROVIDER_REF,
  exactObject,
} from './intelligenceSecurity';

import {
  parseIntelligenceRoutePlan,
  type IntelligenceRoutePlan,
} from './intelligenceRouting';

export type IntelligenceAttemptPhase =
  | 'selected'
  | 'started'
  | 'output_observed'
  | 'closed';

export type IntelligenceFailureCode =
  | 'network_unavailable'
  | 'provider_unavailable'
  | 'timeout'
  | 'rate_limited'
  | 'invalid_response'
  | 'unsupported_input'
  | 'permission_denied'
  | 'cancelled'
  | 'policy_denied'
  | 'unknown';

export type IntelligenceFailoverDecision =
  Readonly<{
    allowed: boolean;
    requiresGenerationRotation: boolean;
    reason:
      | 'allowed_before_output'
      | 'allowed_with_generation_rotation'
      | 'invalid_input'
      | 'same_provider'
      | 'plan_not_issued'
      | 'candidate_not_in_plan'
      | 'attempt_closed'
      | 'failure_not_retryable'
      | 'input_replay_required'
      | 'explicit_restart_required'
      | 'output_mixing_forbidden';
  }>;

const PHASES =
  new Set<IntelligenceAttemptPhase>([
    'selected',
    'started',
    'output_observed',
    'closed',
  ]);

const FAILURES =
  new Set<IntelligenceFailureCode>([
    'network_unavailable',
    'provider_unavailable',
    'timeout',
    'rate_limited',
    'invalid_response',
    'unsupported_input',
    'permission_denied',
    'cancelled',
    'policy_denied',
    'unknown',
  ]);
const NON_RETRYABLE =
  new Set<IntelligenceFailureCode>([
    'unsupported_input',
    'permission_denied',
    'cancelled',
    'policy_denied',
  ]);

const KEYS =
  new Set([
    'plan',
    'currentProviderRef',
    'currentModelRef',
    'nextProviderRef',
    'nextModelRef',
    'attemptPhase',
    'failureCode',
    'retryable',
    'explicitRestart',
    'generationWillRotate',
    'bufferedInputReplayAvailable',
  ]);

function result(
  allowed: boolean,
  requiresGenerationRotation: boolean,
  reason:
    IntelligenceFailoverDecision['reason'],
): IntelligenceFailoverDecision {
  return Object.freeze({
    allowed,
    requiresGenerationRotation,
    reason,
  });
}
function includesCandidate(
  plan: IntelligenceRoutePlan,
  providerRef: string,
  modelRef: string,
): boolean {
  return [
    ...(plan.primary ? [plan.primary] : []),
    ...plan.fallbacks,
  ].some(
    (candidate) =>
      candidate.providerRef === providerRef
      && candidate.modelRef === modelRef,
  );
}

export function evaluateIntelligenceFailover(
  input: unknown,
): IntelligenceFailoverDecision {
  const record =
    exactObject(input, KEYS);

  if (!record) {
    return result(
      false,
      false,
      'invalid_input',
    );
  }

  const plan =
    parseIntelligenceRoutePlan(
      record.plan,
    );
  if (
    !plan
    || typeof record.currentProviderRef
      !== 'string'
    || !INTELLIGENCE_PROVIDER_REF.test(
      record.currentProviderRef,
    )
    || typeof record.currentModelRef
      !== 'string'
    || !INTELLIGENCE_MODEL_REF.test(
      record.currentModelRef,
    )
    || typeof record.nextProviderRef
      !== 'string'
    || !INTELLIGENCE_PROVIDER_REF.test(
      record.nextProviderRef,
    )
    || typeof record.nextModelRef
      !== 'string'
    || !INTELLIGENCE_MODEL_REF.test(
      record.nextModelRef,
    )
    || typeof record.attemptPhase
      !== 'string'
    || !PHASES.has(
      record.attemptPhase as
        IntelligenceAttemptPhase,
    )
    || typeof record.failureCode
      !== 'string'
    || !FAILURES.has(
      record.failureCode as
        IntelligenceFailureCode,
    )
    || typeof record.retryable
      !== 'boolean'
    || typeof record.explicitRestart
      !== 'boolean'
    || typeof record.generationWillRotate
      !== 'boolean'
    || typeof record.bufferedInputReplayAvailable
      !== 'boolean'
  ) {
    return result(
      false,
      false,
      'invalid_input',
    );
  }

  if (
    record.currentProviderRef
      === record.nextProviderRef
    && record.currentModelRef
      === record.nextModelRef
  ) {
    return result(
      false,
      false,
      'same_provider',
    );
  }

  if (
    !includesCandidate(
      plan,
      record.currentProviderRef as string,
      record.currentModelRef as string,
    )
    || !includesCandidate(
      plan,
      record.nextProviderRef as string,
      record.nextModelRef as string,
    )
  ) {
    return result(
      false,
      false,
      'candidate_not_in_plan',
    );
  }

  const phase =
    record.attemptPhase as
      IntelligenceAttemptPhase;
  const failure =
    record.failureCode as
      IntelligenceFailureCode;

  if (phase === 'closed') {
    return result(
      false,
      false,
      'attempt_closed',
    );
  }

  if (
    !record.retryable
    || NON_RETRYABLE.has(failure)
  ) {
    return result(
      false,
      false,
      'failure_not_retryable',
    );
  }
  if (phase === 'selected') {
    return result(
      true,
      false,
      'allowed_before_output',
    );
  }

  if (phase === 'started') {
    if (
      plan.service === 'stt'
      && !record.bufferedInputReplayAvailable
    ) {
      return result(
        false,
        false,
        'input_replay_required',
      );
    }

    return result(
      true,
      false,
      'allowed_before_output',
    );
  }

  if (!record.explicitRestart) {
    return result(
      false,
      true,
      'explicit_restart_required',
    );
  }

  if (!record.generationWillRotate) {
    return result(
      false,
      true,
      'output_mixing_forbidden',
    );
  }
  if (
    plan.service === 'stt'
    && !record.bufferedInputReplayAvailable
  ) {
    return result(
      false,
      true,
      'input_replay_required',
    );
  }

  return result(
    true,
    true,
    'allowed_with_generation_rotation',
  );
}
