import path from 'node:path';

import {
  assertKnownCapabilities,
  capabilityMinimumRisk,
} from './capabilities.mjs';

import {
  isPermissionGrantActive,
  parsePermissionGrant,
} from './permission-grant.mjs';

export const RISK_ORDER = Object.freeze({
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
});

function maximumRisk(
  ...levels
) {
  let selected = 'low';

  for (const level of levels) {
    if (
      !Object.hasOwn(
        RISK_ORDER,
        level,
      )
    ) {
      return null;
    }

    if (
      RISK_ORDER[level]
        > RISK_ORDER[selected]
    ) {
      selected = level;
    }
  }

  return selected;
}

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

function capabilityCovered(
  grantInput,
  capability,
  context,
  deviceId,
  trustedNowMs,
) {
  const grant =
    parsePermissionGrant(
      grantInput,
    );

  if (
    !grant
    || !isPermissionGrantActive(
      grant,
      trustedNowMs,
    )
    || grant.capability !== capability
    || grant.deviceId !== deviceId
  ) {
    return false;
  }

  const scope = grant.scope;

  if (context.cwd) {
    if (
      scope.filesystemRoots.length === 0
      || !scope.filesystemRoots.some(
        (root) =>
          pathWithin(
            context.cwd,
            root,
          ),
      )
    ) {
      return false;
    }
  }

  if (context.paths !== undefined) {
    if (
      !Array.isArray(context.paths)
      || context.paths.length === 0
      || scope.filesystemRoots.length === 0
      || context.paths.some(
        (candidate) =>
          typeof candidate !== 'string'
          || !scope.filesystemRoots.some(
            (root) =>
              pathWithin(
                candidate,
                root,
              ),
          ),
      )
    ) {
      return false;
    }
  }

  if (context.executable) {
    if (
      scope.executables.length === 0
      || !scope.executables.includes(
        context.executable,
      )
    ) {
      return false;
    }
  }

  if (context.repository) {
    if (
      typeof context.repository
        !== 'string'
      || !path.isAbsolute(
        context.repository,
      )
      || scope.repositories.length === 0
      || !scope.repositories.some(
        (repository) =>
          typeof repository === 'string'
          && path.isAbsolute(repository)
          && path.resolve(repository)
            === path.resolve(
              context.repository,
            ),
      )
    ) {
      return false;
    }
  }

  if (context.domain) {
    if (
      scope.domains.length === 0
      || !scope.domains.includes(
        context.domain,
      )
    ) {
      return false;
    }
  }

  if (
    context.secretRefs !== undefined
  ) {
    if (
      !Array.isArray(
        context.secretRefs,
      )
      || context.secretRefs.length === 0
      || scope.secretRefs.length === 0
      || context.secretRefs.some(
        (reference) =>
          !scope.secretRefs.includes(
            reference,
          ),
      )
    ) {
      return false;
    }
  }

  if (
    context.requiresBackground
    && scope.backgroundAllowed
      !== true
  ) {
    return false;
  }

  if (
    context.timeoutMs !== undefined
    && scope.maxTaskDurationSeconds
      !== null
    && (
      !Number.isFinite(
        context.timeoutMs,
      )
      || context.timeoutMs < 0
      || context.timeoutMs
        > scope.maxTaskDurationSeconds
          * 1000
    )
  ) {
    return false;
  }

  if (
    context.requiresElevation
    && scope.elevationAllowed
      !== true
  ) {
    return false;
  }

  return true;
}

function findCoveringGrant(
  grants,
  capability,
  context,
  deviceId,
  trustedNowMs,
) {
  return grants.find(
    (grant) =>
      capabilityCovered(
        grant,
        capability,
        context,
        deviceId,
        trustedNowMs,
      ),
  );
}

export function evaluateTaskPolicy({
  task,
  grants = [],
  contextByCapability = {},
  trustedNowMs = Date.now(),
}) {
  if (
    !task
    || typeof task !== 'object'
    || typeof task.deviceId !== 'string'
    || task.deviceId.length < 8
    || !Number.isSafeInteger(
      trustedNowMs,
    )
    || trustedNowMs < 0
  ) {
    return {
      allowed: false,
      reason: 'invalid-task',
    };
  }

  if (
    !Object.hasOwn(
      RISK_ORDER,
      task.risk,
    )
  ) {
    return {
      allowed: false,
      reason: 'invalid-risk',
    };
  }

  if (!Array.isArray(grants)) {
    return {
      allowed: false,
      reason: 'invalid-grants',
    };
  }

  if (task.expiresAt) {
    const expiresAt = Date.parse(task.expiresAt);

    if (
      !Number.isFinite(expiresAt)
      || expiresAt <= trustedNowMs
    ) {
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

  const capabilityRiskLevels =
    task.requestedCapabilities.map(
      capabilityMinimumRisk,
    );

  const contextRiskLevels =
    task.requestedCapabilities.map(
      (capability) =>
        contextByCapability[
          capability
        ]?.minimumRisk
        ?? 'low',
    );

  const effectiveRisk =
    maximumRisk(
      task.risk,
      ...capabilityRiskLevels,
      ...contextRiskLevels,
    );

  if (!effectiveRisk) {
    return {
      allowed: false,
      reason: 'invalid-risk',
    };
  }

  const coveringGrants = new Map();
  const missingCapabilities = [];

  for (const capability of task.requestedCapabilities) {
    const context = contextByCapability[capability] ?? {};
    const grant =
      findCoveringGrant(
        grants,
        capability,
        context,
        task.deviceId,
        trustedNowMs,
      );

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

  if (effectiveRisk === 'critical') {
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

  if (effectiveRisk === 'high') {
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
    coveringGrantIds:
      Object.freeze(
        Object.fromEntries(
          [...coveringGrants.entries()]
            .map(
              ([
                capability,
                grant,
              ]) => [
                capability,
                grant.grantId,
              ],
            ),
        ),
      ),
  };
}

export function isPathWithinScope(candidate, roots = []) {
  return roots.some((root) => pathWithin(candidate, root));
}


export function activeCapabilityGrants({
  grants = [],
  capability,
  deviceId,
  trustedNowMs,
}) {
  if (
    !Array.isArray(grants)
    || typeof capability !== 'string'
    || typeof deviceId !== 'string'
    || !Number.isSafeInteger(
      trustedNowMs,
    )
    || trustedNowMs < 0
  ) {
    return Object.freeze([]);
  }

  const active = [];

  for (const grantInput of grants) {
    const grant =
      parsePermissionGrant(
        grantInput,
      );

    if (
      grant
      && grant.capability === capability
      && grant.deviceId === deviceId
      && isPermissionGrantActive(
        grant,
        trustedNowMs,
      )
    ) {
      active.push(grant);
    }
  }

  return Object.freeze(active);
}
