import {
  ACCOUNT_ID,
  INTELLIGENCE_MODEL_REF,
  INTELLIGENCE_PLAN_ID,
  INTELLIGENCE_POLICY_ID,
  INTELLIGENCE_PROVIDER_REF,
  INTELLIGENCE_REQUEST_ID,
  WORKSPACE_ID,
  exactObject,
  safeInteger,
} from './intelligenceSecurity';

import {
  parseIntelligenceProviderRegistration,
  toPublicIntelligenceProvider,
  type IntelligenceExecutionMode,
  type IntelligenceProviderStatus,
  type IntelligenceServiceKind,
  type PublicIntelligenceProvider,
} from './intelligenceProvider';

import {
  parseIntelligenceProviderHealth,
  type IntelligenceProviderHealth,
} from './intelligenceHealth';

import {
  parseIntelligenceRouteRequest,
  type IntelligenceOptimization,
  type IntelligenceRouteRequest,
} from './intelligenceRequest';
export type IntelligenceRouteCandidate =
  Readonly<{
    providerRef: string;
    modelRef: string;
    service: IntelligenceServiceKind;
    executionMode: IntelligenceExecutionMode;
    status: IntelligenceProviderStatus;
    qualityScore: number;
    firstResultMs: number | null;
    costMicrosPer1kUnits:
      number | null;
    failureRatePermille: number;
    rank: number;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

export type IntelligenceRoutePlan =
  Readonly<{
    protocolVersion: '1.0';
    planId: string;
    requestId: string;
    accountId: string;
    workspaceId: string;
    policyId: string;
    policyRevision: number;
    service: IntelligenceServiceKind;
    generatedAtMs: number;
    primary:
      IntelligenceRouteCandidate | null;
    fallbacks:
      readonly IntelligenceRouteCandidate[];
    providerIndependent: true;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

export type IntelligenceRouteResult =
  Readonly<{
    accepted: boolean;
    reason:
      | 'routed'
      | 'no_eligible_provider'
      | 'invalid_input'
      | 'request_replay_conflict'
      | 'policy_denied';
    value:
      IntelligenceRoutePlan | null;
  }>;

const CANDIDATE_KEYS =
  new Set([
    'providerRef',
    'modelRef',
    'service',
    'executionMode',
    'status',
    'qualityScore',
    'firstResultMs',
    'costMicrosPer1kUnits',
    'failureRatePermille',
    'rank',
    'grantsExecutionAuthority',
    'grantsSensorAuthority',
    'grantsApprovalAuthority',
    'grantsCapabilityAuthority',
  ]);

const PLAN_KEYS =
  new Set([
    'protocolVersion',
    'planId',
    'requestId',
    'accountId',
    'workspaceId',
    'policyId',
    'policyRevision',
    'service',
    'generatedAtMs',
    'primary',
    'fallbacks',
    'providerIndependent',
    'grantsExecutionAuthority',
    'grantsSensorAuthority',
    'grantsApprovalAuthority',
    'grantsCapabilityAuthority',
  ]);

function supportsLanguages(
  provider: PublicIntelligenceProvider,
  requested: readonly string[],
): boolean {
  if (requested.length === 0) {
    return true;
  }

  const supported =
    new Set(provider.languageTags);
  if (supported.has('mul')) {
    return true;
  }

  return requested.every(
    (language) => {
      const normalized =
        language.toLowerCase();
      const primary =
        normalized.split('-')[0];

      return (
        supported.has(normalized)
        || supported.has(primary)
      );
    },
  );
}

function statusRank(
  status: IntelligenceProviderStatus,
): number {
  if (status === 'ready') {
    return 0;
  }

  if (status === 'degraded') {
    return 1;
  }

  return 2;
}

function compareNullableAscending(
  left: number | null,
  right: number | null,
): number {
  if (left === null && right === null) {
    return 0;
  }

  if (left === null) {
    return 1;
  }

  if (right === null) {
    return -1;
  }

  return left - right;
}
function compareCandidates(
  optimization: IntelligenceOptimization,
  left: IntelligenceRouteCandidate,
  right: IntelligenceRouteCandidate,
): number {
  const statusDifference =
    statusRank(left.status)
    - statusRank(right.status);

  if (statusDifference !== 0) {
    return statusDifference;
  }

  const quality =
    right.qualityScore
    - left.qualityScore;
  const latency =
    compareNullableAscending(
      left.firstResultMs,
      right.firstResultMs,
    );
  const cost =
    compareNullableAscending(
      left.costMicrosPer1kUnits,
      right.costMicrosPer1kUnits,
    );
  const failure =
    left.failureRatePermille
    - right.failureRatePermille;
  const offline =
    Number(
      right.executionMode === 'offline',
    )
    - Number(
      left.executionMode === 'offline',
    );

  const ordered =
    optimization === 'quality'
      ? [quality, failure, latency, cost]
      : optimization === 'latency'
        ? [latency, failure, quality, cost]
        : optimization === 'cost'
          ? [cost, failure, quality, latency]
          : optimization === 'offline'
            ? [
                offline,
                failure,
                quality,
                latency,
                cost,
              ]
            : [
                failure,
                quality,
                latency,
                cost,
                offline,
              ];

  for (const difference of ordered) {
    if (difference !== 0) {
      return difference;
    }
  }
  return (
    left.providerRef.localeCompare(
      right.providerRef,
    )
    || left.modelRef.localeCompare(
      right.modelRef,
    )
  );
}

function providerKey(
  providerRef: string,
  modelRef: string,
): string {
  return providerRef + ':' + modelRef;
}

function currentHealth(
  request: IntelligenceRouteRequest,
  health: IntelligenceProviderHealth,
): boolean {
  return (
    health.observedAtMs
      <= request.requestedAtMs
    && request.requestedAtMs
      - health.observedAtMs
      <= request.maxHealthAgeMs
  );
}

function eligibleCandidate(
  request: IntelligenceRouteRequest,
  provider: PublicIntelligenceProvider,
  health: IntelligenceProviderHealth,
): Omit<
  IntelligenceRouteCandidate,
  'rank'
> | null {
  if (
    provider.service !== request.service
    || provider.providerRef
      !== health.providerRef
    || provider.modelRef !== health.modelRef
    || health.status === 'unavailable'
    || !currentHealth(request, health)
    || request.inputBytes
      > provider.maxInputBytes
    || (
      request.requireStreaming
      && !provider.supportsStreaming
    )
    || !supportsLanguages(
      provider,
      request.languageHints,
    )
    || (
      provider.executionMode === 'online'
      && (
        !request.allowOnline
        || !request.networkAvailable
      )
    )
    || provider.qualityScore
      < request.minQualityScore
  ) {
    return null;
  }

  const firstResultMs =
    health.measuredFirstResultMs
      ?? provider.expectedFirstResultMs;
  if (
    request.maxLatencyMs !== null
    && (
      firstResultMs === null
      || firstResultMs
        > request.maxLatencyMs
    )
  ) {
    return null;
  }

  if (
    request.maxCostMicrosPer1kUnits
      !== null
    && (
      provider.expectedCostMicrosPer1kUnits
        === null
      || provider.expectedCostMicrosPer1kUnits
        > request.maxCostMicrosPer1kUnits
    )
  ) {
    return null;
  }

  return Object.freeze({
    providerRef: provider.providerRef,
    modelRef: provider.modelRef,
    service: provider.service,
    executionMode:
      provider.executionMode,
    status: health.status,
    qualityScore:
      provider.qualityScore,
    firstResultMs,
    costMicrosPer1kUnits:
      provider.expectedCostMicrosPer1kUnits,
    failureRatePermille:
      health.failureRatePermille,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}

function result(
  accepted: boolean,
  reason: IntelligenceRouteResult['reason'],
  value: IntelligenceRoutePlan | null,
): IntelligenceRouteResult {
  return Object.freeze({
    accepted,
    reason,
    value,
  });
}

export function buildIntelligenceRoutePlan({
  request: requestInput,
  providers: providerInputs,
  health: healthInputs,
}: {
  request: unknown;
  providers: unknown;
  health: unknown;
}): IntelligenceRouteResult {
  const request =
    parseIntelligenceRouteRequest(
      requestInput,
    );

  if (
    !request
    || !Array.isArray(providerInputs)
    || providerInputs.length > 64
    || !Array.isArray(healthInputs)
    || healthInputs.length > 64
  ) {
    return result(
      false,
      'invalid_input',
      null,
    );
  }

  const providers:
    PublicIntelligenceProvider[] = [];
  const providerKeys =
    new Set<string>();

  for (const input of providerInputs) {
    const registration =
      parseIntelligenceProviderRegistration(
        input,
      );

    if (!registration) {
      return result(
        false,
        'invalid_input',
        null,
      );
    }
    const key =
      providerKey(
        registration.providerRef,
        registration.modelRef,
      );

    if (providerKeys.has(key)) {
      return result(
        false,
        'invalid_input',
        null,
      );
    }

    providerKeys.add(key);
    providers.push(
      toPublicIntelligenceProvider(
        registration,
      ),
    );
  }

  const healthByKey =
    new Map<
      string,
      IntelligenceProviderHealth
    >();

  for (const input of healthInputs) {
    const parsed =
      parseIntelligenceProviderHealth(
        input,
      );

    if (!parsed) {
      return result(
        false,
        'invalid_input',
        null,
      );
    }
    const key =
      providerKey(
        parsed.providerRef,
        parsed.modelRef,
      );

    if (healthByKey.has(key)) {
      return result(
        false,
        'invalid_input',
        null,
      );
    }

    healthByKey.set(key, parsed);
  }

  const admitted:
    Omit<IntelligenceRouteCandidate, 'rank'>[]
    = [];

  for (const provider of providers) {
    const health =
      healthByKey.get(
        providerKey(
          provider.providerRef,
          provider.modelRef,
        ),
      );

    if (!health) {
      continue;
    }

    const candidate =
      eligibleCandidate(
        request,
        provider,
        health,
      );
    if (candidate) {
      admitted.push(candidate);
    }
  }

  const ranked =
    admitted.map(
      (candidate) => ({
        ...candidate,
        rank: 0,
      }),
    );

  ranked.sort(
    (left, right) =>
      compareCandidates(
        request.optimization,
        left,
        right,
      ),
  );

  const withRanks:
    IntelligenceRouteCandidate[] =
      ranked.map(
        (candidate, index) =>
          Object.freeze({
            ...candidate,
            rank: index + 1,
          }),
      );

  const body =
    request.requestId.replace(
      /^intelligence_request_/,
      '',
    );
  const plan:
    IntelligenceRoutePlan =
      Object.freeze({
        protocolVersion: '1.0',
        planId:
          'intelligence_plan_' + body,
        requestId: request.requestId,
        accountId: request.accountId,
        workspaceId: request.workspaceId,
        policyId: request.policyId,
        policyRevision:
          request.policyRevision,
        service: request.service,
        generatedAtMs:
          request.requestedAtMs,
        primary:
          withRanks[0] ?? null,
        fallbacks:
          Object.freeze(
            withRanks.slice(
              1,
              1 + request.maxFallbacks,
            ),
          ),
        providerIndependent: true,
        grantsExecutionAuthority: false,
        grantsSensorAuthority: false,
        grantsApprovalAuthority: false,
        grantsCapabilityAuthority: false,
      });

  return result(
    true,
    plan.primary
      ? 'routed'
      : 'no_eligible_provider',
    plan,
  );
}
export function parseIntelligenceRouteCandidate(
  input: unknown,
): IntelligenceRouteCandidate | null {
  const record =
    exactObject(input, CANDIDATE_KEYS);

  if (
    !record
    || typeof record.providerRef !== 'string'
    || !INTELLIGENCE_PROVIDER_REF.test(
      record.providerRef,
    )
    || typeof record.modelRef !== 'string'
    || !INTELLIGENCE_MODEL_REF.test(
      record.modelRef,
    )
    || ![
      'general',
      'coding',
      'vision',
      'stt',
      'tts',
    ].includes(record.service as string)
    || !['offline', 'online']
      .includes(record.executionMode as string)
    || ![
      'ready',
      'degraded',
    ].includes(record.status as string)
    || !safeInteger(record.qualityScore)
    || (record.qualityScore as number) > 1000
    || (
      record.firstResultMs !== null
      && (
        !safeInteger(record.firstResultMs)
        || Number(record.firstResultMs)
          > 3_600_000
      )
    )
    || (
      record.costMicrosPer1kUnits !== null
      && (
        !safeInteger(
          record.costMicrosPer1kUnits,
        )
        || Number(
          record.costMicrosPer1kUnits,
        ) > 1_000_000_000_000
      )
    )
    || !safeInteger(
      record.failureRatePermille,
    )
    || (record.failureRatePermille as number)
      > 1000
    || !safeInteger(record.rank)
    || (record.rank as number) < 1
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
    providerRef:
      record.providerRef as string,
    modelRef:
      record.modelRef as string,
    service:
      record.service as IntelligenceServiceKind,
    executionMode:
      record.executionMode as
        IntelligenceExecutionMode,
    status:
      record.status as
        IntelligenceProviderStatus,
    qualityScore:
      record.qualityScore as number,
    firstResultMs:
      record.firstResultMs as number | null,
    costMicrosPer1kUnits:
      record.costMicrosPer1kUnits as
        number | null,
    failureRatePermille:
      record.failureRatePermille as number,
    rank: record.rank as number,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}

export function parseIntelligenceRoutePlan(
  input: unknown,
): IntelligenceRoutePlan | null {
  const record =
    exactObject(input, PLAN_KEYS);

  if (
    !record
    || record.protocolVersion !== '1.0'
    || typeof record.planId !== 'string'
    || !INTELLIGENCE_PLAN_ID.test(
      record.planId,
    )
    || typeof record.requestId !== 'string'
    || !INTELLIGENCE_REQUEST_ID.test(
      record.requestId,
    )
    || typeof record.accountId !== 'string'
    || !ACCOUNT_ID.test(record.accountId)
    || typeof record.workspaceId !== 'string'
    || !WORKSPACE_ID.test(
      record.workspaceId,
    )
    || typeof record.policyId !== 'string'
    || !INTELLIGENCE_POLICY_ID.test(
      record.policyId,
    )
    || !safeInteger(record.policyRevision)
    || Number(record.policyRevision) < 1
    || ![
      'general',
      'coding',
      'vision',
      'stt',
      'tts',
    ].includes(record.service as string)
    || !safeInteger(record.generatedAtMs)
    || !Array.isArray(record.fallbacks)
    || record.fallbacks.length > 7
    || record.providerIndependent !== true
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

  const primary =
    record.primary === null
      ? null
      : parseIntelligenceRouteCandidate(
          record.primary,
        );

  if (
    record.primary !== null
    && !primary
  ) {
    return null;
  }

  const fallbacks:
    IntelligenceRouteCandidate[] = [];

  for (const inputCandidate of record.fallbacks) {
    const candidate =
      parseIntelligenceRouteCandidate(
        inputCandidate,
      );

    if (!candidate) {
      return null;
    }

    fallbacks.push(candidate);
  }

  const ordered = [
    ...(primary ? [primary] : []),
    ...fallbacks,
  ];

  if (
    ordered.some(
      (candidate, index) =>
        candidate.rank !== index + 1,
    )
    || new Set(
      ordered.map(
        (candidate) =>
          providerKey(
            candidate.providerRef,
            candidate.modelRef,
          ),
      ),
    ).size !== ordered.length
  ) {
    return null;
  }

  if (
    !primary
    && fallbacks.length > 0
  ) {
    return null;
  }

  if (
    ordered.some(
      (candidate) =>
        candidate.service !== record.service,
    )
    || record.planId
      !== (
        'intelligence_plan_'
        + (record.requestId as string)
          .replace(
            /^intelligence_request_/,
            '',
          )
      )
  ) {
    return null;
  }

  return Object.freeze({
    protocolVersion: '1.0',
    planId: record.planId as string,
    requestId:
      record.requestId as string,
    accountId:
      record.accountId as string,
    workspaceId:
      record.workspaceId as string,
    policyId:
      record.policyId as string,
    policyRevision:
      record.policyRevision as number,
    service:
      record.service as IntelligenceServiceKind,
    generatedAtMs:
      record.generatedAtMs as number,
    primary,
    fallbacks:
      Object.freeze(fallbacks),
    providerIndependent: true,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}
