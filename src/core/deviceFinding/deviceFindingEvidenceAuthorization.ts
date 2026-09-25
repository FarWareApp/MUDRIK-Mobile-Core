import {
  evaluateDeviceTrust,
} from '../identity/deviceTrust';

import {
  isIdentityId,
} from '../identity/identityIds';

import {
  evaluateSensorActivation,
} from '../privacy/sensorActivationPolicy';

import {
  evaluateDeviceFindingSignalTime,
  parseDeviceFindingSignal,
} from './deviceFindingSignal';

import type {
  RuntimeAvailability,
} from '../privacy/sensorActivationPolicy';

import type {
  ObservationPrivacyPolicyState,
} from '../privacy/observationPrivacyState';

import type {
  SensorDeviceTrust,
  SensorPermissionState,
  SensorType,
} from '../privacy/sensorStateRegistry';

import type {
  DeviceFindingSignal,
  DeviceFindingSignalFreshness,
  DeviceFindingSignalKind,
} from './deviceFindingSignal';

export type DeviceFindingSensorAuthorization = Readonly<{
  privacyState: ObservationPrivacyPolicyState;
  runtimeAvailability: RuntimeAvailability;
  permission: SensorPermissionState;
  deviceTrust: SensorDeviceTrust;
  explicitUserRequest: boolean;
}>;

export type DeviceFindingEvidenceAuthorization = Readonly<{
  accepted: boolean;
  signal: DeviceFindingSignal | null;
  freshness: DeviceFindingSignalFreshness | null;
  reason:
    | 'accepted'
    | 'invalid_input'
    | 'target_mismatch'
    | 'collector_untrusted'
    | 'sensor_authorization_required'
    | 'sensor_not_authorized'
    | 'invalid_time'
    | 'future_signal'
    | 'expired_signal';
  grantsAuthority: false;
}>;

const INPUT_KEYS = new Set([
  'accountId',
  'expectedTargetDeviceId',
  'collectorDeviceId',
  'collectorDeviceTrustInput',
  'signal',
  'sensorAuthorization',
]);

const SENSOR_AUTHORIZATION_KEYS = new Set([
  'privacyState',
  'runtimeAvailability',
  'permission',
  'deviceTrust',
  'explicitUserRequest',
]);

const SENSOR_FOR_SIGNAL:
  Readonly<Partial<Record<DeviceFindingSignalKind, SensorType>>> =
  Object.freeze({
    uwb: 'uwb',
    bluetooth_proximity: 'bluetooth_proximity',
    wifi_presence: 'presence',
    visual: 'camera',
    spatial: 'spatial',
  });

function result(
  accepted: boolean,
  signal: DeviceFindingSignal | null,
  freshness: DeviceFindingSignalFreshness | null,
  reason: DeviceFindingEvidenceAuthorization['reason'],
): DeviceFindingEvidenceAuthorization {
  return Object.freeze({
    accepted,
    signal,
    freshness,
    reason,
    grantsAuthority: false,
  });
}

function collectorTrustMatches(
  input: unknown,
  accountId: string,
  collectorDeviceId: string,
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
    && record.expectedDeviceId === collectorDeviceId
    && evaluateDeviceTrust(input).trusted
  );
}

function parseSensorAuthorization(
  input: unknown,
): DeviceFindingSensorAuthorization | null {
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
    Object.keys(record).length
      !== SENSOR_AUTHORIZATION_KEYS.size
    || Object.keys(record).some(
      (key) =>
        !SENSOR_AUTHORIZATION_KEYS.has(key),
    )
  ) {
    return null;
  }

  const {
    privacyState,
    runtimeAvailability,
    permission,
    deviceTrust,
    explicitUserRequest,
  } = record;

  if (
    (
      privacyState !== 'active'
      && privacyState !== 'visual_off'
      && privacyState !== 'ambient_off'
      && privacyState !== 'privacy_lock'
    )
    || (
      runtimeAvailability !== 'available'
      && runtimeAvailability !== 'unavailable'
      && runtimeAvailability !== 'unknown'
    )
    || (
      permission !== 'granted'
      && permission !== 'denied'
      && permission !== 'unknown'
    )
    || (
      deviceTrust !== 'trusted'
      && deviceTrust !== 'untrusted'
      && deviceTrust !== 'unknown'
    )
    || typeof explicitUserRequest !== 'boolean'
  ) {
    return null;
  }

  return Object.freeze({
    privacyState,
    runtimeAvailability,
    permission,
    deviceTrust,
    explicitUserRequest,
  });
}

export function authorizeDeviceFindingEvidence(
  input: unknown,
  trustedEvaluationTimeMs: unknown,
): DeviceFindingEvidenceAuthorization {
  if (
    typeof input !== 'object'
    || input === null
    || Array.isArray(input)
  ) {
    return result(
      false,
      null,
      null,
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
      record.expectedTargetDeviceId,
    )
    || !isIdentityId(
      'device',
      record.collectorDeviceId,
    )
  ) {
    return result(
      false,
      null,
      null,
      'invalid_input',
    );
  }

  const signal =
    parseDeviceFindingSignal(
      record.signal,
    );

  if (!signal) {
    return result(
      false,
      null,
      null,
      'invalid_input',
    );
  }

  if (
    signal.targetDeviceId
      !== record.expectedTargetDeviceId
  ) {
    return result(
      false,
      null,
      null,
      'target_mismatch',
    );
  }

  if (
    !collectorTrustMatches(
      record.collectorDeviceTrustInput,
      record.accountId,
      record.collectorDeviceId,
    )
  ) {
    return result(
      false,
      null,
      null,
      'collector_untrusted',
    );
  }

  const requiredSensor =
    SENSOR_FOR_SIGNAL[signal.kind];

  if (requiredSensor !== undefined) {
    const authorization =
      parseSensorAuthorization(
        record.sensorAuthorization,
      );

    if (!authorization) {
      return result(
        false,
        null,
        null,
        'sensor_authorization_required',
      );
    }

    const sensorDecision =
      evaluateSensorActivation({
        privacyState:
          authorization.privacyState,
        runtimeAvailability:
          authorization.runtimeAvailability,
        sensorType: requiredSensor,
        usage: 'direct_interaction',
        permission:
          authorization.permission,
        deviceTrust:
          authorization.deviceTrust,
        explicitUserRequest:
          authorization.explicitUserRequest,
      });

    if (!sensorDecision.allowed) {
      return result(
        false,
        null,
        null,
        'sensor_not_authorized',
      );
    }
  } else if (record.sensorAuthorization !== null) {
    return result(
      false,
      null,
      null,
      'invalid_input',
    );
  }

  const time =
    evaluateDeviceFindingSignalTime(
      signal,
      trustedEvaluationTimeMs,
    );

  if (!time.accepted) {
    return result(
      false,
      null,
      time.freshness,
      time.freshness === 'invalid_time'
        ? 'invalid_time'
        : time.freshness === 'future'
          ? 'future_signal'
          : 'expired_signal',
    );
  }

  return result(
    true,
    signal,
    time.freshness,
    'accepted',
  );
}
