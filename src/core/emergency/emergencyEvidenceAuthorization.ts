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
  authorizeCapability,
} from '../security/capabilityPolicy';

import {
  parseTrustedEvaluationTime,
} from '../security/trustedEvaluationTime';

import {
  parseEmergencyGuardianConfig,
} from './emergencyGuardianConfig';

import {
  evaluateEmergencyEvidenceTime,
  isEmergencySessionId,
  parseEmergencyEvidence,
} from './emergencyEvidence';

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
  SensorUsage,
} from '../privacy/sensorStateRegistry';

import type {
  CapabilityId,
} from '../security/capabilities';

import type {
  EmergencyEvidence,
  EmergencyEvidenceFreshness,
  EmergencyEvidenceKind,
} from './emergencyEvidence';

import type {
  EmergencyEvidenceSource,
} from './emergencyGuardianConfig';

export type EmergencySensorAuthorization =
  Readonly<{
    sensorId: string;
    privacyState:
      ObservationPrivacyPolicyState;
    runtimeAvailability:
      RuntimeAvailability;
    permission: SensorPermissionState;
    deviceTrust: SensorDeviceTrust;
    usage: SensorUsage;
    explicitUserRequest: boolean;
  }>;

export type EmergencyEvidenceAuthorization =
  Readonly<{
    accepted: boolean;
    evidence: EmergencyEvidence | null;
    freshness:
      EmergencyEvidenceFreshness | null;
    requiredCapability:
      CapabilityId | null;
    grantId: string | null;
    reason:
      | 'accepted'
      | 'invalid_input'
      | 'guardian_disabled'
      | 'session_mismatch'
      | 'account_mismatch'
      | 'source_not_enabled'
      | 'collector_untrusted'
      | 'sensor_authorization_required'
      | 'sensor_binding_mismatch'
      | 'sensor_not_authorized'
      | 'capability_denied'
      | 'invalid_time'
      | 'future_evidence'
      | 'expired_evidence';
    grantsAuthority: false;
  }>;

const INPUT_KEYS = new Set([
  'accountId',
  'expectedEmergencySessionId',
  'config',
  'collectorDeviceTrustInput',
  'evidence',
  'capabilityGrants',
  'sensorAuthorization',
]);

const SENSOR_AUTH_KEYS = new Set([
  'sensorId',
  'privacyState',
  'runtimeAvailability',
  'permission',
  'deviceTrust',
  'usage',
  'explicitUserRequest',
]);

const SENSOR_ID =
  /^sens_[a-z0-9][a-z0-9_-]{15,63}$/;

const SENSOR_FOR_KIND:
  Readonly<
    Partial<
      Record<
        EmergencyEvidenceKind,
        SensorType
      >
    >
  > = Object.freeze({
    motion: 'motion',
    heart_rate: 'health',
    ecg: 'health',
    oxygen: 'health',
    respiratory: 'health',
    microphone: 'microphone',
    camera: 'camera',
    location: 'location',
  });

const CAPABILITY_FOR_KIND:
  Readonly<
    Partial<
      Record<
        EmergencyEvidenceKind,
        CapabilityId
      >
    >
  > = Object.freeze({
    motion: 'health.read.motion',
    heart_rate:
      'health.read.heart_rate',
    ecg: 'health.read.ecg',
    oxygen: 'health.read.oxygen',
    respiratory:
      'health.read.respiratory',
    microphone: 'microphone.listen',
    camera: 'camera.observe',
    location: 'emergency.location.read',
  });

const SOURCE_FOR_KIND:
  Readonly<
    Record<
      EmergencyEvidenceKind,
      EmergencyEvidenceSource
    >
  > = Object.freeze({
    user_report: 'user_report',
    motion: 'motion',
    heart_rate: 'heart_rate',
    ecg: 'ecg',
    oxygen: 'oxygen',
    respiratory: 'respiratory',
    microphone: 'microphone',
    camera: 'camera',
    responsiveness: 'responsiveness',
    location: 'location',
  });

