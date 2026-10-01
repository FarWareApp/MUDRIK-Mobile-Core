import {
  parseIntelligenceProviderRegistration,
  toPublicIntelligenceProvider,
  type IntelligenceProviderRegistration,
  type PublicIntelligenceProvider,
} from './intelligenceProvider';

import {
  parseIntelligenceProviderHealth,
  type IntelligenceProviderHealth,
} from './intelligenceHealth';

import {
  buildIntelligenceRoutePlan,
  type IntelligenceRoutePlan,
  type IntelligenceRouteResult,
} from './intelligenceRouting';

import {
  parseIntelligenceRouteRequest,
  type IntelligenceRouteRequest,
} from './intelligenceRequest';

import {
  authorizeIntelligenceRouteRequest,
  parseIntelligenceRoutingPolicy,
  type IntelligenceRoutingPolicy,
} from './intelligencePolicy';

import {
  evaluateIntelligenceFailover,
  type IntelligenceFailoverDecision,
} from './intelligenceFailover';

import {
  parseIntelligenceResultEnvelope,
  type IntelligenceResultEnvelope,
} from './intelligenceResult';

import {
  IntelligenceAttemptTracker,
} from './intelligenceAttempt';

import {
  safeInteger,
} from './intelligenceSecurity';

export type IntelligenceRegistryResult<T> =
  Readonly<{
    accepted: boolean;
    duplicate: boolean;
    reason: string;
    value: T | null;
  }>;

export type IntelligenceAdapterBinding =
  Readonly<{
    providerRef: string;
    modelRef: string;
    service:
      IntelligenceProviderRegistration['service'];
    executionMode:
      IntelligenceProviderRegistration[
        'executionMode'
      ];
    credentialRef: string | null;
  }>;

function result<T>(
  accepted: boolean,
  reason: string,
  value: T | null = null,
  duplicate = false,
): IntelligenceRegistryResult<T> {
  return Object.freeze({
    accepted,
    duplicate,
    reason,
    value,
  });
}

function key(
  providerRef: string,
  modelRef: string,
): string {
  return providerRef + ':' + modelRef;
}

function workspaceKey(
  accountId: string,
  workspaceId: string,
): string {
  return accountId + ':' + workspaceId;
}

export class IntelligenceProviderRegistry {
  private readonly policies =
    new Map<
      string,
      IntelligenceRoutingPolicy
    >();

  private readonly registrations =
    new Map<
      string,
      IntelligenceProviderRegistration
    >();
  private readonly health =
    new Map<
      string,
      IntelligenceProviderHealth
    >();


  private readonly issuedPlans =
    new WeakSet<object>();

  private readonly issuedRequests =
    new Map<
      string,
      IntelligenceRouteRequest
    >();

  private readonly plansByRequest =
    new Map<
      string,
      IntelligenceRoutePlan
    >();

  setPolicy(
    input: unknown,
    trustedNowMs: number,
  ): IntelligenceRegistryResult<
    IntelligenceRoutingPolicy
  > {
    const parsed =
      parseIntelligenceRoutingPolicy(
        input,
      );

    if (
      !parsed
      || !safeInteger(trustedNowMs)
      || parsed.updatedAtMs > trustedNowMs
    ) {
      return result(
        false,
        'policy_invalid',
      );
    }

    const policyKey =
      workspaceKey(
        parsed.accountId,
        parsed.workspaceId,
      );
    const current =
      this.policies.get(policyKey);

    if (!current) {
      if (parsed.revision !== 1) {
        return result(
          false,
          'policy_revision_gap',
        );
      }

      this.policies.set(
        policyKey,
        parsed,
      );
      return result(
        true,
        'policy_set',
        parsed,
      );
    }

    if (
      parsed.policyId
        !== current.policyId
    ) {
      return result(
        false,
        'policy_identity_conflict',
        current,
      );
    }

    if (parsed.revision === current.revision) {
      return JSON.stringify(parsed)
          === JSON.stringify(current)
        ? result(
            true,
            'duplicate',
            current,
            true,
          )
        : result(
            false,
            'policy_revision_conflict',
            current,
          );
    }

    if (parsed.revision < current.revision) {
      return result(
        false,
        'policy_revision_stale',
        current,
      );
    }

    if (
      parsed.revision
        !== current.revision + 1
    ) {
      return result(
        false,
        'policy_revision_gap',
        current,
      );
    }

    if (
      parsed.updatedAtMs
        < current.updatedAtMs
    ) {
      return result(
        false,
        'policy_time_rollback',
        current,
      );
    }

    this.policies.set(
      policyKey,
      parsed,
    );

    return result(
      true,
      'policy_updated',
      parsed,
    );
  }

