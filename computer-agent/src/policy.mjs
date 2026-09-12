import path from 'node:path';

import { assertKnownCapabilities } from './capabilities.mjs';

export const RISK_ORDER = Object.freeze({
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
});

function normalizePath(value) {
  return path.resolve(value);
}

function pathWithin(candidate, allowedRoot) {
  const resolvedCandidate = normalizePath(candidate);
  const resolvedRoot = normalizePath(allowedRoot);
  const relative = path.relative(resolvedRoot, resolvedCandidate);

  return relative === '' || (
    !relative.startsWith('..') &&
    !path.isAbsolute(relative)
  );
}

function grantIsActive(grant) {
  if (!grant || grant.revokedAt) {
    return false;
  }

  if (!grant.expiresAt) {
    return true;
  }

  const expiresAt = Date.parse(grant.expiresAt);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

function capabilityCovered(grant, capability, context) {
  if (!grantIsActive(grant) || grant.capability !== capability) {
    return false;
  }

  const scope = grant.scope ?? {};

  if (context.cwd && Array.isArray(scope.filesystemRoots) && scope.filesystemRoots.length > 0) {
    if (!scope.filesystemRoots.some((root) => pathWithin(context.cwd, root))) {
      return false;
    }
  }

  if (context.executable && Array.isArray(scope.executables) && scope.executables.length > 0) {
    if (!scope.executables.includes(context.executable)) {
      return false;
    }
  }

  if (context.domain && Array.isArray(scope.domains) && scope.domains.length > 0) {
    if (!scope.domains.includes(context.domain)) {
      return false;
    }
  }

  if (context.requiresElevation && scope.elevationAllowed !== true) {
    return false;
  }

  return true;
}

function findCoveringGrant(grants, capability, context) {
  return grants.find((grant) => capabilityCovered(grant, capability, context));
}

export function evaluateTaskPolicy({ task, grants = [], contextByCapability = {} }) {
  if (!task || typeof task !== 'object') {
    return { allowed: false, reason: 'invalid-task' };
  }

  if (!(task.risk in RISK_ORDER)) {
    return { allowed: false, reason: 'invalid-risk' };
  }

  if (task.expiresAt) {
    const expiresAt = Date.parse(task.expiresAt);

    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      return { allowed: false, reason: 'expired-task' };
    }
  }

  try {
    assertKnownCapabilities(task.requestedCapabilities);
  } catch (error) {
    return {
      allowed: false,
      reason: 'unknown-capability',
      detail: error instanceof Error ? error.message : String(error),
    };
  }

  const coveringGrants = new Map();
  const missingCapabilities = [];

  for (const capability of task.requestedCapabilities) {
    const context = contextByCapability[capability] ?? {};
    const grant = findCoveringGrant(grants, capability, context);

    if (!grant) {
      missingCapabilities.push(capability);
    } else {
      coveringGrants.set(capability, grant);
    }
  }

  if (missingCapabilities.length > 0) {
    return {
      allowed: false,
      reason: 'approval-required',
      missingCapabilities,
    };
  }

  if (task.approval?.mode === 'blocked') {
    return {
      allowed: false,
      reason: 'task-blocked',
    };
  }

  if (task.risk === 'critical') {
    const freshApproval =
      task.approval?.mode === 'one_shot' &&
      typeof task.approval?.approvalId === 'string' &&
      task.approval.approvalId.length > 0;

    if (!freshApproval) {
      return {
        allowed: false,
        reason: 'fresh-critical-approval-required',
      };
    }
  }

  if (task.risk === 'high') {
    const explicitlyApproved =
      (task.approval?.mode === 'task' || task.approval?.mode === 'one_shot') &&
      typeof task.approval?.approvalId === 'string' &&
      task.approval.approvalId.length > 0;

    const persistentPolicyCoversAll =
      [...coveringGrants.values()].every((grant) => grant.mode === 'persistent');

    if (!explicitlyApproved && !persistentPolicyCoversAll) {
      return {
        allowed: false,
        reason: 'high-risk-approval-required',
      };
    }
  }

  return {
    allowed: true,
    reason: 'authorized',
  };
}

export function isPathWithinScope(candidate, roots = []) {
  return roots.some((root) => pathWithin(candidate, root));
}
