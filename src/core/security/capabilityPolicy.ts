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
  | 'grant_invalid'
  | 'grant_scope_required'
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

const RESOURCE_PREFIX_REQUIRED: ReadonlySet<CapabilityId> = new Set([
  'filesystem.read',
  'filesystem.write',
  'terminal.execute',
  'git.read',
  'git.write',
]);

const DOMAIN_ALLOWLIST_REQUIRED: ReadonlySet<CapabilityId> = new Set([
  'network.request',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

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
    !value.startsWith('/') ||
    value.includes('\0') ||
    value.includes('\\') ||
    value.includes('%')
  ) {
    return null;
  }

  const segments = value.split('/');
  if (
    segments.some((segment) => segment === '..' || segment === '.') ||
    segments.slice(1).some((segment) => segment.length === 0)
  ) {
    return null;
  }

  return value === '/' ? '/' : `/${segments.slice(1).join('/')}`;
}

function resourcePrefixMatches(resourcePath: string, resourcePrefix: string): boolean {
  const path = normalizeScopedPath(resourcePath);
  const prefix = normalizeScopedPath(resourcePrefix);

  if (!path || !prefix) {
    return false;
  }

  if (prefix === '/') {
    return true;
  }

  return path === prefix || path.startsWith(`${prefix}/`);
}

function parseScope(value: unknown): CapabilityScope | null {
  if (value === undefined) {
    return {};
  }

  if (!isRecord(value)) {
    return null;
  }

  const allowedKeys = new Set([
    'resourceId',
    'resourcePrefix',
    'allowedDomains',
    'allowBackground',
    'maxElevation',
  ]);

  if (Object.keys(value).some((key) => !allowedKeys.has(key))) {
    return null;
  }

  if (
    value.resourceId !== undefined &&
    (
      typeof value.resourceId !== 'string' ||
      value.resourceId.trim().length === 0 ||
      value.resourceId.length > 256 ||
      value.resourceId.includes('\0')
    )
  ) {
    return null;
  }

  if (
    value.resourcePrefix !== undefined &&
    (
      typeof value.resourcePrefix !== 'string' ||
      normalizeScopedPath(value.resourcePrefix) === null
    )
  ) {
    return null;
  }

  if (value.allowedDomains !== undefined) {
    if (
      !Array.isArray(value.allowedDomains) ||
      value.allowedDomains.length === 0 ||
      value.allowedDomains.length > 64 ||
      value.allowedDomains.some(
        (domain) => typeof domain !== 'string' || normalizeDomain(domain) === null,
      )
    ) {
      return null;
    }
  }

  if (
    value.allowBackground !== undefined &&
    typeof value.allowBackground !== 'boolean'
  ) {
    return null;
  }

  if (
    value.maxElevation !== undefined &&
    !['none', 'user', 'admin'].includes(String(value.maxElevation))
  ) {
    return null;
  }

  return value as CapabilityScope;
}

function parseGrant(value: unknown):
  | { grant: CapabilityGrant; reason: null }
  | { grant: null; reason: 'grant_invalid' | 'grant_scope_required' } {
  if (!isRecord(value)) {
    return { grant: null, reason: 'grant_invalid' };
  }

  const allowedKeys = new Set([
    'grantId',
    'subjectId',
    'capability',
    'scope',
    'expiresAtMs',
    'revokedAtMs',
  ]);

  if (Object.keys(value).some((key) => !allowedKeys.has(key))) {
    return { grant: null, reason: 'grant_invalid' };
  }

  if (
    typeof value.grantId !== 'string' ||
    value.grantId.trim().length === 0 ||
    value.grantId.length > 256 ||
    typeof value.subjectId !== 'string' ||
    value.subjectId.trim().length === 0 ||
    value.subjectId.length > 256 ||
    !isCapabilityId(value.capability)
  ) {
    return { grant: null, reason: 'grant_invalid' };
  }

  if (
    value.expiresAtMs !== undefined &&
    (typeof value.expiresAtMs !== 'number' || !Number.isFinite(value.expiresAtMs))
  ) {
    return { grant: null, reason: 'grant_invalid' };
  }

  if (
    value.revokedAtMs !== undefined &&
    (typeof value.revokedAtMs !== 'number' || !Number.isFinite(value.revokedAtMs))
  ) {
    return { grant: null, reason: 'grant_invalid' };
  }

  const scope = parseScope(value.scope);
  if (!scope) {
    return { grant: null, reason: 'grant_invalid' };
  }

  if (
    RESOURCE_PREFIX_REQUIRED.has(value.capability) &&
    scope.resourcePrefix === undefined
  ) {
    return { grant: null, reason: 'grant_scope_required' };
  }

  if (
    DOMAIN_ALLOWLIST_REQUIRED.has(value.capability) &&
    scope.allowedDomains === undefined
  ) {
    return { grant: null, reason: 'grant_scope_required' };
  }

  return {
    grant: {
      grantId: value.grantId,
      subjectId: value.subjectId,
      capability: value.capability,
      scope,
      expiresAtMs: value.expiresAtMs as number | undefined,
      revokedAtMs: value.revokedAtMs as number | undefined,
    },
    reason: null,
  };
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

  const scope = grant.scope ?? {};

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

  if (scope.allowedDomains !== undefined) {
    const requestedDomain = request.domain;
    if (
      requestedDomain === undefined ||
      !scope.allowedDomains.some((domain) => domainMatches(requestedDomain, domain))
    ) {
      return { allowed: false, reason: 'domain_mismatch' };
    }
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
  grants: readonly unknown[],
): CapabilityDecision {
  if (
    request.subjectId.trim().length === 0 ||
    request.subjectId.length > 256 ||
    !Number.isFinite(request.nowMs)
  ) {
    return { allowed: false, reason: 'invalid_request' };
  }

  if (!isCapabilityId(request.capability)) {
    return { allowed: false, reason: 'unknown_capability' };
  }

  const candidates = grants.filter(
    (candidate) =>
      isRecord(candidate) &&
      candidate.subjectId === request.subjectId &&
      candidate.capability === request.capability,
  );

  if (candidates.length === 0) {
    return { allowed: false, reason: 'no_matching_grant' };
  }

  let firstFailure: CapabilityDecision | undefined;

  for (const candidate of candidates) {
    const parsed = parseGrant(candidate);
    if (!parsed.grant) {
      firstFailure ??= { allowed: false, reason: parsed.reason };
      continue;
    }

    const decision = evaluateGrant(parsed.grant, request);
    if (decision.allowed) {
      return decision;
    }

    firstFailure ??= decision;
  }

  return firstFailure ?? { allowed: false, reason: 'no_matching_grant' };
}
