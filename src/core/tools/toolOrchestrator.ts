import {
  safeInteger,
  safeReference,
} from '../brain/brainSecurity';

import {
  GOAL_ID,
  GOAL_PLAN_ID,
  GOAL_STEP_ID,
} from '../agent/goalContract';

import {
  isCapabilityId,
  type CapabilityId,
} from '../security/capabilities';

const BODY =
  '[a-z0-9][a-z0-9_-]{15,127}';

export const TOOL_REF =
  new RegExp('^tool_' + BODY + '$');

export type ToolHealth =
  | 'ready'
  | 'degraded'
  | 'unavailable';

export type ToolExecutionMode =
  | 'local'
  | 'remote';

export type ToolSideEffectSupport =
  | 'none'
  | 'reversible'
  | 'any';

export type ToolRegistration =
  Readonly<{
    protocolVersion: '1.0';
    toolRef: string;
    adapterRef: string;
    supportedOperations: readonly string[];
    capabilities: readonly CapabilityId[];
    executionMode: ToolExecutionMode;
    health: ToolHealth;
    trustScore: number;
    qualityScore: number;
    firstResultMs: number | null;
    maxConcurrent: number;
    parallelSafe: boolean;
    supportsRollback: boolean;
    sideEffectSupport: ToolSideEffectSupport;
    registeredAtMs: number;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

export type ToolRouteRequest =
  Readonly<{
    goalId: string;
    planId: string;
    stepId: string;
    operationRef: string;
    requiredCapabilities: readonly CapabilityId[];
    sideEffect: boolean;
    rollbackRef: string | null;
    preferLocal: boolean;
    maximumFallbacks: number;
  }>;

export type ToolRouteCandidate =
  Readonly<{
    toolRef: string;
    adapterRef: string;
    executionMode: ToolExecutionMode;
    health: ToolHealth;
    rank: number;
    score: number;
    parallelSafe: boolean;
    supportsRollback: boolean;
  }>;

export type ToolRouteDecision =
  Readonly<{
    accepted: boolean;
    reason:
      | 'routed'
      | 'no_eligible_tool'
      | 'invalid_input';
    primary: ToolRouteCandidate | null;
    fallbacks: readonly ToolRouteCandidate[];
  }>;

function scoreValue(value: unknown): value is number {
  return (
    safeInteger(value)
    && Number(value) <= 1000
  );
}

function uniqueCapabilities(
  value: unknown,
): readonly CapabilityId[] | null {
  if (!Array.isArray(value) || value.length > 32) {
    return null;
  }

  const output: CapabilityId[] = [];
  const seen = new Set<CapabilityId>();

  for (const item of value) {
    if (!isCapabilityId(item) || seen.has(item)) {
      return null;
    }
    seen.add(item);
    output.push(item);
  }

  return Object.freeze(output);
}

function uniqueReferences(
  value: unknown,
  maxItems: number,
): readonly string[] | null {
  if (
    !Array.isArray(value)
    || value.length < 1
    || value.length > maxItems
  ) {
    return null;
  }

  const output: string[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    if (
      !safeReference(item, 240)
      || seen.has(item)
    ) {
      return null;
    }
    seen.add(item);
    output.push(item);
  }

  return Object.freeze(output);
}

export function validateToolRegistration(
  registration: ToolRegistration,
): boolean {
  const operations =
    uniqueReferences(
      registration.supportedOperations,
      256,
    );
  const capabilities =
    uniqueCapabilities(registration.capabilities);

  return (
    registration.protocolVersion === '1.0'
    && TOOL_REF.test(registration.toolRef)
    && safeReference(registration.adapterRef, 240)
    && operations !== null
    && capabilities !== null
    && ['local', 'remote']
      .includes(registration.executionMode)
    && ['ready', 'degraded', 'unavailable']
      .includes(registration.health)
    && scoreValue(registration.trustScore)
    && scoreValue(registration.qualityScore)
    && (
      registration.firstResultMs === null
      || (
        safeInteger(registration.firstResultMs)
        && registration.firstResultMs <= 3_600_000
      )
    )
    && safeInteger(registration.maxConcurrent)
    && registration.maxConcurrent >= 1
    && registration.maxConcurrent <= 128
    && typeof registration.parallelSafe === 'boolean'
    && typeof registration.supportsRollback === 'boolean'
    && ['none', 'reversible', 'any']
      .includes(registration.sideEffectSupport)
    && safeInteger(registration.registeredAtMs)
    && registration.grantsExecutionAuthority === false
    && registration.grantsSensorAuthority === false
    && registration.grantsApprovalAuthority === false
    && registration.grantsCapabilityAuthority === false
  );
}

export function validateToolRouteRequest(
  request: ToolRouteRequest,
): boolean {
  const capabilities =
    uniqueCapabilities(request.requiredCapabilities);

  return (
    GOAL_ID.test(request.goalId)
    && GOAL_PLAN_ID.test(request.planId)
    && GOAL_STEP_ID.test(request.stepId)
    && safeReference(request.operationRef, 240)
    && capabilities !== null
    && typeof request.sideEffect === 'boolean'
    && (
      request.rollbackRef === null
      || safeReference(request.rollbackRef, 240)
    )
    && typeof request.preferLocal === 'boolean'
    && safeInteger(request.maximumFallbacks)
    && request.maximumFallbacks <= 7
  );
}

function includesCapabilities(
  registration: ToolRegistration,
  request: ToolRouteRequest,
): boolean {
  const available =
    new Set(registration.capabilities);

  return request.requiredCapabilities.every(
    (capability) => available.has(capability),
  );
}

function sideEffectEligible(
  registration: ToolRegistration,
  request: ToolRouteRequest,
): boolean {
  if (!request.sideEffect) {
    return true;
  }

  if (registration.sideEffectSupport === 'none') {
    return false;
  }

  if (request.rollbackRef !== null) {
    return registration.supportsRollback;
  }

  return registration.sideEffectSupport === 'any';
}

function registrationScore(
  registration: ToolRegistration,
  request: ToolRouteRequest,
): number {
  const healthPenalty =
    registration.health === 'degraded'
      ? 1200
      : 0;
  const latencyPenalty =
    registration.firstResultMs === null
      ? 250
      : Math.min(
          1500,
          Math.floor(registration.firstResultMs / 10),
        );
  const localityBonus =
    request.preferLocal
    && registration.executionMode === 'local'
      ? 750
      : 0;
  const rollbackBonus =
    request.rollbackRef !== null
    && registration.supportsRollback
      ? 350
      : 0;

  return (
    registration.trustScore * 5
    + registration.qualityScore * 4
    + localityBonus
    + rollbackBonus
    - healthPenalty
    - latencyPenalty
  );
}

export function routeToolRequest(
  request: ToolRouteRequest,
  registrations: readonly ToolRegistration[],
): ToolRouteDecision {
  if (
    !validateToolRouteRequest(request)
    || !Array.isArray(registrations)
    || registrations.length > 1024
    || registrations.some(
      (registration) =>
        !validateToolRegistration(registration),
    )
  ) {
    return Object.freeze({
      accepted: false,
      reason: 'invalid_input',
      primary: null,
      fallbacks: Object.freeze([]),
    });
  }

  const toolRefs = new Set<string>();
  for (const registration of registrations) {
    if (toolRefs.has(registration.toolRef)) {
      return Object.freeze({
        accepted: false,
        reason: 'invalid_input',
        primary: null,
        fallbacks: Object.freeze([]),
      });
    }
    toolRefs.add(registration.toolRef);
  }

  const eligible =
    registrations
      .filter((registration) =>
        registration.health !== 'unavailable'
        && registration.supportedOperations
          .includes(request.operationRef)
        && includesCapabilities(
          registration,
          request,
        )
        && sideEffectEligible(
          registration,
          request,
        ),
      )
      .map((registration) => ({
        registration,
        score: registrationScore(
          registration,
          request,
        ),
      }))
      .sort(
        (left, right) =>
          right.score - left.score
          || left.registration.toolRef.localeCompare(
            right.registration.toolRef,
          ),
      );

  if (eligible.length === 0) {
    return Object.freeze({
      accepted: false,
      reason: 'no_eligible_tool',
      primary: null,
      fallbacks: Object.freeze([]),
    });
  }

  const candidates =
    eligible.map(
      ({ registration, score }, index) =>
        Object.freeze({
          toolRef: registration.toolRef,
          adapterRef: registration.adapterRef,
          executionMode:
            registration.executionMode,
          health: registration.health,
          rank: index + 1,
          score,
          parallelSafe:
            registration.parallelSafe,
          supportsRollback:
            registration.supportsRollback,
        }),
    );

  return Object.freeze({
    accepted: true,
    reason: 'routed',
    primary: candidates[0] ?? null,
    fallbacks: Object.freeze(
      candidates.slice(
        1,
        1 + request.maximumFallbacks,
      ),
    ),
  });
}