function result(
  accepted: boolean,
  evidence: EmergencyEvidence | null,
  freshness:
    EmergencyEvidenceFreshness | null,
  requiredCapability:
    CapabilityId | null,
  grantId: string | null,
  reason:
    EmergencyEvidenceAuthorization['reason'],
): EmergencyEvidenceAuthorization {
  return Object.freeze({
    accepted,
    evidence,
    freshness,
    requiredCapability,
    grantId,
    reason,
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
    && evaluateDeviceTrust(input)
      .trusted
  );
}

function parseSensorAuthorization(
  input: unknown,
): EmergencySensorAuthorization | null {
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
      !== SENSOR_AUTH_KEYS.size
    || Object.keys(record).some(
      (key) =>
        !SENSOR_AUTH_KEYS.has(key),
    )
    || typeof record.sensorId !== 'string'
    || !SENSOR_ID.test(record.sensorId)
    || (
      record.privacyState !== 'active'
      && record.privacyState
        !== 'visual_off'
      && record.privacyState
        !== 'ambient_off'
      && record.privacyState
        !== 'privacy_lock'
    )
    || (
      record.runtimeAvailability
        !== 'available'
      && record.runtimeAvailability
        !== 'unavailable'
      && record.runtimeAvailability
        !== 'unknown'
    )
    || (
      record.permission !== 'granted'
      && record.permission !== 'denied'
      && record.permission !== 'unknown'
    )
    || (
      record.deviceTrust !== 'trusted'
      && record.deviceTrust !== 'untrusted'
      && record.deviceTrust !== 'unknown'
    )
    || (
      record.usage
        !== 'passive_observation'
      && record.usage
        !== 'direct_interaction'
    )
    || typeof record.explicitUserRequest
      !== 'boolean'
  ) {
    return null;
  }

  return Object.freeze({
    sensorId: record.sensorId,
    privacyState: record.privacyState,
    runtimeAvailability:
      record.runtimeAvailability,
    permission: record.permission,
    deviceTrust: record.deviceTrust,
    usage: record.usage,
    explicitUserRequest:
      record.explicitUserRequest,
  });
}
export function authorizeEmergencyEvidence(
  input: unknown,
  trustedEvaluationTimeInput: unknown,
): EmergencyEvidenceAuthorization {
  const nowMs =
    parseTrustedEvaluationTime(
      trustedEvaluationTimeInput,
    );

  if (
    nowMs === null
    || typeof input !== 'object'
    || input === null
    || Array.isArray(input)
  ) {
    return result(
      false,
      null,
      null,
      null,
      null,
      'invalid_input',
    );
  }

  const record =
    input as Record<string, unknown>;

  if (
    Object.keys(record).length
      !== INPUT_KEYS.size
    || Object.keys(record).some(
      (key) => !INPUT_KEYS.has(key),
    )
    || !isIdentityId(
      'account',
      record.accountId,
    )
    || !isEmergencySessionId(
      record.expectedEmergencySessionId,
    )
    || !Array.isArray(
      record.capabilityGrants,
    )
  ) {
    return result(
      false,
      null,
      null,
      null,
      null,
      'invalid_input',
    );
  }

  const config =
    parseEmergencyGuardianConfig(
      record.config,
      nowMs,
    );
  const evidence =
    parseEmergencyEvidence(
      record.evidence,
    );

  if (!config || !evidence) {
    return result(
      false,
      null,
      null,
      null,
      null,
      'invalid_input',
    );
  }

  const requiredCapability =
    CAPABILITY_FOR_KIND[
      evidence.kind
    ] ?? null;

  if (!config.enabled) {
    return result(
      false,
      null,
      null,
      requiredCapability,
      null,
      'guardian_disabled',
    );
  }

  if (
    evidence.emergencySessionId
      !== record.expectedEmergencySessionId
  ) {
    return result(
      false,
      null,
      null,
      requiredCapability,
      null,
      'session_mismatch',
    );
  }

  if (
    config.accountId !== record.accountId
    || evidence.accountId
      !== record.accountId
  ) {
    return result(
      false,
      null,
      null,
      requiredCapability,
      null,
      'account_mismatch',
    );
  }

  if (
    !config.evidenceSources.includes(
      SOURCE_FOR_KIND[evidence.kind],
    )
  ) {
    return result(
      false,
      null,
      null,
      requiredCapability,
      null,
      'source_not_enabled',
    );
  }

  if (
    !trustBindingMatches(
      record.collectorDeviceTrustInput,
      record.accountId,
      evidence.sourceDeviceId,
    )
  ) {
    return result(
      false,
      null,
      null,
      requiredCapability,
      null,
      'collector_untrusted',
    );
  }

  const requiredSensor =
    SENSOR_FOR_KIND[evidence.kind];

  if (requiredSensor !== undefined) {
    const sensorAuthorization =
      parseSensorAuthorization(
        record.sensorAuthorization,
      );

    if (!sensorAuthorization) {
      return result(
        false,
        null,
        null,
        requiredCapability,
        null,
        'sensor_authorization_required',
      );
    }

    if (
      evidence.sensorId === null
      || sensorAuthorization.sensorId
        !== evidence.sensorId
    ) {
      return result(
        false,
        null,
        null,
        requiredCapability,
        null,
        'sensor_binding_mismatch',
      );
    }

    const sensorDecision =
      evaluateSensorActivation({
        privacyState:
          sensorAuthorization.privacyState,
        runtimeAvailability:
          sensorAuthorization
            .runtimeAvailability,
        sensorType: requiredSensor,
        usage:
          sensorAuthorization.usage,
        permission:
          sensorAuthorization.permission,
        deviceTrust:
          sensorAuthorization.deviceTrust,
        explicitUserRequest:
          sensorAuthorization
            .explicitUserRequest,
      });

    if (!sensorDecision.allowed) {
      return result(
        false,
        null,
        null,
        requiredCapability,
        null,
        'sensor_not_authorized',
      );
    }

    if (requiredCapability === null) {
      return result(
        false,
        null,
        null,
        null,
        null,
        'invalid_input',
      );
    }

    const capability =
      authorizeCapability(
        {
          subjectId:
            evidence.sourceDeviceId,
          capability:
            requiredCapability,
          nowMs,
          resourceId:
            evidence.sourceDeviceId,
          background:
            sensorAuthorization.usage
              === 'passive_observation',
          elevation: 'none',
        },
        record.capabilityGrants,
        nowMs,
      );

    if (!capability.allowed) {
      return result(
        false,
        null,
        null,
        requiredCapability,
        null,
        'capability_denied',
      );
    }

    const time =
      evaluateEmergencyEvidenceTime(
        evidence,
        nowMs,
      );

    if (!time.accepted) {
      return result(
        false,
        null,
        time.freshness,
        requiredCapability,
        capability.grantId ?? null,
        time.freshness === 'invalid_time'
          ? 'invalid_time'
          : time.freshness === 'future'
            ? 'future_evidence'
            : 'expired_evidence',
      );
    }

    return result(
      true,
      evidence,
      time.freshness,
      requiredCapability,
      capability.grantId ?? null,
      'accepted',
    );
  }

  if (
    record.sensorAuthorization !== null
    || requiredCapability !== null
  ) {
    return result(
      false,
      null,
      null,
      requiredCapability,
      null,
      'invalid_input',
    );
  }

  const time =
    evaluateEmergencyEvidenceTime(
      evidence,
      nowMs,
    );

  if (!time.accepted) {
    return result(
      false,
      null,
      time.freshness,
      null,
      null,
      time.freshness === 'invalid_time'
        ? 'invalid_time'
        : time.freshness === 'future'
          ? 'future_evidence'
          : 'expired_evidence',
    );
  }

  return result(
    true,
    evidence,
    time.freshness,
    null,
    null,
    'accepted',
  );
}