  register(
    input: unknown,
  ): IntelligenceRegistryResult<
    PublicIntelligenceProvider
  > {
    const parsed =
      parseIntelligenceProviderRegistration(
        input,
      );

    if (!parsed) {
      return result(
        false,
        'registration_invalid',
      );
    }

    const registrationKey =
      key(
        parsed.providerRef,
        parsed.modelRef,
      );
    const current =
      this.registrations.get(
        registrationKey,
      );
    if (current) {
      if (
        JSON.stringify(current)
          === JSON.stringify(parsed)
      ) {
        return result(
          true,
          'duplicate',
          toPublicIntelligenceProvider(
            current,
          ),
          true,
        );
      }

      return result(
        false,
        'registration_conflict',
        toPublicIntelligenceProvider(
          current,
        ),
      );
    }

    this.registrations.set(
      registrationKey,
      parsed,
    );

    return result(
      true,
      'registered',
      toPublicIntelligenceProvider(
        parsed,
      ),
    );
  }
  updateHealth(
    input: unknown,
    trustedNowMs: number,
  ): IntelligenceRegistryResult<
    IntelligenceProviderHealth
  > {
    const parsed =
      parseIntelligenceProviderHealth(
        input,
      );

    if (
      !parsed
      || !safeInteger(trustedNowMs)
      || parsed.observedAtMs > trustedNowMs
    ) {
      return result(
        false,
        'health_invalid',
      );
    }

    const healthKey =
      key(
        parsed.providerRef,
        parsed.modelRef,
      );

    if (
      !this.registrations.has(
        healthKey,
      )
    ) {
      return result(
        false,
        'provider_unknown',
      );
    }

    const current =
      this.health.get(healthKey);

    if (current) {
      if (
        parsed.observedAtMs
          < current.observedAtMs
      ) {
        return result(
          false,
          'health_stale',
          current,
        );
      }

      if (
        parsed.observedAtMs
          === current.observedAtMs
      ) {
        if (
          JSON.stringify(current)
            === JSON.stringify(parsed)
        ) {
          return result(
            true,
            'duplicate',
            current,
            true,
          );
        }

        return result(
          false,
          'health_conflict',
          current,
        );
      }
    }

    this.health.set(
      healthKey,
      parsed,
    );

    return result(
      true,
      'health_updated',
      parsed,
    );
  }

  listPublicProviders():
    readonly PublicIntelligenceProvider[] {
    return Object.freeze(
      [...this.registrations.values()]
        .map(
          (registration) =>
            toPublicIntelligenceProvider(
              registration,
            ),
        )
        .sort(
          (left, right) =>
            left.providerRef.localeCompare(
              right.providerRef,
            )
            || left.modelRef.localeCompare(
              right.modelRef,
            ),
        ),
    );
  }

  route(
    request: unknown,
    trustedNowMs: number,
  ): IntelligenceRouteResult {
    const parsedRequest =
      parseIntelligenceRouteRequest(
        request,
      );

    if (
      !parsedRequest
      || !safeInteger(trustedNowMs)
      || parsedRequest.requestedAtMs
        > trustedNowMs
    ) {
      return Object.freeze({
        accepted: false,
        reason: 'invalid_input',
        value: null,
      });
    }

    const policy =
      this.policies.get(
        parsedRequest.accountId
        + ':'
        + parsedRequest.workspaceId,
      );

    if (!policy) {
      return Object.freeze({
        accepted: false,
        reason: 'policy_denied',
        value: null,
      });
    }

    const policyDecision =
      authorizeIntelligenceRouteRequest(
        policy,
        parsedRequest,
      );

    if (!policyDecision.accepted) {
      return Object.freeze({
        accepted: false,
        reason: 'policy_denied',
        value: null,
      });
    }

    const previousRequest =
      this.issuedRequests.get(
        parsedRequest.requestId,
      );
    const previousPlan =
      this.plansByRequest.get(
        parsedRequest.requestId,
      );

    if (previousRequest || previousPlan) {
      if (
        !previousRequest
        || !previousPlan
        || JSON.stringify(previousRequest)
          !== JSON.stringify(parsedRequest)
      ) {
        return Object.freeze({
          accepted: false,
          reason: 'request_replay_conflict',
          value: null,
        });
      }

      return Object.freeze({
        accepted: true,
        reason:
          previousPlan.primary
            ? 'routed'
            : 'no_eligible_provider',
        value: previousPlan,
      });
    }

    const routed =
      buildIntelligenceRoutePlan({
        request: parsedRequest,
        providers:
          [...this.registrations.values()],
        health:
          [...this.health.values()],
      });

    if (
      routed.accepted
      && routed.value
    ) {
      this.issuedPlans.add(
        routed.value,
      );
      this.issuedRequests.set(
        parsedRequest.requestId,
        parsedRequest,
      );
      this.plansByRequest.set(
        parsedRequest.requestId,
        routed.value,
      );
    }

    return routed;
  }

