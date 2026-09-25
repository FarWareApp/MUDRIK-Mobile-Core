import {
  isDeviceFindingSignalId,
} from './deviceFindingSignal';

import type {
  DeviceFindingConfidence,
  DeviceFindingFusionResult,
} from './deviceFindingFusion';

import type {
  DeviceFindingSpatialPrecision,
} from './deviceFindingSignal';

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

const STATUSES: readonly DeviceFindingFusionResult['status'][] = [
  'located',
  'historical',
  'unknown',
  'invalid_input',
];

const CONFIDENCES: readonly DeviceFindingConfidence[] = [
  'confirmed',
  'high',
  'medium',
  'low',
  'unknown',
];

const PRECISIONS: readonly DeviceFindingSpatialPrecision[] = [
  'unknown',
  'proximity',
  'room',
  'zone',
  'furniture',
  'exact',
];

const REASONS: readonly DeviceFindingFusionResult['reason'][] = [
  'confirmed_current_evidence',
  'corroborated_current_evidence',
  'single_current_evidence',
  'weak_current_evidence',
  'historical_only',
  'insufficient_evidence',
  'conflicting_evidence',
  'invalid_input',
];

const ROOM_REF =
  /^room_[a-z0-9][a-z0-9_-]{7,63}$/;
const ZONE_REF =
  /^zone_[a-z0-9][a-z0-9_-]{7,63}$/;
const FURNITURE_REF =
  /^furn_[a-z0-9][a-z0-9_-]{7,63}$/;

function parseNullableRef(
  value: unknown,
  pattern: RegExp,
): string | null | undefined {
  if (value === null) {
    return null;
  }

  return (
    typeof value === 'string'
    && pattern.test(value)
  )
    ? value
    : undefined;
}

function parseNullableBoundedNumber(
  value: unknown,
  minimum: number,
  maximum: number,
): number | null | undefined {
  if (value === null) {
    return null;
  }

  if (
    typeof value !== 'number'
    || !Number.isFinite(value)
    || value < minimum
    || value > maximum
  ) {
    return undefined;
  }

  return value;
}

function precisionShapeIsValid(
  precision: DeviceFindingSpatialPrecision,
  roomRef: string | null,
  zoneRef: string | null,
  furnitureRef: string | null,
  distanceMeters: number | null,
  directionDegrees: number | null,
): boolean {
  if (precision === 'unknown') {
    return (
      roomRef === null
      && zoneRef === null
      && furnitureRef === null
      && distanceMeters === null
      && directionDegrees === null
    );
  }

  if (precision === 'proximity') {
    return (
      roomRef === null
      && zoneRef === null
      && furnitureRef === null
      && directionDegrees === null
    );
  }

  if (precision === 'room') {
    return (
      roomRef !== null
      && zoneRef === null
      && furnitureRef === null
      && distanceMeters === null
      && directionDegrees === null
    );
  }

  if (precision === 'zone') {
    return (
      roomRef !== null
      && zoneRef !== null
      && furnitureRef === null
      && distanceMeters === null
      && directionDegrees === null
    );
  }

  if (precision === 'furniture') {
    return (
      roomRef !== null
      && zoneRef === null
      && furnitureRef !== null
      && distanceMeters === null
      && directionDegrees === null
    );
  }

  return (
    roomRef !== null
    && (
      furnitureRef !== null
      || distanceMeters !== null
      || directionDegrees !== null
    )
  );
}

