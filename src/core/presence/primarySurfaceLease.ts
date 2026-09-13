import type {
  ObservationPrivacyPolicyState,
} from '../privacy/observationPrivacyState';

import {
  isPresenceSessionId,
} from './presenceSessionId';

import {
  isSurfaceId,
} from './surfaceContract';

export type PrimarySurfaceLease = Readonly<{
  presenceSessionId: string;
  surfaceId: string;
  generation: number;
  issuedAt: number;
  expiresAt: number;
  privacyState: ObservationPrivacyPolicyState;
}>;

export type PrimarySurfaceLeaseResult = Readonly<{
  accepted: boolean;
  reason:
    | 'accepted'
    | 'duplicate'
    | 'invalid_lease'
    | 'expired_lease'
    | 'future_lease'
    | 'stale_generation'
    | 'generation_gap'
    | 'generation_conflict'
    | 'privacy_state_mismatch';
}>;

const MAX_LEASE_TTL_MS =
  60_000;

const PRIVACY_STATES: readonly ObservationPrivacyPolicyState[] = [
  'active',
  'visual_off',
  'ambient_off',
  'privacy_lock',
];

const ALLOWED_KEYS = new Set([
  'presenceSessionId',
  'surfaceId',
  'generation',
  'issuedAt',
  'expiresAt',
  'privacyState',
]);

function isSafeNonNegativeInteger(
  value: unknown,
): value is number {
  return (
    typeof value === 'number'
    && Number.isSafeInteger(value)
    && value >= 0
  );
}

export function parsePrimarySurfaceLease(
  input: unknown,
): PrimarySurfaceLease | null {
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
    Object.keys(record).length !== ALLOWED_KEYS.size
    || Object.keys(record).some(
      (key) => !ALLOWED_KEYS.has(key),
    )
  ) {
    return null;
  }

  if (
    !isPresenceSessionId(record.presenceSessionId)
    || !isSurfaceId(record.surfaceId)
    || !isSafeNonNegativeInteger(record.generation)
    || !isSafeNonNegativeInteger(record.issuedAt)
    || !isSafeNonNegativeInteger(record.expiresAt)
    || record.expiresAt <= record.issuedAt
    || record.expiresAt - record.issuedAt
      > MAX_LEASE_TTL_MS
    || typeof record.privacyState !== 'string'
    || !PRIVACY_STATES.includes(
      record.privacyState as ObservationPrivacyPolicyState,
    )
  ) {
    return null;
  }

  return Object.freeze({
    presenceSessionId:
      record.presenceSessionId,
    surfaceId: record.surfaceId,
    generation: record.generation,
    issuedAt: record.issuedAt,
    expiresAt: record.expiresAt,
    privacyState:
      record.privacyState as ObservationPrivacyPolicyState,
  });
}

function leasesEqual(
  left: PrimarySurfaceLease,
  right: PrimarySurfaceLease,
): boolean {
  return (
    left.presenceSessionId
      === right.presenceSessionId
    && left.surfaceId === right.surfaceId
    && left.generation === right.generation
    && left.issuedAt === right.issuedAt
    && left.expiresAt === right.expiresAt
    && left.privacyState === right.privacyState
  );
}

export class PrimarySurfaceLeaseRegistry {
  private readonly leases =
    new Map<string, PrimarySurfaceLease>();

  claim(
    rawLease: unknown,
    now: number,
  ): PrimarySurfaceLeaseResult {
    const lease =
      parsePrimarySurfaceLease(rawLease);

    if (
      !lease
      || !isSafeNonNegativeInteger(now)
    ) {
      return {
        accepted: false,
        reason: 'invalid_lease',
      };
    }

    if (lease.issuedAt > now) {
      return {
        accepted: false,
        reason: 'future_lease',
      };
    }

    if (lease.expiresAt <= now) {
      return {
        accepted: false,
        reason: 'expired_lease',
      };
    }

    const current =
      this.leases.get(
        lease.presenceSessionId,
      );

    if (!current) {
      if (lease.generation !== 0) {
        return {
          accepted: false,
          reason: 'generation_gap',
        };
      }

      this.leases.set(
        lease.presenceSessionId,
        lease,
      );

      return {
        accepted: true,
        reason: 'accepted',
      };
    }

    if (lease.generation < current.generation) {
      return {
        accepted: false,
        reason: 'stale_generation',
      };
    }

    if (lease.generation === current.generation) {
      if (leasesEqual(current, lease)) {
        return {
          accepted: true,
          reason: 'duplicate',
        };
      }

      return {
        accepted: false,
        reason: 'generation_conflict',
      };
    }

    if (
      lease.generation !== current.generation + 1
    ) {
      return {
        accepted: false,
        reason: 'generation_gap',
      };
    }

    if (
      lease.privacyState !== current.privacyState
    ) {
      return {
        accepted: false,
        reason: 'privacy_state_mismatch',
      };
    }

    this.leases.set(
      lease.presenceSessionId,
      lease,
    );

    return {
      accepted: true,
      reason: 'accepted',
    };
  }

  get(
    presenceSessionId: string,
  ): PrimarySurfaceLease | null {
    return this.leases.get(
      presenceSessionId,
    ) ?? null;
  }

  ownsPrimary(
    presenceSessionId: string,
    surfaceId: string,
    generation: number,
    now: number,
  ): boolean {
    if (
      !isPresenceSessionId(presenceSessionId)
      || !isSurfaceId(surfaceId)
      || !isSafeNonNegativeInteger(generation)
      || !isSafeNonNegativeInteger(now)
    ) {
      return false;
    }

    const lease =
      this.leases.get(
        presenceSessionId,
      );

    return Boolean(
      lease
      && lease.surfaceId === surfaceId
      && lease.generation === generation
      && lease.issuedAt <= now
      && lease.expiresAt > now,
    );
  }

  clear(): void {
    this.leases.clear();
  }
}
