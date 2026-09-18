import { parseTrustedEvaluationTime } from '../security/trustedEvaluationTime';
import type { ObservationPrivacyPolicyState } from './observationPrivacyState';
import {
  parseSensorStateRecord,
  type SensorStateRecord,
  type SensorType,
} from './sensorStateRegistry';
import { MAX_SENSOR_STATE_FRESHNESS_MS } from './observationTruth';

export type PrivacyIndicatorCategory =
  | 'camera'
  | 'microphone'
  | 'location'
  | 'presence'
  | 'health'
  | 'spatial';

export type PrivacyIndicatorStatus =
  | 'active'
  | 'unverifiable'
  | 'policy_violation';

export type PrivacyIndicator = Readonly<{
  category: PrivacyIndicatorCategory;
  status: PrivacyIndicatorStatus;
  sensorIds: readonly string[];
  processingModes: readonly string[];
  retentionModes: readonly string[];
}>;

const POLICY_STATES: readonly ObservationPrivacyPolicyState[] = [
  'active',
  'visual_off',
  'ambient_off',
  'privacy_lock',
];

const VISUAL_TYPES = new Set<SensorType>([
  'camera',
  'spatial',
]);

function categoryFor(
  type: SensorType,
): PrivacyIndicatorCategory | null {
  if (
    type === 'camera' ||
    type === 'microphone' ||
    type === 'location' ||
    type === 'presence' ||
    type === 'health' ||
    type === 'spatial'
  ) {
    return type;
  }

  return null;
}

function policyBlocksPassive(
  state: ObservationPrivacyPolicyState,
  type: SensorType,
): boolean {
  return (
    state === 'privacy_lock' ||
    state === 'ambient_off' ||
    (state === 'visual_off' && VISUAL_TYPES.has(type))
  );
}

export function buildPrivacyIndicators(
  input: unknown,
  trustedEvaluationTimeMsInput?: unknown,
): readonly PrivacyIndicator[] {
  if (
    typeof input !== 'object' ||
    input === null ||
    Array.isArray(input)
  ) {
    return [];
  }

  const record = input as Record<string, unknown>;
  const allowedKeys = new Set([
    'privacyState',
    'records',
    'nowMs',
    'maxFreshnessMs',
  ]);

  const trustedEvaluationTimeMs =
    parseTrustedEvaluationTime(
      trustedEvaluationTimeMsInput,
    );

  if (
    Object.keys(record).some((key) => !allowedKeys.has(key)) ||
    trustedEvaluationTimeMs === null ||
    !POLICY_STATES.includes(record.privacyState as ObservationPrivacyPolicyState) ||
    !Array.isArray(record.records) ||
    typeof record.nowMs !== 'number' ||
    !Number.isSafeInteger(record.nowMs) ||
    record.nowMs < 0
  ) {
    return [];
  }

  const maxFreshnessMs =
    record.maxFreshnessMs === undefined
      ? MAX_SENSOR_STATE_FRESHNESS_MS
      : typeof record.maxFreshnessMs === 'number' &&
          Number.isSafeInteger(record.maxFreshnessMs) &&
          record.maxFreshnessMs > 0 &&
          record.maxFreshnessMs <= MAX_SENSOR_STATE_FRESHNESS_MS
        ? record.maxFreshnessMs
        : null;

  if (maxFreshnessMs === null) {
    return [];
  }

  const records: SensorStateRecord[] = [];
  const seenSensorIds = new Set<string>();

  for (const value of record.records) {
    const parsed = parseSensorStateRecord(value);

    if (
      !parsed ||
      seenSensorIds.has(parsed.sensorId)
    ) {
      return [];
    }

    seenSensorIds.add(parsed.sensorId);
    records.push(parsed);
  }

  const privacyState = record.privacyState as ObservationPrivacyPolicyState;
  const grouped = new Map<
    PrivacyIndicatorCategory,
    {
      status: PrivacyIndicatorStatus;
      sensorIds: string[];
      processingModes: Set<string>;
      retentionModes: Set<string>;
    }
  >();

  const severityRank: Record<PrivacyIndicatorStatus, number> = {
    active: 1,
    unverifiable: 2,
    policy_violation: 3,
  };

  for (const sensor of records) {
    const category = categoryFor(sensor.type);
    if (!category) {
      continue;
    }

    const stale =
      sensor.verifiedAtMs > trustedEvaluationTimeMs ||
      trustedEvaluationTimeMs - sensor.verifiedAtMs > maxFreshnessMs;

    let status: PrivacyIndicatorStatus | null = null;

    if (
      stale ||
      sensor.state === 'unknown' ||
      sensor.state === 'unavailable'
    ) {
      status = 'unverifiable';
    } else if (sensor.state === 'active') {
      const unauthorized =
        sensor.permission !== 'granted' ||
        sensor.deviceTrust !== 'trusted';
      const policyViolation =
        sensor.usage === 'passive_observation' &&
        policyBlocksPassive(privacyState, sensor.type);

      status =
        unauthorized || policyViolation
          ? 'policy_violation'
          : 'active';
    }

    if (status === null) {
      continue;
    }

    const existing = grouped.get(category);
    if (!existing) {
      grouped.set(category, {
        status,
        sensorIds: [sensor.sensorId],
        processingModes: new Set([sensor.processing]),
        retentionModes: new Set([sensor.retention]),
      });
      continue;
    }

    if (severityRank[status] > severityRank[existing.status]) {
      existing.status = status;
    }
    existing.sensorIds.push(sensor.sensorId);
    existing.processingModes.add(sensor.processing);
    existing.retentionModes.add(sensor.retention);
  }

  return Object.freeze(
    [...grouped.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, value]) => Object.freeze({
        category,
        status: value.status,
        sensorIds: Object.freeze([...value.sensorIds].sort()),
        processingModes: Object.freeze([...value.processingModes].sort()),
        retentionModes: Object.freeze([...value.retentionModes].sort()),
      })),
  );
}