function semanticStateIsValid(
  status: DeviceFindingFusionResult['status'],
  confidence: DeviceFindingConfidence,
  precision: DeviceFindingSpatialPrecision,
  historical: boolean,
  reason: DeviceFindingFusionResult['reason'],
  supportingSignalCount: number,
): boolean {
  if (status === 'invalid_input') {
    return (
      confidence === 'unknown'
      && precision === 'unknown'
      && historical === false
      && reason === 'invalid_input'
      && supportingSignalCount === 0
    );
  }

  if (status === 'unknown') {
    return (
      confidence === 'unknown'
      && precision === 'unknown'
      && historical === false
      && (
        reason === 'insufficient_evidence'
        || reason === 'conflicting_evidence'
      )
      && supportingSignalCount === 0
    );
  }

  if (status === 'historical') {
    return (
      confidence === 'low'
      && historical === true
      && reason === 'historical_only'
      && supportingSignalCount > 0
    );
  }

  if (
    historical
    || confidence === 'unknown'
    || precision === 'unknown'
    || supportingSignalCount === 0
  ) {
    return false;
  }

  if (reason === 'confirmed_current_evidence') {
    return confidence === 'confirmed';
  }

  if (reason === 'corroborated_current_evidence') {
    return confidence === 'high';
  }

  if (reason === 'single_current_evidence') {
    return confidence === 'medium';
  }

  if (reason === 'weak_current_evidence') {
    return confidence === 'low';
  }

  return false;
}

export function parseDeviceFindingFusionResult(
  input: unknown,
): DeviceFindingFusionResult | null {
  if (
    typeof input !== 'object'
    || input === null
    || Array.isArray(input)
  ) {
    return null;
  }

  const record = input as Record<string, unknown>;

  if (
    Object.keys(record).length !== RESULT_KEYS.size
    || Object.keys(record).some(
      (key) => !RESULT_KEYS.has(key),
    )
    || typeof record.status !== 'string'
    || !STATUSES.includes(record.status as DeviceFindingFusionResult['status'])
    || typeof record.confidence !== 'string'
    || !CONFIDENCES.includes(record.confidence as DeviceFindingConfidence)
    || typeof record.precision !== 'string'
    || !PRECISIONS.includes(record.precision as DeviceFindingSpatialPrecision)
    || typeof record.historical !== 'boolean'
    || typeof record.reason !== 'string'
    || !REASONS.includes(record.reason as DeviceFindingFusionResult['reason'])
    || record.grantsAuthority !== false
    || !Array.isArray(record.supportingSignalIds)
    || record.supportingSignalIds.length > 64
  ) {
    return null;
  }

  const roomRef =
    parseNullableRef(record.roomRef, ROOM_REF);
  const zoneRef =
    parseNullableRef(record.zoneRef, ZONE_REF);
  const furnitureRef =
    parseNullableRef(
      record.furnitureRef,
      FURNITURE_REF,
    );
  const distanceMeters =
    parseNullableBoundedNumber(
      record.distanceMeters,
      0,
      100_000,
    );
  const directionDegrees =
    parseNullableBoundedNumber(
      record.directionDegrees,
      0,
      359.999999,
    );

  if (
    roomRef === undefined
    || zoneRef === undefined
    || furnitureRef === undefined
    || distanceMeters === undefined
    || directionDegrees === undefined
  ) {
    return null;
  }

  const signalIds: string[] = [];
  const seenSignalIds = new Set<string>();

  for (const value of record.supportingSignalIds) {
    if (
      !isDeviceFindingSignalId(value)
      || seenSignalIds.has(value)
    ) {
      return null;
    }

    seenSignalIds.add(value);
    signalIds.push(value);
  }

  const status =
    record.status as DeviceFindingFusionResult['status'];
  const confidence =
    record.confidence as DeviceFindingConfidence;
  const precision =
    record.precision as DeviceFindingSpatialPrecision;
  const reason =
    record.reason as DeviceFindingFusionResult['reason'];

  if (
    !precisionShapeIsValid(
      precision,
      roomRef,
      zoneRef,
      furnitureRef,
      distanceMeters,
      directionDegrees,
    )
    || !semanticStateIsValid(
      status,
      confidence,
      precision,
      record.historical,
      reason,
      signalIds.length,
    )
  ) {
    return null;
  }

  return Object.freeze({
    status,
    confidence,
    precision,
    roomRef,
    zoneRef,
    furnitureRef,
    distanceMeters,
    directionDegrees,
    supportingSignalIds:
      Object.freeze(signalIds),
    historical: record.historical,
    reason,
    grantsAuthority: false,
  });
}
