import {
  parseTrustedEvaluationTime,
} from '../security/trustedEvaluationTime';

import {
  parsePrimarySurfaceLease,
} from './primarySurfaceLease';

import type {
  PrimarySurfaceLease,
} from './primarySurfaceLease';

import {
  isPresenceSessionId,
} from './presenceSessionId';

export type PrimarySurfaceReconciliationReason =
  | 'selected'
  | 'no_active_lease'
  | 'invalid_input'
  | 'future_claim'
  | 'generation_conflict'
  | 'privacy_state_conflict';

export type PrimarySurfaceReconciliation = Readonly<{
  accepted: boolean;
  lease: PrimarySurfaceLease | null;
  reason: PrimarySurfaceReconciliationReason;
  grantsExecutionAuthority: false;
  grantsSensorAuthority: false;
  grantsMemoryAuthority: false;
  grantsDisclosureAuthority: false;
}>;

const ALLOWED_KEYS = new Set([
  'presenceSessionId',
  'claims',
]);

function result(
  accepted: boolean,
  lease: PrimarySurfaceLease | null,
  reason: PrimarySurfaceReconciliationReason,
): PrimarySurfaceReconciliation {
  return Object.freeze({
    accepted,
    lease,
    reason,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsMemoryAuthority: false,
    grantsDisclosureAuthority: false,
  });
}

function leasesEqual(
  left: PrimarySurfaceLease,
  right: PrimarySurfaceLease,
): boolean {
  return (
    left.presenceSessionId === right.presenceSessionId
    && left.surfaceId === right.surfaceId
    && left.generation === right.generation
    && left.issuedAt === right.issuedAt
    && left.expiresAt === right.expiresAt
    && left.privacyState === right.privacyState
  );
}

export function reconcilePrimarySurfaceLeases(
  input: unknown,
  trustedEvaluationTimeInput: unknown,
): PrimarySurfaceReconciliation {
  const trustedEvaluationTimeMs =
    parseTrustedEvaluationTime(
      trustedEvaluationTimeInput,
    );

  if (
    trustedEvaluationTimeMs === null
    || typeof input !== 'object'
    || input === null
    || Array.isArray(input)
  ) {
    return result(false, null, 'invalid_input');
  }

  const record =
    input as Record<string, unknown>;

  if (
    Object.keys(record).length !== ALLOWED_KEYS.size
    || Object.keys(record).some(
      (key) => !ALLOWED_KEYS.has(key),
    )
    || !isPresenceSessionId(
      record.presenceSessionId,
    )
    || !Array.isArray(record.claims)
    || record.claims.length > 32
  ) {
    return result(false, null, 'invalid_input');
  }

  const byGeneration =
    new Map<number, PrimarySurfaceLease>();
  let expectedPrivacyState:
    PrimarySurfaceLease['privacyState'] | null =
      null;

  for (const rawClaim of record.claims) {
    const claim =
      parsePrimarySurfaceLease(
        rawClaim,
      );

    if (
      !claim
      || claim.presenceSessionId
        !== record.presenceSessionId
    ) {
      return result(
        false,
        null,
        'invalid_input',
      );
    }

    if (claim.issuedAt > trustedEvaluationTimeMs) {
      return result(
        false,
        null,
        'future_claim',
      );
    }

    if (
      expectedPrivacyState === null
    ) {
      expectedPrivacyState =
        claim.privacyState;
    } else if (
      claim.privacyState
        !== expectedPrivacyState
    ) {
      return result(
        false,
        null,
        'privacy_state_conflict',
      );
    }

    const current =
      byGeneration.get(
        claim.generation,
      );

    if (
      current
      && !leasesEqual(
        current,
        claim,
      )
    ) {
      return result(
        false,
        null,
        'generation_conflict',
      );
    }

    byGeneration.set(
      claim.generation,
      claim,
    );
  }

  const active =
    [...byGeneration.values()]
      .filter(
        (claim) =>
          claim.expiresAt
            > trustedEvaluationTimeMs,
      )
      .sort(
        (left, right) =>
          right.generation
            - left.generation,
      );

  if (active.length === 0) {
    return result(
      true,
      null,
      'no_active_lease',
    );
  }

  return result(
    true,
    active[0],
    'selected',
  );
}
