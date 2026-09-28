import {
  isKnownCapability,
} from './capabilities.mjs';

import {
  isSecretReference,
} from './secret-reference.mjs';

const KEYS = new Set([
  'grantId',
  'deviceId',
  'capability',
  'scope',
  'mode',
  'createdAt',
  'expiresAt',
  'revokedAt',
]);

const SCOPE_KEYS = new Set([
  'filesystemRoots',
  'repositories',
  'executables',
  'domains',
  'secretRefs',
  'backgroundAllowed',
  'elevationAllowed',
  'maxTaskDurationSeconds',
]);

const MODES = new Set([
  'one_shot',
  'session',
  'persistent',
]);

function validId(value) {
  return (
    typeof value === 'string'
    && value.length >= 8
    && value.length <= 160
  );
}

function validDateTime(value) {
  if (typeof value !== 'string') {
    return false;
  }

  const parsed = Date.parse(value);

  return (
    Number.isFinite(parsed)
    && new Date(parsed).toISOString()
      === value
  );
}

function validStringArray(
  value,
  maxLength,
) {
  if (value === undefined) {
    return true;
  }

  return (
    Array.isArray(value)
    && value.length <= 256
    && value.every(
      (entry) =>
        typeof entry === 'string'
        && entry.length > 0
        && entry.length <= maxLength,
    )
    && new Set(value).size
      === value.length
  );
}

function parseScope(value) {
  if (
    typeof value !== 'object'
    || value === null
    || Array.isArray(value)
    || Object.keys(value).some(
      (key) => !SCOPE_KEYS.has(key),
    )
    || !validStringArray(
      value.filesystemRoots,
      4096,
    )
    || !validStringArray(
      value.repositories,
      512,
    )
    || !validStringArray(
      value.executables,
      512,
    )
    || !validStringArray(
      value.domains,
      512,
    )
    || (
      value.secretRefs !== undefined
      && (
        !Array.isArray(
          value.secretRefs,
        )
        || value.secretRefs.length > 64
        || value.secretRefs.some(
          (reference) =>
            !isSecretReference(
              reference,
            ),
        )
        || new Set(
          value.secretRefs,
        ).size !== value.secretRefs.length
      )
    )
    || (
      value.backgroundAllowed
        !== undefined
      && typeof value.backgroundAllowed
        !== 'boolean'
    )
    || (
      value.elevationAllowed
        !== undefined
      && typeof value.elevationAllowed
        !== 'boolean'
    )
    || (
      value.maxTaskDurationSeconds
        !== undefined
      && (
        !Number.isInteger(
          value.maxTaskDurationSeconds,
        )
        || value.maxTaskDurationSeconds
          < 1
        || value.maxTaskDurationSeconds
          > 86_400
      )
    )
  ) {
    return null;
  }

  return Object.freeze({
    filesystemRoots:
      Object.freeze([
        ...(value.filesystemRoots ?? []),
      ]),
    repositories:
      Object.freeze([
        ...(value.repositories ?? []),
      ]),
    executables:
      Object.freeze([
        ...(value.executables ?? []),
      ]),
    domains:
      Object.freeze([
        ...(value.domains ?? []),
      ]),
    secretRefs:
      Object.freeze([
        ...(value.secretRefs ?? []),
      ]),
    backgroundAllowed:
      value.backgroundAllowed === true,
    elevationAllowed:
      value.elevationAllowed === true,
    maxTaskDurationSeconds:
      value.maxTaskDurationSeconds
        ?? null,
  });
}

export function parsePermissionGrant(
  input,
) {
  if (
    typeof input !== 'object'
    || input === null
    || Array.isArray(input)
    || Object.keys(input).some(
      (key) => !KEYS.has(key),
    )
    || !validId(input.grantId)
    || !validId(input.deviceId)
    || !isKnownCapability(
      input.capability,
    )
    || !MODES.has(input.mode)
    || !validDateTime(
      input.createdAt,
    )
    || (
      input.expiresAt !== null
      && !validDateTime(
        input.expiresAt,
      )
    )
    || (
      input.revokedAt !== undefined
      && input.revokedAt !== null
      && !validDateTime(
        input.revokedAt,
      )
    )
  ) {
    return null;
  }

  const scope =
    parseScope(input.scope);

  if (!scope) {
    return null;
  }

  const createdAtMs =
    Date.parse(input.createdAt);
  const expiresAtMs =
    input.expiresAt === null
      ? null
      : Date.parse(input.expiresAt);

  if (
    expiresAtMs !== null
    && expiresAtMs <= createdAtMs
  ) {
    return null;
  }

  return Object.freeze({
    grantId: input.grantId,
    deviceId: input.deviceId,
    capability: input.capability,
    scope,
    mode: input.mode,
    createdAt: input.createdAt,
    expiresAt:
      input.expiresAt,
    revokedAt:
      input.revokedAt ?? null,
  });
}

export function isPermissionGrantActive(
  grant,
  trustedNowMs,
) {
  if (
    !grant
    || !Number.isSafeInteger(
      trustedNowMs,
    )
    || trustedNowMs < 0
  ) {
    return false;
  }

  const createdAtMs =
    Date.parse(grant.createdAt);

  if (
    !Number.isFinite(createdAtMs)
    || createdAtMs > trustedNowMs
    || grant.revokedAt !== null
  ) {
    return false;
  }

  if (grant.expiresAt === null) {
    return true;
  }

  const expiresAtMs =
    Date.parse(grant.expiresAt);

  return (
    Number.isFinite(expiresAtMs)
    && expiresAtMs > trustedNowMs
  );
}
