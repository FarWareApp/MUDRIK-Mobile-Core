import {
  INTELLIGENCE_MODEL_REF,
  INTELLIGENCE_PROVIDER_REF,
  safeInteger,
} from './intelligenceSecurity';

import {
  INTELLIGENCE_SERVICE_KINDS,
  parseIntelligenceProviderRegistration,
  type IntelligenceProviderRegistration,
} from './intelligenceProvider';

import {
  parseIntelligenceProviderHealth,
  type IntelligenceProviderHealth,
} from './intelligenceHealth';

import {
  parseIntelligenceRouteRequest,
} from './intelligenceRequest';

import {
  buildIntelligenceRoutePlan,
  type IntelligenceRouteResult,
} from './intelligenceRouting';

import type {
  IntelligencePerformanceProfile,
} from './intelligencePerformance';

export type IntelligenceAdaptiveRoutingPolicy =
  Readonly<{
    minimumSamples: number;
    maximumProfileAgeMs: number;
    observedWeightPermille: number;
    degradedFailureRatePermille: number;
    unavailableFailureRatePermille: number;
  }>;

export type IntelligenceAdaptiveRoutingResult =
  Readonly<{
    route: IntelligenceRouteResult;
    adjustedProviderKeys: readonly string[];
  }>;

function validPolicy(
  policy: IntelligenceAdaptiveRoutingPolicy,
): boolean {
  return (
    safeInteger(policy.minimumSamples)
    && policy.minimumSamples >= 1
    && policy.minimumSamples <= 10_000
    && safeInteger(policy.maximumProfileAgeMs)
    && policy.maximumProfileAgeMs >= 1_000
    && policy.maximumProfileAgeMs
      <= 365 * 24 * 60 * 60 * 1000
    && safeInteger(policy.observedWeightPermille)
    && policy.observedWeightPermille >= 1
    && policy.observedWeightPermille <= 1000
    && safeInteger(
      policy.degradedFailureRatePermille,
    )
    && safeInteger(
      policy.unavailableFailureRatePermille,
    )
    && policy.degradedFailureRatePermille
      <= policy.unavailableFailureRatePermille
    && policy.unavailableFailureRatePermille
      <= 1000
  );
}

function key(
  providerRef: string,
  modelRef: string,
  service: string,
): string {
  return [
    providerRef,
    modelRef,
    service,
  ].join(':');
}

function blend(
  baseline: number | null,
  observed: number | null,
  weightPermille: number,
): number | null {
  if (observed === null) {
    return baseline;
  }

  if (baseline === null) {
    return observed;
  }

  return Math.round(
    (
      observed * weightPermille
      + baseline * (1000 - weightPermille)
    ) / 1000,
  );
}

function validProfile(
  profile: IntelligencePerformanceProfile,
): boolean {
  return (
    typeof profile === 'object'
    && profile !== null
    && INTELLIGENCE_PROVIDER_REF.test(
      profile.providerRef,
    )
    && INTELLIGENCE_MODEL_REF.test(
      profile.modelRef,
    )
    && (INTELLIGENCE_SERVICE_KINDS as readonly string[])
      .includes(profile.service)
    && safeInteger(profile.sampleCount)
    && profile.sampleCount >= 1
    && safeInteger(profile.successRatePermille)
    && profile.successRatePermille <= 1000
    && safeInteger(profile.failureRatePermille)
    && profile.failureRatePermille <= 1000
    && profile.successRatePermille
      + profile.failureRatePermille === 1000
    && (
      profile.qualityScore === null
      || (
        safeInteger(profile.qualityScore)
        && profile.qualityScore <= 1000
      )
    )
    && (
      profile.firstResultMs === null
      || (
        safeInteger(profile.firstResultMs)
        && profile.firstResultMs <= 3_600_000
      )
    )
    && (
      profile.costMicrosPer1kUnits === null
      || (
        safeInteger(
          profile.costMicrosPer1kUnits,
        )
        && profile.costMicrosPer1kUnits
          <= 1_000_000_000_000
      )
    )
    && safeInteger(profile.lastObservedAtMs)
  );
}

function profileUsable(
  profile: IntelligencePerformanceProfile,
  requestedAtMs: number,
  policy: IntelligenceAdaptiveRoutingPolicy,
): boolean {
  return (
    validProfile(profile)
    && profile.sampleCount >= policy.minimumSamples
    && profile.lastObservedAtMs <= requestedAtMs
    && requestedAtMs - profile.lastObservedAtMs
      <= policy.maximumProfileAgeMs
  );
}

function adjustedStatus(
  current: IntelligenceProviderHealth['status'],
  failureRatePermille: number,
  policy: IntelligenceAdaptiveRoutingPolicy,
): IntelligenceProviderHealth['status'] {
  if (current === 'unavailable') {
    return 'unavailable';
  }

  if (
    failureRatePermille
      >= policy.unavailableFailureRatePermille
  ) {
    return 'unavailable';
  }

  if (
    current === 'degraded'
    || failureRatePermille
      >= policy.degradedFailureRatePermille
  ) {
    return 'degraded';
  }

  return 'ready';
}

