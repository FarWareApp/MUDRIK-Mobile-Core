import { parseTrustedEvaluationTime } from '../security/trustedEvaluationTime';
import type { ObservationPrivacyPolicyState } from './observationPrivacyState';
import {
  parseSensorStateRecord,
  type SensorStateRecord,
} from './sensorStateRegistry';

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

export function evaluateObservationTruth(
  input: unknown,
  trustedEvaluationTimeMsInput?: unknown,
): ObservationTruth {
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

  const trustedEvaluationTimeMs = parseTrustedEvaluationTime(
    trustedEvaluationTimeMsInput,
  );

  if (
    trustedEvaluationTimeMs === null ||
    !['active', 'visual_off', 'ambient_off', 'privacy_lock'].includes(
      String(record.privacyState),
    ) ||
    !Array.isArray(record.records) ||
    typeof record.nowMs !== 'number' ||
    !Number.isSafeInteger(record.nowMs) ||
    record.nowMs < 0
  ) {
    return failClosed();
  }

  const privacyState = record.privacyState as ObservationPrivacyPolicyState;
  const maxFreshnessMs =
    record.maxFreshnessMs === undefined
      ? MAX_SENSOR_STATE_FRESHNESS_MS
      : typeof record.maxFreshnessMs === 'number' &&
          Number.isSafeInteger(record.maxFreshnessMs) &&
          record.maxFreshnessMs > 0 &&
          record.maxFreshnessMs <= MAX_SENSOR_STATE_FRESHNESS_MS
        ? record.maxFreshnessMs
        : null;

  if (maxFreshnessMs === null || record.records.length === 0) {
    return failClosed();
  }

  const records: SensorStateRecord[] = [];
  const seenSensorIds = new Set<string>();
  for (const value of record.records) {
    const sensor = parseSensorStateRecord(value);
    if (!sensor || seenSensorIds.has(sensor.sensorId)) {
      return failClosed();
    }
    seenSensorIds.add(sensor.sensorId);
    records.push(sensor);
  }

  const activeSensorIds: string[] = [];
  const violatingSensorIds: string[] = [];
  const unverifiableSensorIds: string[] = [];
  let passiveObservationActive = false;
  let visualObservationActive = false;
  let directInteractionActive = false;

  for (const sensor of records) {
    if (
      sensor.verifiedAtMs > trustedEvaluationTimeMs ||
      trustedEvaluationTimeMs - sensor.verifiedAtMs > maxFreshnessMs ||
      sensor.state === 'unknown' ||
      sensor.state === 'unavailable'
    ) {
      unverifiableSensorIds.push(sensor.sensorId);
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
