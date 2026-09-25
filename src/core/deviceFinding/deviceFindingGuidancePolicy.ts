import type {
  DeviceFindingConfidence,
} from './deviceFindingFusion';

import type {
  DeviceFindingSpatialPrecision,
} from './deviceFindingSignal';

export type DeviceFindingGuidanceCapability =
  | 'direction'
  | 'distance'
  | 'room_navigation'
  | 'proximity_trend';

export type DeviceFindingGuidanceMode =
  | 'directional'
  | 'distance'
  | 'room_navigation'
  | 'proximity'
  | 'historical_recovery'
  | 'manual_search';

export type DeviceFindingGuidanceDecision = Readonly<{
  mode: DeviceFindingGuidanceMode;
  precisionUsed: DeviceFindingSpatialPrecision;
  roomRef: string | null;
  distanceMeters: number | null;
  directionDegrees: number | null;
  live: boolean;
  reason:
    | 'direction_supported'
    | 'distance_supported'
    | 'room_supported'
    | 'proximity_supported'
    | 'historical_only'
    | 'insufficient_live_evidence'
    | 'invalid_input';
  grantsAuthority: false;
}>;

const INPUT_KEYS = new Set([
  'result',
  'capabilities',
]);

const RESULT_KEYS = new Set([
  'status',
  'confidence',
  'precision',
  'roomRef',
  'zoneRef',
  'furnitureRef',
  'distanceMeters',
  'directionDegrees',
  'supportingSignalIds',
  'historical',
  'reason',
  'grantsAuthority',
]);

const CAPABILITIES:
  readonly DeviceFindingGuidanceCapability[] = [
    'direction',
    'distance',
    'room_navigation',
    'proximity_trend',
  ];

const PRECISIONS:
  readonly DeviceFindingSpatialPrecision[] = [
    'unknown',
    'proximity',
    'room',
    'zone',
    'furniture',
    'exact',
  ];

const CONFIDENCES:
  readonly DeviceFindingConfidence[] = [
    'confirmed',
    'high',
    'medium',
    'low',
    'unknown',
  ];

function decision(
  mode: DeviceFindingGuidanceMode,
  precisionUsed: DeviceFindingSpatialPrecision,
  roomRef: string | null,
  distanceMeters: number | null,
  directionDegrees: number | null,
  live: boolean,
  reason: DeviceFindingGuidanceDecision['reason'],
): DeviceFindingGuidanceDecision {
  return Object.freeze({
    mode,
    precisionUsed,
    roomRef,
    distanceMeters,
    directionDegrees,
    live,
    reason,
    grantsAuthority: false,
  });
}

function parseCapabilities(
  input: unknown,
): readonly DeviceFindingGuidanceCapability[] | null {
  if (
    !Array.isArray(input)
    || input.length > CAPABILITIES.length
  ) {
    return null;
  }

  const result:
    DeviceFindingGuidanceCapability[] = [];
  const seen =
    new Set<DeviceFindingGuidanceCapability>();

  for (const item of input) {
    if (
      typeof item !== 'string'
      || !CAPABILITIES.includes(
        item as DeviceFindingGuidanceCapability,
      )
      || seen.has(
        item as DeviceFindingGuidanceCapability,
      )
    ) {
      return null;
    }

    const capability =
      item as DeviceFindingGuidanceCapability;

    seen.add(capability);
    result.push(capability);
  }

  return Object.freeze(result);
}

function parseResult(
  input: unknown,
): Readonly<Record<string, unknown>> | null {
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
    Object.keys(record).length !== RESULT_KEYS.size
    || Object.keys(record).some(
      (key) => !RESULT_KEYS.has(key),
    )
    || (
      record.status !== 'located'
      && record.status !== 'historical'
      && record.status !== 'unknown'
      && record.status !== 'invalid_input'
    )
    || typeof record.precision !== 'string'
    || !PRECISIONS.includes(
      record.precision
        as DeviceFindingSpatialPrecision,
    )
    || typeof record.confidence !== 'string'
    || !CONFIDENCES.includes(
      record.confidence
        as DeviceFindingConfidence,
    )
    || typeof record.historical !== 'boolean'
    || record.grantsAuthority !== false
    || (
      record.roomRef !== null
      && typeof record.roomRef !== 'string'
    )
    || (
      record.distanceMeters !== null
      && (
        typeof record.distanceMeters !== 'number'
        || !Number.isFinite(
          record.distanceMeters,
        )
        || record.distanceMeters < 0
      )
    )
    || (
      record.directionDegrees !== null
      && (
        typeof record.directionDegrees !== 'number'
        || !Number.isFinite(
          record.directionDegrees,
        )
        || record.directionDegrees < 0
        || record.directionDegrees >= 360
      )
    )
  ) {
    return null;
  }

  return record;
}

export function chooseDeviceFindingGuidance(
  input: unknown,
): DeviceFindingGuidanceDecision {
  if (
    typeof input !== 'object'
    || input === null
    || Array.isArray(input)
  ) {
    return decision(
      'manual_search',
      'unknown',
      null,
      null,
      null,
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
  ) {
    return decision(
      'manual_search',
      'unknown',
      null,
      null,
      null,
      false,
      'invalid_input',
    );
  }

  const result =
    parseResult(record.result);
  const capabilities =
    parseCapabilities(
      record.capabilities,
    );

  if (!result || !capabilities) {
    return decision(
      'manual_search',
      'unknown',
      null,
      null,
      null,
      false,
      'invalid_input',
    );
  }

  if (
    result.status === 'historical'
    || result.historical === true
  ) {
    return decision(
      'historical_recovery',
      result.precision
        as DeviceFindingSpatialPrecision,
      typeof result.roomRef === 'string'
        ? result.roomRef
        : null,
      null,
      null,
      false,
      'historical_only',
    );
  }

  if (result.status !== 'located') {
    return decision(
      'manual_search',
      'unknown',
      null,
      null,
      null,
      false,
      'insufficient_live_evidence',
    );
  }

  if (
    capabilities.includes('direction')
    && result.precision === 'exact'
    && typeof result.directionDegrees
      === 'number'
  ) {
    return decision(
      'directional',
      'exact',
      typeof result.roomRef === 'string'
        ? result.roomRef
        : null,
      typeof result.distanceMeters
        === 'number'
        ? result.distanceMeters
        : null,
      result.directionDegrees,
      true,
      'direction_supported',
    );
  }

  if (
    capabilities.includes('distance')
    && (
      result.precision === 'exact'
      || result.precision === 'proximity'
    )
    && typeof result.distanceMeters
      === 'number'
  ) {
    return decision(
      'distance',
      result.precision
        as DeviceFindingSpatialPrecision,
      typeof result.roomRef === 'string'
        ? result.roomRef
        : null,
      result.distanceMeters,
      null,
      true,
      'distance_supported',
    );
  }

  if (
    capabilities.includes(
      'room_navigation',
    )
    && typeof result.roomRef === 'string'
    && (
      result.precision === 'room'
      || result.precision === 'zone'
      || result.precision === 'furniture'
      || result.precision === 'exact'
    )
  ) {
    return decision(
      'room_navigation',
      'room',
      result.roomRef,
      null,
      null,
      true,
      'room_supported',
    );
  }

  if (
    capabilities.includes(
      'proximity_trend',
    )
    && result.precision !== 'unknown'
  ) {
    return decision(
      'proximity',
      'proximity',
      null,
      null,
      null,
      true,
      'proximity_supported',
    );
  }

  return decision(
    'manual_search',
    'unknown',
    null,
    null,
    null,
    false,
    'insufficient_live_evidence',
  );
}
