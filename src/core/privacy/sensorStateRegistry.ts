import { isIdentityId } from '../identity/identityIds';

export type SensorType =
  | 'camera'
  | 'microphone'
  | 'location'
  | 'presence'
  | 'health'
  | 'uwb'
  | 'bluetooth_proximity'
  | 'motion'
  | 'spatial';

export type SensorRuntimeState =
  | 'active'
  | 'inactive'
  | 'unavailable'
  | 'unknown';

export type SensorUsage =
  | 'passive_observation'
  | 'direct_interaction';

export type SensorPermissionState =
  | 'granted'
  | 'denied'
  | 'unknown';

export type SensorDeviceTrust =
  | 'trusted'
  | 'untrusted'
  | 'unknown';

export type SensorProcessingMode = 'local' | 'remote' | 'hybrid';
export type SensorRetentionMode = 'none' | 'ephemeral' | 'persistent';

export type SensorPrivacyScope =
  | 'personal_private'
  | 'personal_shared_space'
  | 'household_shared'
  | 'public_or_untrusted';

export type SensorStateRecord = Readonly<{
  sensorId: string;
  sourceDeviceId: string;
  type: SensorType;
  state: SensorRuntimeState;
  usage: SensorUsage;
  permission: SensorPermissionState;
  deviceTrust: SensorDeviceTrust;
  processing: SensorProcessingMode;
  retention: SensorRetentionMode;
  privacyScope: SensorPrivacyScope;
  featureId: string;
  reason: string;
  sequence: number;
  lastTransitionAtMs: number;
  verifiedAtMs: number;
}>;

export type SensorRegistryUpdateReason =
  | 'accepted'
  | 'duplicate_no_change'
  | 'invalid_record'
  | 'registry_limit'
  | 'stale_sequence'
  | 'conflicting_sequence';

export type SensorRegistryUpdate = Readonly<{
  accepted: boolean;
  reason: SensorRegistryUpdateReason;
  records: readonly SensorStateRecord[];
}>;

const MAX_SENSORS = 256;
const SENSOR_ID = /^sens_[a-z0-9][a-z0-9_-]{15,63}$/;
const FEATURE_ID = /^[a-z][a-z0-9._-]{1,127}$/;
const CONTROL_CHAR = /[\u0000-\u001f\u007f]/;

function isOneOf<T extends string>(
  value: unknown,
  values: readonly T[],
): value is T {
  return typeof value === 'string' && values.includes(value as T);
}

