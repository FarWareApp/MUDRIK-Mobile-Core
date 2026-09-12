import {
  isCapabilityId,
  type CapabilityId,
} from './capabilities';

export type ElevationLevel = 'none' | 'user' | 'admin';

export type CapabilityScope = {
  resourceId?: string;
  resourcePrefix?: string;
  allowedDomains?: readonly string[];
  allowBackground?: boolean;
  maxElevation?: ElevationLevel;
};

export type CapabilityGrant = {
  grantId: string;
  subjectId: string;
  capability: CapabilityId;
  scope?: CapabilityScope;
  expiresAtMs?: number;
  revokedAtMs?: number;
};

export type CapabilityRequest = {
  subjectId: string;
  capability: string;
  nowMs: number;
  resourceId?: string;
  resourcePath?: string;
  domain?: string;
  background?: boolean;
  elevation?: ElevationLevel;
};

export type CapabilityDecisionReason =
  | 'allowed'
  | 'invalid_request'
  | 'unknown_capability'
  | 'no_matching_grant'
  | 'grant_revoked'
  | 'grant_expired'
  | 'resource_mismatch'
  | 'domain_mismatch'
  | 'background_not_allowed'
  | 'elevation_not_allowed';

export type CapabilityDecision = {
  allowed: boolean;
  reason: CapabilityDecisionReason;
  grantId?: string;
};

const ELEVATION_RANK: Readonly<Record<ElevationLevel, number>> = {
  none: 0,
  user: 1,
  admin: 2,
};

function normalizeDomain(value: string): string | null {
  const normalized = value.trim().toLowerCase().replace(/\.+$/, '');

  if (
    normalized.length === 0 ||
    normalized.length > 253 ||
    normalized.includes('/') ||
    normalized.includes('\\') ||
    normalized.includes('@') ||
    normalized.includes(':') ||
    normalized.includes('..')
  ) {
    return null;
  }

  const labels = normalized.split('.');
  if (
    labels.some(
      (label) =>
        label.length === 0 ||
        label.length > 63 ||
        !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label),
    )
  ) {
    return null;
  }

  return normalized;
}

function domainMatches(requestedDomain: string, allowedDomain: string): boolean {
  const requested = normalizeDomain(requestedDomain);
  const allowed = normalizeDomain(allowedDomain);

  if (!requested || !allowed) {
    return false;
  }

  return requested === allowed || requested.endsWith(`.${allowed}`);
}

function normalizeScopedPath(value: string): string | null {
  if (
    value.length === 0 ||
    value.length > 4096 ||
    value.includes('\0')
  ) {
    return null;
  }

  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return null;
  }

  const slashNormalized = decoded.replace(/\\/g, '/');
  const segments = slashNormalized.split('/');

  if (segments.some((segment) => segment === '..')) {
    return null;
  }

  const normalizedSegments = segments.filter(
    (segment) => segment !== '' && segment !== '.',
  );

  return `/${normalizedSegments.join('/')}`;
}

function resourcePrefixMatches(resourcePath: string, resourcePrefix: string): boolean {
  const path = normalizeScopedPath(resourcePath);
  const prefix = normalizeScopedPath(resourcePrefix);

  if (!path || !prefix) {
    return false;
  }

  return path === prefix || path.startsWith(`${prefix}/`);
}

function evaluateGrant(
  grant: CapabilityGrant,
  request: CapabilityRequest,
): CapabilityDecision {
  if (grant.revokedAtMs !== undefined && grant.revokedAtMs <= request.nowMs) {
    return { allowed: false, reason: 'grant_revoked' };
  }

  if (grant.expiresAtMs !== undefined && grant.expiresAtMs <= request.nowMs) {
    return { allowed: false, reason: 'grant_expired' };
  }

  const scope = grant.scope;
  if (!scope) {
    return {
      allowed: true,
      reason: 'allowed',
      grantId: grant.grantId,
    };
  }

  if (
    scope.resourceId !== undefined &&
    request.resourceId !== scope.resourceId
  ) {
    return { allowed: false, reason: 'resource_mismatch' };
  }

  if (
    scope.resourcePrefix !== undefined &&
    (
      request.resourcePath === undefined ||
      !resourcePrefixMatches(request.resourcePath, scope.resourcePrefix)
    )
  ) {
    return { allowed: false, reason: 'resource_mismatch' };
  }

  if (
    scope.allowedDomains !== undefined &&
    (
      request.domain === undefined ||
      !scope.allowedDomains.some((domain) => domainMatches(request.domain!, domain))
    )
  ) {
    return { allowed: false, reason: 'domain_mismatch' };
  }

  if (request.background === true && scope.allowBackground !== true) {
    return { allowed: false, reason: 'background_not_allowed' };
  }

  const requestedElevation = request.elevation ?? 'none';
  const allowedElevation = scope.maxElevation ?? 'none';
  if (ELEVATION_RANK[requestedElevation] > ELEVATION_RANK[allowedElevation]) {
    return { allowed: false, reason: 'elevation_not_allowed' };
  }

  return {
    allowed: true,
    reason: 'allowed',
    grantId: grant.grantId,
  };
}

export function authorizeCapability(
  request: CapabilityRequest,
  grants: readonly CapabilityGrant[],
): CapabilityDecision {
  if (
    request.subjectId.trim().length === 0 ||
    !Number.isFinite(request.nowMs)
  ) {
    return { allowed: false, reason: 'invalid_request' };
  }

  if (!isCapabilityId(request.capability)) {
    return { allowed: false, reason: 'unknown_capability' };
  }

  const candidates = grants.filter(
    (grant) =>
      grant.subjectId === request.subjectId &&
      grant.capability === request.capability,
  );

  if (candidates.length === 0) {
    return { allowed: false, reason: 'no_matching_grant' };
  }

  let firstFailure: CapabilityDecision | undefined;

  for (const grant of candidates) {
    const decision = evaluateGrant(grant, request);
    if (decision.allowed) {
      return decision;
    }

    firstFailure ??= decision;
  }

  return firstFailure ?? { allowed: false, reason: 'no_matching_grant' };
}
