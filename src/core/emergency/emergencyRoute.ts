import {
  isIdentityId,
} from '../identity/identityIds';

import {
  parseTrustedEvaluationTime,
} from '../security/trustedEvaluationTime';

import {
  isEmergencySessionId,
} from './emergencyEvidence';

import {
  isEmergencyEscalationPlan,
} from './emergencyEscalationPlan';

export type EmergencyRouteDescriptor =
  Readonly<{
    routeId: string;
    emergencySessionId: string;
    accountId: string;
    sourceDeviceId: string;
    jurisdictionCode: string;
    platform: 'android' | 'ios' | 'other';
    serviceKind:
      | 'emergency_call'
      | 'emergency_communication';
    destinationRef: string;
    status: 'available' | 'unavailable';
    requiresUserConfirmation: boolean;
    unattendedSupported: boolean;
    declaredAtMs: number;
    expiresAtMs: number;
    grantsAuthority: false;
  }>;
export type EmergencyRouteContext =
  Readonly<{
    jurisdictionCode: string;
    platform: 'android' | 'ios' | 'other';
  }>;

export type EmergencyRouteResolution =
  Readonly<{
    accepted: boolean;
    route: EmergencyRouteDescriptor | null;
    reason:
      | 'resolved'
      | 'invalid_input'
      | 'simulation_only'
      | 'route_unavailable'
      | 'route_stale'
      | 'binding_mismatch'
      | 'route_not_requested';
    grantsAuthority: false;
    performsExternalAction: false;
  }>;

const ROUTE_ID =
  /^emroute_[a-z0-9][a-z0-9_-]{15,63}$/;

const DESTINATION_REF =
  /^emdest_[a-z0-9][a-z0-9_-]{15,63}$/;

const JURISDICTION =
  /^[A-Z]{2}$/;

const ROUTE_KEYS = new Set([
  'routeId',
  'emergencySessionId',
  'accountId',
  'sourceDeviceId',
  'jurisdictionCode',
  'platform',
  'serviceKind',
  'destinationRef',
  'status',
  'requiresUserConfirmation',
  'unattendedSupported',
  'declaredAtMs',
  'expiresAtMs',
]);
const RESOLVE_KEYS = new Set([
  'plan',
  'route',
]);
const ROUTE_CONTEXT_KEYS = new Set([
  'jurisdictionCode',
  'platform',
]);

const issuedRoutes =
  new WeakSet<object>();

function result(
  accepted: boolean,
  route: EmergencyRouteDescriptor | null,
  reason: EmergencyRouteResolution['reason'],
): EmergencyRouteResolution {
  return Object.freeze({
    accepted,
    route,
    reason,
    grantsAuthority: false,
    performsExternalAction: false,
  });
}

export function parseEmergencyRouteDescriptor(
  input: unknown,
): EmergencyRouteDescriptor | null {
  if (
    typeof input !== 'object'
    || input === null
    || Array.isArray(input)
  ) {
    return null;
  }

  const record =
    input as Record<string, unknown>;
  if (
    Object.keys(record).length
      !== ROUTE_KEYS.size
    || Object.keys(record).some(
      (key) => !ROUTE_KEYS.has(key),
    )
    || typeof record.routeId !== 'string'
    || !ROUTE_ID.test(record.routeId)
    || !isEmergencySessionId(
      record.emergencySessionId,
    )
    || !isIdentityId(
      'account',
      record.accountId,
    )
    || !isIdentityId(
      'device',
      record.sourceDeviceId,
    )
    || typeof record.jurisdictionCode
      !== 'string'
    || !JURISDICTION.test(
      record.jurisdictionCode,
    )
    || (
      record.platform !== 'android'
      && record.platform !== 'ios'
      && record.platform !== 'other'
    )
    || (
      record.serviceKind !== 'emergency_call'
      && record.serviceKind
        !== 'emergency_communication'
    )
    || typeof record.destinationRef !== 'string'
    || !DESTINATION_REF.test(
      record.destinationRef,
    )
    || (
      record.status !== 'available'
      && record.status !== 'unavailable'
    )
    || typeof record.requiresUserConfirmation
      !== 'boolean'
    || typeof record.unattendedSupported
      !== 'boolean'
    || typeof record.declaredAtMs !== 'number'
    || !Number.isSafeInteger(
      record.declaredAtMs,
    )
    || record.declaredAtMs < 0
    || typeof record.expiresAtMs !== 'number'
    || !Number.isSafeInteger(
      record.expiresAtMs,
    )
    || record.expiresAtMs
      <= record.declaredAtMs
  ) {
    return null;
  }

  const route =
    Object.freeze({
      routeId: record.routeId,
      emergencySessionId:
        record.emergencySessionId,
      accountId: record.accountId,
      sourceDeviceId:
        record.sourceDeviceId,
      jurisdictionCode:
        record.jurisdictionCode,
      platform: record.platform,
      serviceKind: record.serviceKind,
      destinationRef:
        record.destinationRef,
      status: record.status,
      requiresUserConfirmation:
        record.requiresUserConfirmation,
      unattendedSupported:
        record.unattendedSupported,
      declaredAtMs: record.declaredAtMs,
      expiresAtMs: record.expiresAtMs,
      grantsAuthority: false as const,
    });
  issuedRoutes.add(route);
  return route;
}