export function parseSensorStateRecord(value: unknown): SensorStateRecord | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const allowedKeys = new Set([
    'sensorId',
    'sourceDeviceId',
    'type',
    'state',
    'usage',
    'permission',
    'deviceTrust',
    'processing',
    'retention',
    'privacyScope',
    'featureId',
    'reason',
    'sequence',
    'lastTransitionAtMs',
    'verifiedAtMs',
  ]);

  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return null;
  }

  if (
    typeof record.sensorId !== 'string' ||
    !SENSOR_ID.test(record.sensorId) ||
    !isIdentityId('device', record.sourceDeviceId) ||
    !isOneOf(record.type, [
      'camera',
      'microphone',
      'location',
      'presence',
      'health',
      'uwb',
      'bluetooth_proximity',
      'motion',
      'spatial',
    ] as const) ||
    !isOneOf(record.state, [
      'active',
      'inactive',
      'unavailable',
      'unknown',
    ] as const) ||
    !isOneOf(record.usage, [
      'passive_observation',
      'direct_interaction',
    ] as const) ||
    !isOneOf(record.permission, ['granted', 'denied', 'unknown'] as const) ||
    !isOneOf(record.deviceTrust, ['trusted', 'untrusted', 'unknown'] as const) ||
    !isOneOf(record.processing, ['local', 'remote', 'hybrid'] as const) ||
    !isOneOf(record.retention, ['none', 'ephemeral', 'persistent'] as const) ||
    !isOneOf(record.privacyScope, [
      'personal_private',
      'personal_shared_space',
      'household_shared',
      'public_or_untrusted',
    ] as const) ||
    typeof record.featureId !== 'string' ||
    !FEATURE_ID.test(record.featureId) ||
    typeof record.reason !== 'string' ||
    record.reason.length === 0 ||
    record.reason.length > 160 ||
    CONTROL_CHAR.test(record.reason) ||
    typeof record.sequence !== 'number' ||
    !Number.isSafeInteger(record.sequence) ||
    record.sequence < 0 ||
    typeof record.lastTransitionAtMs !== 'number' ||
    !Number.isFinite(record.lastTransitionAtMs) ||
    typeof record.verifiedAtMs !== 'number' ||
    !Number.isFinite(record.verifiedAtMs) ||
    record.lastTransitionAtMs < 0 ||
    record.verifiedAtMs < record.lastTransitionAtMs
  ) {
    return null;
  }

  return Object.freeze({
    sensorId: record.sensorId,
    sourceDeviceId: record.sourceDeviceId,
    type: record.type,
    state: record.state,
    usage: record.usage,
    permission: record.permission,
    deviceTrust: record.deviceTrust,
    processing: record.processing,
    retention: record.retention,
    privacyScope: record.privacyScope,
    featureId: record.featureId,
    reason: record.reason,
    sequence: record.sequence,
    lastTransitionAtMs: record.lastTransitionAtMs,
    verifiedAtMs: record.verifiedAtMs,
  });
}

function sameRecord(a: SensorStateRecord, b: SensorStateRecord): boolean {
  return (
    a.sensorId === b.sensorId &&
    a.sourceDeviceId === b.sourceDeviceId &&
    a.type === b.type &&
    a.state === b.state &&
    a.usage === b.usage &&
    a.permission === b.permission &&
    a.deviceTrust === b.deviceTrust &&
    a.processing === b.processing &&
    a.retention === b.retention &&
    a.privacyScope === b.privacyScope &&
    a.featureId === b.featureId &&
    a.reason === b.reason &&
    a.sequence === b.sequence &&
    a.lastTransitionAtMs === b.lastTransitionAtMs &&
    a.verifiedAtMs === b.verifiedAtMs
  );
}

export function applySensorState(
  current: readonly SensorStateRecord[],
  input: unknown,
): SensorRegistryUpdate {
  const parsed = parseSensorStateRecord(input);
  if (!parsed) {
    return {
      accepted: false,
      reason: 'invalid_record',
      records: current,
    };
  }

  const existingIndex = current.findIndex(
    (entry) => entry.sensorId === parsed.sensorId,
  );

  if (existingIndex < 0 && current.length >= MAX_SENSORS) {
    return {
      accepted: false,
      reason: 'registry_limit',
      records: current,
    };
  }

  if (existingIndex >= 0) {
    const existing = current[existingIndex];

    if (parsed.sequence < existing.sequence) {
      return {
        accepted: false,
        reason: 'stale_sequence',
        records: current,
      };
    }

    if (parsed.sequence === existing.sequence) {
      if (sameRecord(existing, parsed)) {
        return {
          accepted: true,
          reason: 'duplicate_no_change',
          records: current,
        };
      }

      return {
        accepted: false,
        reason: 'conflicting_sequence',
        records: current,
      };
    }
  }

  const next = current.filter((entry) => entry.sensorId !== parsed.sensorId);
  next.push(parsed);
  next.sort((a, b) => a.sensorId.localeCompare(b.sensorId));

  return {
    accepted: true,
    reason: 'accepted',
    records: Object.freeze(next),
  };
}

export function getSensorRecord(
  records: readonly SensorStateRecord[],
  sensorId: string,
): SensorStateRecord | null {
  return records.find((entry) => entry.sensorId === sensorId) ?? null;
}
