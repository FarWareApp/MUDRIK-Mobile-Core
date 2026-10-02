import {
  safeInteger,
} from './intelligenceSecurity';

import {
  parseIntelligenceRoutePlan,
  type IntelligenceRouteCandidate,
} from './intelligenceRouting';

import {
  decideIntelligenceDeliberationMode,
  type IntelligenceDeliberationRoutingPolicy,
  type IntelligenceDeliberationSignal,
} from './intelligenceDeliberationRouting';

export type IntelligenceDeliberationExecutionPlan =
  Readonly<{
    accepted: boolean;
    mode:
      | 'single'
      | 'parallel-review'
      | 'blocked';
    reason:
      | 'single'
      | 'parallel_review'
      | 'verification_blocked'
      | 'no_candidates'
      | 'invalid_input';
    candidates:
      readonly IntelligenceRouteCandidate[];
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

function fail(

  reason:
    | 'verification_blocked'
    | 'no_candidates'
    | 'invalid_input',
): IntelligenceDeliberationExecutionPlan {
  return Object.freeze({
    accepted: false,
    mode: 'blocked',
    reason,
    candidates: Object.freeze([]),
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}

function uniqueCandidates(
  candidates:
    readonly IntelligenceRouteCandidate[],
): readonly IntelligenceRouteCandidate[] {
  const seen = new Set<string>();
  const output: IntelligenceRouteCandidate[] = [];

  for (const candidate of candidates) {
    const key =
      candidate.providerRef + ':' + candidate.modelRef;

    if (!seen.has(key)) {
      seen.add(key);
      output.push(candidate);
    }
  }

  return Object.freeze(output);
}

export function buildIntelligenceDeliberationExecutionPlan(
  routePlanInput: unknown,
  signal: IntelligenceDeliberationSignal,
  policy: IntelligenceDeliberationRoutingPolicy,
  maxProposals: number,
): IntelligenceDeliberationExecutionPlan {
  const routePlan =
    parseIntelligenceRoutePlan(routePlanInput);

  if (
    !routePlan
    || !safeInteger(maxProposals)
    || maxProposals < 1
    || maxProposals > 5
  ) {
    return fail('invalid_input');
  }

  if (!routePlan.primary) {
    return fail('no_candidates');
  }

  const candidates =
    uniqueCandidates([
      routePlan.primary,
      ...routePlan.fallbacks,
    ]);

  const effectiveSignal =
    Object.freeze({
      ...signal,
      eligibleIndependentProviders:
        candidates.length,
    });

  const decision =
    decideIntelligenceDeliberationMode(
      effectiveSignal,
      policy,
    );

  if (decision.mode === 'blocked') {
    return fail('verification_blocked');
  }

  if (decision.mode === 'single') {
    return Object.freeze({
      accepted: true,
      mode: 'single',
      reason: 'single',
      candidates:
        Object.freeze([routePlan.primary]),
      grantsExecutionAuthority: false,
      grantsSensorAuthority: false,
      grantsApprovalAuthority: false,
      grantsCapabilityAuthority: false,
    });
  }

  const selected =
    candidates.slice(
      0,
      Math.min(maxProposals, candidates.length),
    );

  if (selected.length < 2) {
    return fail('verification_blocked');
  }

  return Object.freeze({
    accepted: true,
    mode: 'parallel-review',
    reason: 'parallel_review',
    candidates: Object.freeze(selected),
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}
