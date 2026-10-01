import {
  ACCOUNT_ID,
  INTELLIGENCE_POLICY_ID,
  WORKSPACE_ID,
  exactObject,
  safeInteger,
} from './intelligenceSecurity';

import {
  type IntelligenceServiceKind,
} from './intelligenceProvider';

import {
  type IntelligenceOptimization,
  type IntelligenceRouteRequest,
} from './intelligenceRequest';

export type IntelligenceRoutingPolicy =
  Readonly<{
    protocolVersion: '1.0';
    policyId: string;
    accountId: string;
    workspaceId: string;
    enabledServices:
      readonly IntelligenceServiceKind[];
    onlineAllowedServices:
      readonly IntelligenceServiceKind[];
    allowedOptimizations:
      readonly IntelligenceOptimization[];
    maxFallbacks: number;
    maxHealthAgeMs: number;
    maxLatencyMs: number | null;
    maxCostMicrosPer1kUnits:
      number | null;
    minQualityScore: number;
    revision: number;
    updatedAtMs: number;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

const SERVICES =
  new Set<IntelligenceServiceKind>([
    'general',
    'coding',
    'vision',
    'stt',
    'tts',
  ]);

const OPTIMIZATIONS =
  new Set<IntelligenceOptimization>([
    'balanced',
    'quality',
    'latency',
    'cost',
    'offline',
  ]);

const KEYS =
  new Set([
    'protocolVersion',
    'policyId',
    'accountId',
    'workspaceId',
    'enabledServices',
    'onlineAllowedServices',
    'allowedOptimizations',
    'maxFallbacks',
    'maxHealthAgeMs',
    'maxLatencyMs',
    'maxCostMicrosPer1kUnits',
    'minQualityScore',
    'revision',
    'updatedAtMs',
    'grantsExecutionAuthority',
    'grantsSensorAuthority',
    'grantsApprovalAuthority',
    'grantsCapabilityAuthority',
  ]);

function parseUniqueList<T extends string>(
  value: unknown,
  allowed: ReadonlySet<T>,
  max: number,
  min = 1,
): readonly T[] | null {
  if (
    !Array.isArray(value)
    || value.length < min
    || value.length > max
  ) {
    return null;
  }

  const output: T[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    if (
      typeof item !== 'string'
      || !allowed.has(item as T)
      || seen.has(item)
    ) {
      return null;
    }

    seen.add(item);
    output.push(item as T);
  }

  return Object.freeze(output);
}

export function parseIntelligenceRoutingPolicy(
  input: unknown,
): IntelligenceRoutingPolicy | null {
  const record =
    exactObject(input, KEYS);

  if (
    !record
    || record.protocolVersion !== '1.0'
    || typeof record.policyId !== 'string'
    || !INTELLIGENCE_POLICY_ID.test(
      record.policyId,
    )
    || typeof record.accountId !== 'string'
    || !ACCOUNT_ID.test(record.accountId)
    || typeof record.workspaceId !== 'string'
    || !WORKSPACE_ID.test(
      record.workspaceId,
    )
    || !safeInteger(record.maxFallbacks)
    || (record.maxFallbacks as number) > 7
    || !safeInteger(record.maxHealthAgeMs)
    || Number(record.maxHealthAgeMs) < 1_000
    || Number(record.maxHealthAgeMs)
      > 24 * 60 * 60 * 1000
    || (
      record.maxLatencyMs !== null
      && (
        !safeInteger(record.maxLatencyMs)
        || Number(record.maxLatencyMs)
          > 3_600_000
      )
    )
    || (
      record.maxCostMicrosPer1kUnits !== null
      && (
        !safeInteger(
          record.maxCostMicrosPer1kUnits,
        )
        || Number(
          record.maxCostMicrosPer1kUnits,
        ) > 1_000_000_000_000
      )
    )
    || !safeInteger(record.minQualityScore)
    || Number(record.minQualityScore) > 1000
    || !safeInteger(record.revision)
    || Number(record.revision) < 1
    || !safeInteger(record.updatedAtMs)
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

  const enabledServices =
    parseUniqueList(
      record.enabledServices,
      SERVICES,
      5,
    );
  const onlineAllowedServices =
    parseUniqueList(
      record.onlineAllowedServices,
      SERVICES,
      5,
      0,
    );
  const allowedOptimizations =
    parseUniqueList(
      record.allowedOptimizations,
      OPTIMIZATIONS,
      5,
    );

  if (
    !enabledServices
    || !onlineAllowedServices
    || !allowedOptimizations
    || onlineAllowedServices.some(
      (service) =>
        !enabledServices.includes(service),
    )
  ) {
    return null;
  }

  return Object.freeze({
    protocolVersion: '1.0',
    policyId: record.policyId as string,
    accountId: record.accountId as string,
    workspaceId:
      record.workspaceId as string,
    enabledServices,
    onlineAllowedServices,
    allowedOptimizations,
    maxFallbacks:
      record.maxFallbacks as number,
    maxHealthAgeMs:
      record.maxHealthAgeMs as number,
    maxLatencyMs:
      record.maxLatencyMs as number | null,
    maxCostMicrosPer1kUnits:
      record.maxCostMicrosPer1kUnits as
        number | null,
    minQualityScore:
      record.minQualityScore as number,
    revision: record.revision as number,
    updatedAtMs:
      record.updatedAtMs as number,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}

export type IntelligencePolicyDecision =
  Readonly<{
    accepted: boolean;
    reason:
      | 'accepted'
      | 'binding_mismatch'
      | 'service_denied'
      | 'online_denied'
      | 'optimization_denied'
      | 'fallback_scope_denied'
      | 'health_scope_denied'
      | 'latency_scope_denied'
      | 'cost_scope_denied'
      | 'quality_scope_denied';
    value: IntelligenceRouteRequest | null;
  }>;

function decision(
  accepted: boolean,
  reason: IntelligencePolicyDecision['reason'],
  value: IntelligenceRouteRequest | null,
): IntelligencePolicyDecision {
  return Object.freeze({
    accepted,
    reason,
    value,
  });
}

export function authorizeIntelligenceRouteRequest(
  policy: IntelligenceRoutingPolicy,
  request: IntelligenceRouteRequest,
): IntelligencePolicyDecision {
  if (
    policy.accountId !== request.accountId
    || policy.workspaceId
      !== request.workspaceId
    || policy.policyId
      !== request.policyId
    || policy.revision
      !== request.policyRevision
  ) {
    return decision(
      false,
      'binding_mismatch',
      null,
    );
  }

  if (
    !policy.enabledServices.includes(
      request.service,
    )
  ) {
    return decision(
      false,
      'service_denied',
      null,
    );
  }

  if (
    request.allowOnline
    && !policy.onlineAllowedServices
      .includes(request.service)
  ) {
    return decision(
      false,
      'online_denied',
      null,
    );
  }

  if (
    !policy.allowedOptimizations.includes(
      request.optimization,
    )
  ) {
    return decision(
      false,
      'optimization_denied',
      null,
    );
  }

  if (
    request.maxFallbacks
      > policy.maxFallbacks
  ) {
    return decision(
      false,
      'fallback_scope_denied',
      null,
    );
  }

  if (
    request.maxHealthAgeMs
      > policy.maxHealthAgeMs
  ) {
    return decision(
      false,
      'health_scope_denied',
      null,
    );
  }

  if (
    policy.maxLatencyMs !== null
    && (
      request.maxLatencyMs === null
      || request.maxLatencyMs
        > policy.maxLatencyMs
    )
  ) {
    return decision(
      false,
      'latency_scope_denied',
      null,
    );
  }

  if (
    policy.maxCostMicrosPer1kUnits
      !== null
    && (
      request.maxCostMicrosPer1kUnits
        === null
      || request.maxCostMicrosPer1kUnits
        > policy.maxCostMicrosPer1kUnits
    )
  ) {
    return decision(
      false,
      'cost_scope_denied',
      null,
    );
  }

  if (
    request.minQualityScore
      < policy.minQualityScore
  ) {
    return decision(
      false,
      'quality_scope_denied',
      null,
    );
  }

  return decision(
    true,
    'accepted',
    request,
  );
}
