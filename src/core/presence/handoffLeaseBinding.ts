import {
  parseTrustedEvaluationTime,
} from '../security/trustedEvaluationTime';

import {
  parseHandoffStateManifest,
} from './handoffStateManifest';

import {
  parsePrimarySurfaceLease,
} from './primarySurfaceLease';

export type HandoffLeaseBindingReason =
  | 'accepted'
  | 'invalid_input'
  | 'inactive_lease'
  | 'future_manifest'
  | 'stale_manifest'
  | 'lease_mismatch'
  | 'privacy_state_mismatch';

export type HandoffLeaseBindingDecision = Readonly<{
  accepted: boolean;
  reason: HandoffLeaseBindingReason;
  grantsInheritedAuthority: false;
}>;

function result(
  accepted: boolean,
  reason: HandoffLeaseBindingReason,
): HandoffLeaseBindingDecision {
  return Object.freeze({
    accepted,
    reason,
    grantsInheritedAuthority: false,
  });
}

export function evaluateHandoffLeaseBinding(
  manifestInput: unknown,
  leaseInput: unknown,
  trustedEvaluationTimeInput: unknown,
): HandoffLeaseBindingDecision {
  const manifest =
    parseHandoffStateManifest(
      manifestInput,
    );
  const lease =
    parsePrimarySurfaceLease(
      leaseInput,
    );
  const trustedEvaluationTimeMs =
    parseTrustedEvaluationTime(
      trustedEvaluationTimeInput,
    );

  if (
    !manifest
    || !lease
    || trustedEvaluationTimeMs === null
  ) {
    return result(
      false,
      'invalid_input',
    );
  }

  if (
    lease.issuedAt
      > trustedEvaluationTimeMs
    || lease.expiresAt
      <= trustedEvaluationTimeMs
  ) {
    return result(
      false,
      'inactive_lease',
    );
  }

  if (
    manifest.createdAt
      > trustedEvaluationTimeMs
  ) {
    return result(
      false,
      'future_manifest',
    );
  }

  if (
    manifest.createdAt
      < lease.issuedAt
  ) {
    return result(
      false,
      'stale_manifest',
    );
  }

  if (
    manifest.presenceSessionId
      !== lease.presenceSessionId
    || manifest.targetSurfaceId
      !== lease.surfaceId
    || manifest.generation
      !== lease.generation
  ) {
    return result(
      false,
      'lease_mismatch',
    );
  }

  if (
    manifest.privacyState
      !== lease.privacyState
  ) {
    return result(
      false,
      'privacy_state_mismatch',
    );
  }

  return result(
    true,
    'accepted',
  );
}
