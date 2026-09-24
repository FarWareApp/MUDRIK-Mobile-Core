import {
  evaluateDeviceTrust,
} from '../identity/deviceTrust';

import {
  isIdentityId,
} from '../identity/identityIds';

import {
  authorizeCapability,
} from '../security/capabilityPolicy';

import {
  parseTrustedEvaluationTime,
} from '../security/trustedEvaluationTime';

import {
  parseDeviceMediaAdapterDescriptor,
} from './deviceMediaAdapterContract';

import {
  evaluateMediaTransfer,
} from './mediaTransferPolicy';

import type {
  MediaTransferManifest,
} from './mediaTransferPolicy';

export type MediaTransferExecutionReason =
  | 'authorized'
  | 'invalid_input'
  | 'transfer_rejected'
  | 'adapter_mismatch'
  | 'adapter_unavailable'
  | 'adapter_stale'
  | 'unsupported_transfer'
  | 'device_untrusted'
  | 'source_capability_denied'
  | 'target_capability_denied';

export type MediaTransferExecutionDecision = Readonly<{
  authorized: boolean;
  reason: MediaTransferExecutionReason;
  manifest: MediaTransferManifest | null;
  sourceGrantId: string | null;
  targetGrantId: string | null;
  grantsAuthority: false;
}>;

const INPUT_KEYS = new Set([
  'accountId',
  'intent',
  'session',
  'resolvedTargetDeviceId',
  'sourceAdapter',
  'targetAdapter',
  'sourceDeviceTrustInput',
  'targetDeviceTrustInput',
  'capabilityGrants',
]);

function result(
  authorized: boolean,
  reason: MediaTransferExecutionReason,
  manifest: MediaTransferManifest | null = null,
  sourceGrantId: string | null = null,
  targetGrantId: string | null = null,
): MediaTransferExecutionDecision {
  return Object.freeze({
    authorized,
    reason,
    manifest,
    sourceGrantId,
    targetGrantId,
    grantsAuthority: false,
  });
}

function trustBindingMatches(
  input: unknown,
  accountId: string,
  deviceId: string,
): boolean {
  if (
    typeof input !== 'object'
    || input === null
    || Array.isArray(input)
  ) {
    return false;
  }

  const record =
    input as Record<string, unknown>;

  return (
    record.expectedAccountId
      === accountId
    && record.expectedDeviceId
      === deviceId
    && evaluateDeviceTrust(input).trusted
  );
}

export function evaluateMediaTransferExecution(
  input: unknown,
  trustedEvaluationTimeInput: unknown,
): MediaTransferExecutionDecision {
  if (
    typeof input !== 'object'
    || input === null
    || Array.isArray(input)
  ) {
    return result(
      false,
      'invalid_input',
    );
  }

  const record =
    input as Record<string, unknown>;

  if (
    Object.keys(record).length !== INPUT_KEYS.size
    || Object.keys(record).some(
      (key) => !INPUT_KEYS.has(key),
    )
    || !isIdentityId(
      'account',
      record.accountId,
    )
    || !isIdentityId(
      'device',
      record.resolvedTargetDeviceId,
    )
    || !Array.isArray(
      record.capabilityGrants,
    )
  ) {
    return result(
      false,
      'invalid_input',
    );
  }

  const trustedEvaluationTimeMs =
    parseTrustedEvaluationTime(
      trustedEvaluationTimeInput,
    );

  if (trustedEvaluationTimeMs === null) {
    return result(
      false,
      'invalid_input',
    );
  }

  const transfer =
    evaluateMediaTransfer(
      record.intent,
      record.session,
      record.resolvedTargetDeviceId,
      trustedEvaluationTimeMs,
    );

  if (
    !transfer.accepted
    || !transfer.manifest
  ) {
    return result(
      false,
      'transfer_rejected',
    );
  }

  const sourceAdapter =
    parseDeviceMediaAdapterDescriptor(
      record.sourceAdapter,
    );
  const targetAdapter =
    parseDeviceMediaAdapterDescriptor(
      record.targetAdapter,
    );

  if (
    !sourceAdapter
    || !targetAdapter
    || sourceAdapter.deviceId
      !== transfer.manifest.sourceDeviceId
    || targetAdapter.deviceId
      !== transfer.manifest.targetDeviceId
  ) {
    return result(
      false,
      'adapter_mismatch',
    );
  }

  if (
    sourceAdapter.status === 'unavailable'
    || targetAdapter.status === 'unavailable'
  ) {
    return result(
      false,
      'adapter_unavailable',
    );
  }

  if (
    sourceAdapter.declaredAt
      > trustedEvaluationTimeMs
    || sourceAdapter.expiresAt
      <= trustedEvaluationTimeMs
    || targetAdapter.declaredAt
      > trustedEvaluationTimeMs
    || targetAdapter.expiresAt
      <= trustedEvaluationTimeMs
  ) {
    return result(
      false,
      'adapter_stale',
    );
  }

  if (
    !sourceAdapter.supportedIntents.includes(
      'media.transfer_session',
    )
    || !targetAdapter.supportedIntents.includes(
      'media.transfer_session',
    )
  ) {
    return result(
      false,
      'unsupported_transfer',
    );
  }

  if (
    !trustBindingMatches(
      record.sourceDeviceTrustInput,
      record.accountId,
      sourceAdapter.deviceId,
    )
    || !trustBindingMatches(
      record.targetDeviceTrustInput,
      record.accountId,
      targetAdapter.deviceId,
    )
  ) {
    return result(
      false,
      'device_untrusted',
    );
  }

  const sourceAuthorization =
    authorizeCapability(
      {
        subjectId:
          sourceAdapter.deviceId,
        capability:
          'media.transfer',
        nowMs:
          trustedEvaluationTimeMs,
        resourceId:
          sourceAdapter.deviceId,
        background: false,
        elevation: 'none',
      },
      record.capabilityGrants,
      trustedEvaluationTimeMs,
    );

  if (!sourceAuthorization.allowed) {
    return result(
      false,
      'source_capability_denied',
    );
  }

  const targetAuthorization =
    authorizeCapability(
      {
        subjectId:
          targetAdapter.deviceId,
        capability:
          'media.transfer',
        nowMs:
          trustedEvaluationTimeMs,
        resourceId:
          targetAdapter.deviceId,
        background: false,
        elevation: 'none',
      },
      record.capabilityGrants,
      trustedEvaluationTimeMs,
    );

  if (!targetAuthorization.allowed) {
    return result(
      false,
      'target_capability_denied',
    );
  }

  return result(
    true,
    'authorized',
    transfer.manifest,
    sourceAuthorization.grantId
      ?? null,
    targetAuthorization.grantId
      ?? null,
  );
}
