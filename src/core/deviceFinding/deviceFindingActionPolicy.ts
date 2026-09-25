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
  isDeviceFindingLocateAction,
  parseDeviceFindingAdapterDescriptor,
} from './deviceFindingAdapterContract';

import {
  capabilityForDeviceFindingRequest,
} from './deviceFindingCapability';

import {
  parseDeviceFindingRequest,
} from './deviceFindingRequest';

export type DeviceFindingActionDecision = Readonly<{
  authorized: boolean;
  reason:
    | 'authorized'
    | 'invalid_input'
    | 'active_action_not_requested'
    | 'target_mismatch'
    | 'adapter_unavailable'
    | 'adapter_stale'
    | 'unsupported_action'
    | 'device_untrusted'
    | 'capability_denied';
  deviceId: string | null;
  adapterId: string | null;
  capability: string | null;
  grantId: string | null;
  grantsAuthority: false;
}>;

const INPUT_KEYS = new Set([
  'accountId',
  'request',
  'resolvedDeviceId',
  'adapter',
  'deviceTrustInput',
  'capabilityGrants',
  'action',
]);

function decision(
  authorized: boolean,
  reason: DeviceFindingActionDecision['reason'],
  deviceId: string | null = null,
  adapterId: string | null = null,
  capability: string | null = null,
  grantId: string | null = null,
): DeviceFindingActionDecision {
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
    record.expectedAccountId === accountId
    && record.expectedDeviceId === deviceId
    && evaluateDeviceTrust(input).trusted
  );
}

export function evaluateDeviceFindingAction(
  input: unknown,
  trustedEvaluationTimeInput: unknown,
): DeviceFindingActionDecision {
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
    || !Array.isArray(
      record.capabilityGrants,
    )
    || !isDeviceFindingLocateAction(
      record.action,
    )
  ) {
    return decision(
      false,
      'invalid_input',
    );
  }

  const request =
    parseDeviceFindingRequest(
      record.request,
    );
  const adapter =
    parseDeviceFindingAdapterDescriptor(
      record.adapter,
    );
  const trustedEvaluationTimeMs =
    parseTrustedEvaluationTime(
      trustedEvaluationTimeInput,
    );

  if (
    !request
    || !adapter
    || trustedEvaluationTimeMs === null
  ) {
    return decision(
      false,
      'invalid_input',
    );
  }

  if (request.kind !== 'device.ring') {
    return decision(
      false,
      'active_action_not_requested',
    );
  }

  if (
    adapter.deviceId
      !== record.resolvedDeviceId
    || (
      request.targetDeviceId !== null
      && request.targetDeviceId
        !== record.resolvedDeviceId
    )
  ) {
    return decision(
      false,
      'target_mismatch',
    );
  }

  const capability =
    capabilityForDeviceFindingRequest(
      request.kind,
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
    !adapter.supportedActions.includes(
      record.action,
    )
  ) {
    return decision(
      false,
      'unsupported_action',
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
        subjectId: adapter.deviceId,
        capability,
        nowMs:
          trustedEvaluationTimeMs,
        resourceId: adapter.deviceId,
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
