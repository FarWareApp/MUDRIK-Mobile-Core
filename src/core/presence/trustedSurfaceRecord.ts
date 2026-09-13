import {
  isIdentityId,
} from '../identity/identityIds';

import {
  parseSurfaceDescriptor,
} from './surfaceContract';

import type {
  SurfaceDescriptor,
} from './surfaceContract';

export type TrustedSurfaceState =
  | 'active'
  | 'revoked';

export type TrustedSurfaceRecord = Readonly<{
  accountId: string;
  surface: SurfaceDescriptor;
  revision: number;
  approvedAt: number;
  state: TrustedSurfaceState;
}>;

const ALLOWED_KEYS = new Set([
  'accountId',
  'surface',
  'revision',
  'approvedAt',
  'state',
]);

function isSafeIntegerAtLeast(
  value: unknown,
  minimum: number,
): value is number {
  return (
    typeof value === 'number'
    && Number.isSafeInteger(value)
    && value >= minimum
  );
}

function isState(
  value: unknown,
): value is TrustedSurfaceState {
  return value === 'active' || value === 'revoked';
}

export function parseTrustedSurfaceRecord(
  input: unknown,
): TrustedSurfaceRecord | null {
  if (
    typeof input !== 'object'
    || input === null
    || Array.isArray(input)
  ) {
    return null;
  }

  const record = input as Record<string, unknown>;

  if (
    Object.keys(record).length !== ALLOWED_KEYS.size
    || Object.keys(record).some(
      (key) => !ALLOWED_KEYS.has(key),
    )
    || !isIdentityId('account', record.accountId)
    || !isSafeIntegerAtLeast(record.revision, 1)
    || !isSafeIntegerAtLeast(record.approvedAt, 0)
    || !isState(record.state)
  ) {
    return null;
  }

  const surface = parseSurfaceDescriptor(
    record.surface,
  );

  if (!surface) {
    return null;
  }

  return Object.freeze({
    accountId: record.accountId,
    surface,
    revision: record.revision,
    approvedAt: record.approvedAt,
    state: record.state,
  });
}