export function isEmergencyRouteDescriptor(
  value: unknown,
): value is EmergencyRouteDescriptor {
  return (
    typeof value === 'object'
    && value !== null
    && issuedRoutes.has(value)
  );
}

export function parseEmergencyRouteContext(
  input: unknown,
): EmergencyRouteContext | null {
  if (
    typeof input !== 'object'
    || input === null
    || Array.isArray(input)
  ) {
    return null;
  }

  const record = input as Record<string, unknown>;
  if (
    Object.keys(record).length !== ROUTE_CONTEXT_KEYS.size
    || Object.keys(record).some(
      (key) => !ROUTE_CONTEXT_KEYS.has(key),
    )
    || typeof record.jurisdictionCode !== 'string'
    || !JURISDICTION.test(record.jurisdictionCode)
    || (
      record.platform !== 'android'
      && record.platform !== 'ios'
      && record.platform !== 'other'
    )
  ) {
    return null;
  }

  return Object.freeze({
    jurisdictionCode: record.jurisdictionCode,
    platform: record.platform,
  });
}

export function resolveEmergencyRoute(
  input: unknown,
  trustedEvaluationTimeInput: unknown,
  trustedRouteContextInput: unknown,
): EmergencyRouteResolution {
  const nowMs =
    parseTrustedEvaluationTime(
      trustedEvaluationTimeInput,
    );
  const routeContext =
    parseEmergencyRouteContext(
      trustedRouteContextInput,
    );

  if (
    nowMs === null
    || routeContext === null
    || typeof input !== 'object'
    || input === null
    || Array.isArray(input)
  ) {
    return result(
      false,
      null,
      'invalid_input',
    );
  }

  const record =
    input as Record<string, unknown>;

  if (
    Object.keys(record).length
      !== RESOLVE_KEYS.size
    || Object.keys(record).some(
      (key) => !RESOLVE_KEYS.has(key),
    )
    || !isEmergencyEscalationPlan(
      record.plan,
    )
    || !isEmergencyRouteDescriptor(
      record.route,
    )
  ) {
    return result(
      false,
      null,
      'invalid_input',
    );
  }

  const plan = record.plan;
  const route = record.route;

  if (plan.simulationOnly) {
    return result(
      false,
      null,
      'simulation_only',
    );
  }

  if (
    !plan.steps.some(
      (entry) =>
        entry.kind
          === 'resolve_emergency_route',
    )
  ) {
    return result(
      false,
      null,
      'route_not_requested',
    );
  }

  if (
    route.emergencySessionId
      !== plan.emergencySessionId
    || route.accountId !== plan.accountId
    || route.sourceDeviceId
      !== plan.sourceDeviceId
    || route.jurisdictionCode
      !== routeContext.jurisdictionCode
    || route.platform !== routeContext.platform
  ) {
    return result(
      false,
      null,
      'binding_mismatch',
    );
  }

  if (route.status !== 'available') {
    return result(
      false,
      null,
      'route_unavailable',
    );
  }
  if (
    route.declaredAtMs > nowMs
    || route.expiresAtMs <= nowMs
  ) {
    return result(
      false,
      null,
      'route_stale',
    );
  }

  return result(
    true,
    route,
    'resolved',
  );
}