export function buildAdaptiveIntelligenceRoutePlan(
  input: {
    request: unknown;
    providers: readonly unknown[];
    health: readonly unknown[];
    performanceProfiles:
      readonly IntelligencePerformanceProfile[];
    policy: IntelligenceAdaptiveRoutingPolicy;
  },
): IntelligenceAdaptiveRoutingResult {
  const request =
    parseIntelligenceRouteRequest(
      input.request,
    );

  if (
    !request
    || !Array.isArray(input.providers)
    || !Array.isArray(input.health)
    || !Array.isArray(
      input.performanceProfiles,
    )
    || !validPolicy(input.policy)
  ) {
    return Object.freeze({
      route: buildIntelligenceRoutePlan({
        request: input.request,
        providers: input.providers,
        health: input.health,
      }),
      adjustedProviderKeys:
        Object.freeze([]),
    });
  }

  const providers:
    IntelligenceProviderRegistration[] = [];
  const health:
    IntelligenceProviderHealth[] = [];

  for (const raw of input.providers) {
    const parsed =
      parseIntelligenceProviderRegistration(
        raw,
      );

    if (!parsed) {
      return Object.freeze({
        route: buildIntelligenceRoutePlan({
          request: input.request,
          providers: input.providers,
          health: input.health,
        }),
        adjustedProviderKeys:
          Object.freeze([]),
      });
    }

    providers.push(parsed);
  }

  for (const raw of input.health) {
    const parsed =
      parseIntelligenceProviderHealth(raw);

    if (!parsed) {
      return Object.freeze({
        route: buildIntelligenceRoutePlan({
          request: input.request,
          providers: input.providers,
          health: input.health,
        }),
        adjustedProviderKeys:
          Object.freeze([]),
      });
    }

    health.push(parsed);
  }

  const profileByKey =
    new Map<string, IntelligencePerformanceProfile>();

  for (
    const profile
    of input.performanceProfiles
  ) {
    if (!validProfile(profile)) {
      return Object.freeze({
        route: buildIntelligenceRoutePlan({
          request: input.request,
          providers: input.providers,
          health: input.health,
        }),
        adjustedProviderKeys:
          Object.freeze([]),
      });
    }

    const profileKey =
      key(
        profile.providerRef,
        profile.modelRef,
        profile.service,
      );

    if (profileByKey.has(profileKey)) {
      return Object.freeze({
        route: buildIntelligenceRoutePlan({
          request: input.request,
          providers: input.providers,
          health: input.health,
        }),
        adjustedProviderKeys:
          Object.freeze([]),
      });
    }

    profileByKey.set(
      profileKey,
      profile,
    );
  }

  const adjustedProviderKeys: string[] = [];

  const adjustedProviders =
    providers.map((provider) => {
      const providerKey =
        key(
          provider.providerRef,
          provider.modelRef,
          provider.service,
        );
      const profile =
        profileByKey.get(providerKey);

      if (
        !profile
        || !profileUsable(
          profile,
          request.requestedAtMs,
          input.policy,
        )
      ) {
        return provider;
      }

      adjustedProviderKeys.push(
        providerKey,
      );

      return Object.freeze({
        ...provider,
        qualityScore:
          blend(
            provider.qualityScore,
            profile.qualityScore,
            input.policy.observedWeightPermille,
          ) as number,
        expectedFirstResultMs:
          blend(
            provider.expectedFirstResultMs,
            profile.firstResultMs,
            input.policy.observedWeightPermille,
          ),
        expectedCostMicrosPer1kUnits:
          blend(
            provider.expectedCostMicrosPer1kUnits,
            profile.costMicrosPer1kUnits,
            input.policy.observedWeightPermille,
          ),
      });
    });

  const adjustedHealth =
    health.map((item) => {
      const matchingProvider =
        providers.find(
          (provider) =>
            provider.providerRef
              === item.providerRef
            && provider.modelRef
              === item.modelRef,
        );

      if (!matchingProvider) {
        return item;
      }

      const profile =
        profileByKey.get(
          key(
            item.providerRef,
            item.modelRef,
            matchingProvider.service,
          ),
        );

      if (
        !profile
        || !profileUsable(
          profile,
          request.requestedAtMs,
          input.policy,
        )
      ) {
        return item;
      }

      const failureRate =
        blend(
          item.failureRatePermille,
          profile.failureRatePermille,
          input.policy.observedWeightPermille,
        ) as number;

      return Object.freeze({
        ...item,
        status:
          adjustedStatus(
            item.status,
            failureRate,
            input.policy,
          ),
        measuredFirstResultMs:
          blend(
            item.measuredFirstResultMs,
            profile.firstResultMs,
            input.policy.observedWeightPermille,
          ),
        failureRatePermille:
          failureRate,
      });
    });

  return Object.freeze({
    route:
      buildIntelligenceRoutePlan({
        request: input.request,
        providers: adjustedProviders,
        health: adjustedHealth,
      }),
    adjustedProviderKeys:
      Object.freeze(
        [...new Set(adjustedProviderKeys)]
          .sort(),
      ),
  });
}

export const DEFAULT_INTELLIGENCE_ADAPTIVE_ROUTING_POLICY =
  Object.freeze({
    minimumSamples: 3,
    maximumProfileAgeMs:
      6 * 60 * 60 * 1000,
    observedWeightPermille: 700,
    degradedFailureRatePermille: 250,
    unavailableFailureRatePermille: 750,
  } satisfies IntelligenceAdaptiveRoutingPolicy);
