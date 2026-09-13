import type { ObservationPrivacyPolicyState } from './observationPrivacyState';
import type { SensorStateRecord } from './sensorStateRegistry';

export type ObservationTruthStatus =
  | 'passive_observation_active'
  | 'direct_sensor_use_only'
  | 'not_observing'
  | 'unverifiable'
  | 'policy_violation';

export type ObservationTruth = Readonly<{
  status: ObservationTruthStatus;
  fullyVerified: boolean;
  passiveObservationActive: boolean;
  visualObservationActive: boolean;
  directInteractionActive: boolean;
  activeSensorIds: readonly string[];
  violatingSensorIds: readonly string[];
  unverifiableSensorIds: readonly string[];
}>;

export const MAX_SENSOR_STATE_FRESHNESS_MS = 15_000;

const VISUAL_TYPES = new Set(['camera', 'spatial']);

export function evaluateObservationTruth(input: unknown): ObservationTruth {
  const failClosed = (): ObservationTruth => ({
    status: 'unverifiable',
    fullyVerified: false,
    passiveObservationActive: false,
    visualObservationActive: false,
    directInteractionActive: false,
    activeSensorIds: [],
    violatingSensorIds: [],
    unverifiableSensorIds: [],
  });

  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return failClosed();
  }

  const record = input as Record<string, unknown>;
  const allowedKeys = new Set(['privacyState', 'records', 'nowMs', 'maxFreshnessMs']);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return failClosed();
  }

  if (
    !['active', 'visual_off', 'ambient_off', 'privacy_lock'].includes(
      String(record.privacyState),
    ) ||
    !Array.isArray(record.records) ||
    typeof record.nowMs !== 'number' ||
    !Number.isFinite(record.nowMs)
  ) {
    return failClosed();
  }

  const privacyState = record.privacyState as ObservationPrivacyPolicyState;
  const records = record.records as readonly SensorStateRecord[];
  const maxFreshnessMs =
    record.maxFreshnessMs === undefined
      ? MAX_SENSOR_STATE_FRESHNESS_MS
      : typeof record.maxFreshnessMs === 'number' &&
          Number.isFinite(record.maxFreshnessMs) &&
          record.maxFreshnessMs > 0 &&
          record.maxFreshnessMs <= 60_000
        ? record.maxFreshnessMs
        : null;

  if (maxFreshnessMs === null || records.length === 0) {
    return failClosed();
  }

  const activeSensorIds: string[] = [];
  const violatingSensorIds: string[] = [];
  const unverifiableSensorIds: string[] = [];
  let passiveObservationActive = false;
  let visualObservationActive = false;
  let directInteractionActive = false;

  for (const sensor of records) {
    if (
      typeof sensor !== 'object' ||
      sensor === null ||
      typeof sensor.sensorId !== 'string' ||
      typeof sensor.verifiedAtMs !== 'number' ||
      !Number.isFinite(sensor.verifiedAtMs) ||
      sensor.verifiedAtMs > record.nowMs ||
      record.nowMs - sensor.verifiedAtMs > maxFreshnessMs ||
      sensor.state === 'unknown' ||
      sensor.state === 'unavailable'
    ) {
      if (typeof sensor?.sensorId === 'string') {
        unverifiableSensorIds.push(sensor.sensorId);
      }
      continue;
    }

    if (sensor.state !== 'active') {
      continue;
    }

    activeSensorIds.push(sensor.sensorId);

    const unauthorizedRuntimeState =
      sensor.permission !== 'granted' ||
      sensor.deviceTrust !== 'trusted';

    if (unauthorizedRuntimeState) {
      violatingSensorIds.push(sensor.sensorId);
      continue;
    }

    if (sensor.usage === 'direct_interaction') {
      directInteractionActive = true;
      continue;
    }

    const visual = VISUAL_TYPES.has(sensor.type);
    const blockedByPolicy =
      privacyState === 'privacy_lock' ||
      privacyState === 'ambient_off' ||
      (privacyState === 'visual_off' && visual);

    if (blockedByPolicy) {
      violatingSensorIds.push(sensor.sensorId);
      continue;
    }

    passiveObservationActive = true;
    visualObservationActive ||= visual;
  }

  const fullyVerified = unverifiableSensorIds.length === 0;

  if (violatingSensorIds.length > 0) {
    return {
      status: 'policy_violation',
      fullyVerified,
      passiveObservationActive,
      visualObservationActive,
      directInteractionActive,
      activeSensorIds: Object.freeze(activeSensorIds),
      violatingSensorIds: Object.freeze(violatingSensorIds),
      unverifiableSensorIds: Object.freeze(unverifiableSensorIds),
    };
  }

  if (passiveObservationActive) {
    return {
      status: 'passive_observation_active',
      fullyVerified,
      passiveObservationActive: true,
      visualObservationActive,
      directInteractionActive,
      activeSensorIds: Object.freeze(activeSensorIds),
      violatingSensorIds: [],
      unverifiableSensorIds: Object.freeze(unverifiableSensorIds),
    };
  }

  if (unverifiableSensorIds.length > 0) {
    return {
      status: 'unverifiable',
      fullyVerified: false,
      passiveObservationActive: false,
      visualObservationActive: false,
      directInteractionActive,
      activeSensorIds: Object.freeze(activeSensorIds),
      violatingSensorIds: [],
      unverifiableSensorIds: Object.freeze(unverifiableSensorIds),
    };
  }

  if (directInteractionActive) {
    return {
      status: 'direct_sensor_use_only',
      fullyVerified: true,
      passiveObservationActive: false,
      visualObservationActive: false,
      directInteractionActive: true,
      activeSensorIds: Object.freeze(activeSensorIds),
      violatingSensorIds: [],
      unverifiableSensorIds: [],
    };
  }

  return {
    status: 'not_observing',
    fullyVerified: true,
    passiveObservationActive: false,
    visualObservationActive: false,
    directInteractionActive: false,
    activeSensorIds: [],
    violatingSensorIds: [],
    unverifiableSensorIds: [],
  };
}
