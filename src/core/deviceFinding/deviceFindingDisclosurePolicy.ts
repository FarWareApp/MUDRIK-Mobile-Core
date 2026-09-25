import {
  parseSurfaceDescriptor,
} from '../presence/surfaceContract';

import type {
  SurfacePrivacyClass,
} from '../presence/surfaceContract';

import type {
  DeviceFindingConfidence,
  DeviceFindingFusionResult,
} from './deviceFindingFusion';

import type {
  DeviceFindingSpatialPrecision,
} from './deviceFindingSignal';

export type DeviceFindingPresentationMode =
  | 'text'
  | 'audio_output';

export type DeviceFindingDisclosureDecision = Readonly<{
  allowed: boolean;
  precision: DeviceFindingSpatialPrecision;
  roomRef: string | null;
  zoneRef: string | null;
  furnitureRef: string | null;
  distanceMeters: number | null;
  directionDegrees: number | null;
  historical: boolean;
  reason:
    | 'allowed_private'
    | 'downgraded_shared_surface'
    | 'status_only'
    | 'surface_capability_missing'
    | 'invalid_input';
  grantsAuthority: false;
}>;

const INPUT_KEYS = new Set([
  'surface',
  'result',
  'mode',
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

const PRECISION_RANK:
  Readonly<Record<DeviceFindingSpatialPrecision, number>> =
  Object.freeze({
    unknown: 0,
    proximity: 1,
    room: 2,
    zone: 3,
    furniture: 4,
    exact: 5,
  });

const MAX_PRECISION:
  Readonly<Record<SurfacePrivacyClass, DeviceFindingSpatialPrecision>> =
  Object.freeze({
    personal_private: 'exact',
    personal_shared_space: 'room',
    household_shared: 'proximity',
    public_or_untrusted: 'unknown',
  });

function empty(
  allowed: boolean,
  reason: DeviceFindingDisclosureDecision['reason'],
  historical = false,
): DeviceFindingDisclosureDecision {
  return Object.freeze({
    allowed,
    precision: 'unknown',
    roomRef: null,
    zoneRef: null,
    furnitureRef: null,
    distanceMeters: null,
    directionDegrees: null,
    historical,
    reason,
    grantsAuthority: false,
  });
}

function parseResult(
  input: unknown,
): DeviceFindingFusionResult | null {
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
    || typeof record.confidence !== 'string'
    || !CONFIDENCES.includes(
      record.confidence
        as DeviceFindingConfidence,
    )
    || typeof record.precision !== 'string'
    || !PRECISIONS.includes(
      record.precision
        as DeviceFindingSpatialPrecision,
    )
    || typeof record.historical !== 'boolean'
    || record.grantsAuthority !== false
    || !Array.isArray(
      record.supportingSignalIds,
    )
    || record.supportingSignalIds.length > 64
    || record.supportingSignalIds.some(
      (value) =>
        typeof value !== 'string',
    )
  ) {
    return null;
  }

  const nullableStrings = [
    record.roomRef,
    record.zoneRef,
    record.furnitureRef,
  ];

  if (
    nullableStrings.some(
      (value) =>
        value !== null
        && typeof value !== 'string',
    )
  ) {
    return null;
  }

  for (const value of [
    record.distanceMeters,
    record.directionDegrees,
  ]) {
    if (
      value !== null
      && (
        typeof value !== 'number'
        || !Number.isFinite(value)
      )
    ) {
      return null;
    }
  }

  return record
    as unknown
    as DeviceFindingFusionResult;
}

function project(
  result: DeviceFindingFusionResult,
  precision: DeviceFindingSpatialPrecision,
  reason:
    DeviceFindingDisclosureDecision['reason'],
): DeviceFindingDisclosureDecision {
  if (precision === 'unknown') {
    return empty(
      true,
      reason,
      result.historical,
    );
  }

  if (precision === 'proximity') {
    return Object.freeze({
      allowed: true,
      precision,
      roomRef: null,
      zoneRef: null,
      furnitureRef: null,
      distanceMeters: null,
      directionDegrees: null,
      historical: result.historical,
      reason,
      grantsAuthority: false,
    });
  }

  if (precision === 'room') {
    return Object.freeze({
      allowed: true,
      precision,
      roomRef: result.roomRef,
      zoneRef: null,
      furnitureRef: null,
      distanceMeters: null,
      directionDegrees: null,
      historical: result.historical,
      reason,
      grantsAuthority: false,
    });
  }

  return Object.freeze({
    allowed: true,
    precision: result.precision,
    roomRef: result.roomRef,
    zoneRef: result.zoneRef,
    furnitureRef:
      result.furnitureRef,
    distanceMeters:
      result.distanceMeters,
    directionDegrees:
      result.directionDegrees,
    historical: result.historical,
    reason,
    grantsAuthority: false,
  });
}

export function evaluateDeviceFindingDisclosure(
  input: unknown,
): DeviceFindingDisclosureDecision {
  if (
    typeof input !== 'object'
    || input === null
    || Array.isArray(input)
  ) {
    return empty(
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
    || (
      record.mode !== 'text'
      && record.mode !== 'audio_output'
    )
  ) {
    return empty(
      false,
      'invalid_input',
    );
  }

  const surface =
    parseSurfaceDescriptor(
      record.surface,
    );
  const result =
    parseResult(
      record.result,
    );

  if (!surface || !result) {
    return empty(
      false,
      'invalid_input',
    );
  }

  if (
    !surface.capabilities.includes(
      record.mode,
    )
  ) {
    return empty(
      false,
      'surface_capability_missing',
      result.historical,
    );
  }

  if (
    result.status === 'unknown'
    || result.status === 'invalid_input'
    || result.precision === 'unknown'
  ) {
    return empty(
      true,
      'status_only',
      result.historical,
    );
  }

  const maximum =
    MAX_PRECISION[
      surface.privacyClass
    ];

  if (
    PRECISION_RANK[result.precision]
      <= PRECISION_RANK[maximum]
  ) {
    return project(
      result,
      result.precision,
      'allowed_private',
    );
  }

  return project(
    result,
    maximum,
    maximum === 'unknown'
      ? 'status_only'
      : 'downgraded_shared_surface',
  );
}
