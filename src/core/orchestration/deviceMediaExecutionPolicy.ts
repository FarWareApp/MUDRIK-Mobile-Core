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
  capabilityForDeviceMediaIntent,
} from './deviceMediaCapability';

import {
  parseDeviceMediaIntent,
} from './deviceMediaIntent';

export type DeviceMediaExecutionReason =
  | 'authorized'
  | 'invalid_input'
  | 'specialized_policy_required'
  | 'target_mismatch'
  | 'adapter_unavailable'
  | 'adapter_stale'
  | 'unsupported_intent'
  | 'device_untrusted'
  | 'capability_denied';

export type DeviceMediaExecutionDecision = Readonly<{
  authorized: boolean;
  reason: DeviceMediaExecutionReason;
  deviceId: string | null;
  adapterId: string | null;
  capability: string | null;
  grantId: string | null;
  grantsAuthority: false;
}>;

const INPUT_KEYS = new Set([
  'accountId',
  'intent',
  'resolvedDeviceId',
  'resolvedAdapterId',
  'adapter',
  'deviceTrustInput',
  'capabilityGrants',
]);

function decision(
  authorized: boolean,
  reason: DeviceMediaExecutionReason,
  deviceId: string | null = null,
  adapterId: string | null = null,
  capability: string | null = null,
  grantId: string | null = null,
): DeviceMediaExecutionDecision {
  return Object.freeze({
    authorized,
    reason,
    deviceId,
    adapterId,
    capability,
    grantId,
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
  );
}

export function evaluateDeviceMediaExecution(
  input: unknown,
  trustedEvaluationTimeInput: unknown,
): DeviceMediaExecutionDecision {
  if (
    typeof input !== 'object'
    || input === null
    || Array.isArray(input)
  ) {
    return decision(
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
      record.resolvedDeviceId,
    )
    || typeof record.resolvedAdapterId
      !== 'string'
    || !Array.isArray(
      record.capabilityGrants,
    )
  ) {
    return decision(
      false,
      'invalid_input',
    );
  }

  const intent =
    parseDeviceMediaIntent(
      record.intent,
    );
  const adapter =
    parseDeviceMediaAdapterDescriptor(
      record.adapter,
    );
  const trustedEvaluationTimeMs =
    parseTrustedEvaluationTime(
      trustedEvaluationTimeInput,
    );

  if (
    !intent
    || !adapter
    || trustedEvaluationTimeMs === null
  ) {
    return decision(
      false,
      'invalid_input',
    );
  }

  if (
    intent.kind
      === 'media.transfer_session'
  ) {
    return decision(
      false,
      'specialized_policy_required',
    );
  }

  if (
    adapter.deviceId
      !== record.resolvedDeviceId
    || adapter.adapterId
      !== record.resolvedAdapterId
    || (
      intent.targetDeviceId !== null
      && intent.targetDeviceId
        !== record.resolvedDeviceId
    )
  ) {
    return decision(
      false,
      'target_mismatch',
    );
  }

  const capability =
    capabilityForDeviceMediaIntent(
      intent.kind,
    );

  if (adapter.status === 'unavailable') {
    return decision(
      false,
      'adapter_unavailable',
      adapter.deviceId,
      adapter.adapterId,
      capability,
    );
  }

  if (
    adapter.declaredAt
      > trustedEvaluationTimeMs
    || adapter.expiresAt
      <= trustedEvaluationTimeMs
  ) {
    return decision(
      false,
      'adapter_stale',
      adapter.deviceId,
      adapter.adapterId,
      capability,
    );
  }

  if (
    !adapter.supportedIntents.includes(
      intent.kind,
    )
  ) {
    return decision(
      false,
      'unsupported_intent',
      adapter.deviceId,
      adapter.adapterId,
      capability,
    );
  }

  if (
    !trustBindingMatches(
      record.deviceTrustInput,
      record.accountId,
      adapter.deviceId,
    )
    || !evaluateDeviceTrust(
      record.deviceTrustInput,
    ).trusted
  ) {
    return decision(
      false,
      'device_untrusted',
      adapter.deviceId,
      adapter.adapterId,
      capability,
    );
  }

  const authorization =
    authorizeCapability(
      {
        subjectId:
          adapter.deviceId,
        capability,
        nowMs:
          trustedEvaluationTimeMs,
        resourceId:
          adapter.deviceId,
        background: false,
        elevation: 'none',
      },
      record.capabilityGrants,
      trustedEvaluationTimeMs,
    );

  if (!authorization.allowed) {
    return decision(
      false,
      'capability_denied',
      adapter.deviceId,
      adapter.adapterId,
      capability,
    );
  }

  return decision(
    true,
    'authorized',
    adapter.deviceId,
    adapter.adapterId,
    capability,
    authorization.grantId
      ?? null,
  );
}