  isIssuedPlan(
    plan: IntelligenceRoutePlan,
  ): boolean {
    if (
      typeof plan !== 'object'
      || plan === null
      || !this.issuedPlans.has(plan)
    ) {
      return false;
    }

    const policy =
      this.policies.get(
        workspaceKey(
          plan.accountId,
          plan.workspaceId,
        ),
      );

    return (
      Boolean(policy)
      && policy?.policyId
        === plan.policyId
      && policy.revision
        === plan.policyRevision
    );
  }


  createAttemptTracker(
    plan: IntelligenceRoutePlan,
    providerRef: string,
    modelRef: string,
    generation: number,
  ): IntelligenceAttemptTracker | null {
    if (!this.isIssuedPlan(plan)) {
      return null;
    }

    try {
      return new IntelligenceAttemptTracker(
        plan,
        providerRef,
        modelRef,
        generation,
        () => this.isIssuedPlan(plan),
      );
    } catch {
      return null;
    }
  }

  evaluateIssuedFailover(
    input: unknown,
  ): IntelligenceFailoverDecision {
    if (
      typeof input !== 'object'
      || input === null
      || Array.isArray(input)
    ) {
      return Object.freeze({
        allowed: false,
        requiresGenerationRotation: false,
        reason: 'invalid_input',
      });
    }

    const plan =
      (input as Record<string, unknown>)
        .plan;

    if (
      typeof plan !== 'object'
      || plan === null
      || !this.isIssuedPlan(
        plan as IntelligenceRoutePlan,
      )
    ) {
      return Object.freeze({
        allowed: false,
        requiresGenerationRotation: false,
        reason: 'plan_not_issued',
      });
    }

    return evaluateIntelligenceFailover(
      input,
    );
  }

  validateIssuedResult(
    plan: IntelligenceRoutePlan,
    input: unknown,
  ): IntelligenceResultEnvelope | null {
    if (!this.isIssuedPlan(plan)) {
      return null;
    }

    const parsed =
      parseIntelligenceResultEnvelope(
        input,
      );

    if (
      !parsed
      || parsed.planId !== plan.planId
      || parsed.requestId !== plan.requestId
      || parsed.service !== plan.service
      || parsed.completedAtMs
        < plan.generatedAtMs
    ) {
      return null;
    }

    const admitted = [
      ...(plan.primary
        ? [plan.primary]
        : []),
      ...plan.fallbacks,
    ].some(
      (candidate) =>
        candidate.providerRef
          === parsed.providerRef
        && candidate.modelRef
          === parsed.modelRef,
    );

    return admitted
      ? parsed
      : null;
  }

  resolveAdapterBinding(
    plan: IntelligenceRoutePlan,
    providerRef: string,
    modelRef: string,
  ): IntelligenceAdapterBinding | null {
    if (
      !this.isIssuedPlan(plan)
    ) {
      return null;
    }

    const admitted = [
      ...(plan.primary
        ? [plan.primary]
        : []),
      ...plan.fallbacks,
    ].some(
      (candidate) =>
        candidate.providerRef
          === providerRef
        && candidate.modelRef
          === modelRef,
    );

    if (!admitted) {
      return null;
    }

    const registration =
      this.registrations.get(
        key(providerRef, modelRef),
      );

    if (!registration) {
      return null;
    }

    const latestHealth =
      this.health.get(
        key(providerRef, modelRef),
      );

    if (
      !latestHealth
      || latestHealth.status
        === 'unavailable'
    ) {
      return null;
    }

    return Object.freeze({
      providerRef:
        registration.providerRef,
      modelRef:
        registration.modelRef,
      service:
        registration.service,
      executionMode:
        registration.executionMode,
      credentialRef:
        registration.credentialRef,
    });
  }
}
