import type {
  SensorDeviceTrust,
  SensorPermissionState,
  SensorType,
} from './sensorStateRegistry';
import type { ObservationPrivacyPolicyState } from './observationPrivacyState';

export type RuntimeAvailability = 'available' | 'unavailable' | 'unknown';

export type SensorActivationDecisionReason =
  | 'allowed'
  | 'invalid_input'
  | 'runtime_unavailable'
  | 'permission_required'
  | 'trusted_device_required'
  | 'explicit_user_request_required'
  | 'passive_observation_blocked'
  | 'visual_observation_blocked';

export type SensorActivationDecision = Readonly<{
  allowed: boolean;
  reason: SensorActivationDecisionReason;
  changesPrivacyPolicy: false;
}>;

const POLICY_STATES: readonly ObservationPrivacyPolicyState[] = [
  'active',
  'visual_off',
  'ambient_off',
  'privacy_lock',
];

const SENSOR_TYPES: readonly SensorType[] = [
  'camera',
  'microphone',
  'location',
  'presence',
  'health',
  'uwb',
  'bluetooth_proximity',
  'motion',
  'spatial',
];

const VISUAL_SENSOR_TYPES: ReadonlySet<SensorType> = new Set([
  'camera',
  'spatial',
]);

function isOneOf<T extends string>(value: unknown, values: readonly T[]): value is T {
  return typeof value === 'string' && values.includes(value as T);
}

export function evaluateSensorActivation(input: unknown): SensorActivationDecision {
  const deny = (reason: SensorActivationDecisionReason): SensorActivationDecision => ({
    allowed: false,
    reason,
    changesPrivacyPolicy: false,
  });

  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return deny('invalid_input');
  }

  const record = input as Record<string, unknown>;
  const allowedKeys = new Set([
    'privacyState',
    'runtimeAvailability',
    'sensorType',
    'usage',
    'permission',
    'deviceTrust',
    'explicitUserRequest',
  ]);

  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return deny('invalid_input');
  }

  if (
    !isOneOf(record.privacyState, POLICY_STATES) ||
    !isOneOf(record.runtimeAvailability, ['available', 'unavailable', 'unknown'] as const) ||
    !isOneOf(record.sensorType, SENSOR_TYPES) ||
    !isOneOf(record.usage, ['passive_observation', 'direct_interaction'] as const) ||
    !isOneOf(record.permission, ['granted', 'denied', 'unknown'] as readonly SensorPermissionState[]) ||
    !isOneOf(record.deviceTrust, ['trusted', 'untrusted', 'unknown'] as readonly SensorDeviceTrust[]) ||
    typeof record.explicitUserRequest !== 'boolean'
  ) {
    return deny('invalid_input');
  }

  if (record.runtimeAvailability !== 'available') {
    return deny('runtime_unavailable');
  }

  if (record.permission !== 'granted') {
    return deny('permission_required');
  }

  if (record.deviceTrust !== 'trusted') {
    return deny('trusted_device_required');
  }

  if (record.usage === 'direct_interaction') {
    if (!record.explicitUserRequest) {
      return deny('explicit_user_request_required');
    }

    return {
      allowed: true,
      reason: 'allowed',
      changesPrivacyPolicy: false,
    };
  }

  if (
    record.privacyState === 'ambient_off' ||
    record.privacyState === 'privacy_lock'
  ) {
    return deny('passive_observation_blocked');
  }

  if (
    record.privacyState === 'visual_off' &&
    VISUAL_SENSOR_TYPES.has(record.sensorType)
  ) {
    return deny('visual_observation_blocked');
  }

  return {
    allowed: true,
    reason: 'allowed',
    changesPrivacyPolicy: false,
  };
}
