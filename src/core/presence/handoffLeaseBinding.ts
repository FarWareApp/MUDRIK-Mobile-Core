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
  | 'source_lease_mismatch'
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
  sourceLeaseInput: unknown,
  targetLeaseInput: unknown,
  trustedEvaluationTimeInput: unknown,
): HandoffLeaseBindingDecision {
  const manifest =
    parseHandoffStateManifest(
      manifestInput,
    );
  const sourceLease =
    parsePrimarySurfaceLease(
      sourceLeaseInput,
    );
  const targetLease =
    parsePrimarySurfaceLease(
      targetLeaseInput,
    );
  const trustedEvaluationTimeMs =
    parseTrustedEvaluationTime(
      trustedEvaluationTimeInput,
    );

  if (
    !manifest
    || !sourceLease
    || !targetLease
    || trustedEvaluationTimeMs === null
  ) {
    return result(
      false,
      'invalid_input',
    );
  }

  if (
    targetLease.issuedAt
      > trustedEvaluationTimeMs
    || targetLease.expiresAt
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
      < targetLease.issuedAt
  ) {
    return result(
      false,
      'stale_manifest',
    );
  }

  if (
    manifest.presenceSessionId
      !== targetLease.presenceSessionId
    || manifest.targetSurfaceId
      !== targetLease.surfaceId
    || manifest.generation
      !== targetLease.generation
  ) {
    return result(
      false,
      'lease_mismatch',
    );
  }

  if (
    sourceLease.presenceSessionId
      !== manifest.presenceSessionId
    || sourceLease.surfaceId
      !== manifest.sourceSurfaceId
    || sourceLease.generation + 1
      !== manifest.generation
    || sourceLease.issuedAt
      > targetLease.issuedAt
    || sourceLease.expiresAt
      <= targetLease.issuedAt
  ) {
    return result(
      false,
      'source_lease_mismatch',
    );
  }

  if (
    manifest.privacyState
      !== targetLease.privacyState
    || sourceLease.privacyState
      !== targetLease.privacyState
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
