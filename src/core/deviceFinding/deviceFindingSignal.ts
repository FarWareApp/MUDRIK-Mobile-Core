import {
  isIdentityId,
} from '../identity/identityIds';

import {
  parseTrustedEvaluationTime,
} from '../security/trustedEvaluationTime';

import {
  isFinderSessionId,
} from './deviceFindingRequest';

import type {
  DeviceFindingComponent,
} from './deviceFindingRequest';

export type DeviceFindingSignalKind =
  | 'uwb'
  | 'bluetooth_proximity'
  | 'wifi_presence'
  | 'device_report'
  | 'last_seen'
  | 'manual_hint'
  | 'visual'
  | 'spatial';

export type DeviceFindingSpatialPrecision =
  | 'unknown'
  | 'proximity'
  | 'room'
  | 'zone'
  | 'furniture'
  | 'exact';

export type DeviceFindingSignal = Readonly<{
  finderSessionId: string;
  signalId: string;
  sequence: number;
  targetDeviceId: string;
  component: DeviceFindingComponent;
  kind: DeviceFindingSignalKind;
  observedAtMs: number;
  reliability: number;
  precision: DeviceFindingSpatialPrecision;
  roomRef: string | null;
  zoneRef: string | null;
  furnitureRef: string | null;
  distanceMeters: number | null;
  directionDegrees: number | null;
}>;

export type DeviceFindingSignalFreshness =
  | 'fresh'
  | 'historical'
  | 'expired'
  | 'future'
  | 'invalid_time';

export type DeviceFindingSignalEvaluation = Readonly<{
  accepted: boolean;
  freshness: DeviceFindingSignalFreshness;
  ageMs: number | null;
}>;

const SIGNAL_ID =
  /^fds_[a-z0-9][a-z0-9_-]{15,63}$/;

const ROOM_REF =
  /^room_[a-z0-9][a-z0-9_-]{7,63}$/;

const ZONE_REF =
  /^zone_[a-z0-9][a-z0-9_-]{7,63}$/;

const FURNITURE_REF =
  /^furn_[a-z0-9][a-z0-9_-]{7,63}$/;

const KEYS = new Set([
  'finderSessionId',
  'signalId',
  'sequence',
  'targetDeviceId',
  'component',
  'kind',
  'observedAtMs',
  'reliability',
  'precision',
  'roomRef',
  'zoneRef',
  'furnitureRef',
  'distanceMeters',
  'directionDegrees',
]);

const KINDS: readonly DeviceFindingSignalKind[] = [
  'uwb',
  'bluetooth_proximity',
  'wifi_presence',
  'device_report',
  'last_seen',
  'manual_hint',
  'visual',
  'spatial',
];

const PRECISIONS: readonly DeviceFindingSpatialPrecision[] = [
  'unknown',
  'proximity',
  'room',
  'zone',
  'furniture',
  'exact',
];

const COMPONENTS: readonly DeviceFindingComponent[] = [
  'whole',
  'left',
  'right',
  'case',
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

const KIND_MAX_PRECISION:
  Readonly<Record<DeviceFindingSignalKind, DeviceFindingSpatialPrecision>> =
  Object.freeze({
    uwb: 'exact',
    bluetooth_proximity: 'proximity',
    wifi_presence: 'room',
    device_report: 'room',
    last_seen: 'exact',
    manual_hint: 'furniture',
    visual: 'exact',
    spatial: 'exact',
  });

const FRESH_MS:
  Readonly<Record<DeviceFindingSignalKind, number>> =
  Object.freeze({
    uwb: 5_000,
    bluetooth_proximity: 15_000,
    wifi_presence: 60_000,
    device_report: 30_000,
    last_seen: 60_000,
    manual_hint: 15 * 60_000,
    visual: 30_000,
    spatial: 30_000,
  });

const LAST_SEEN_RETENTION_MS =
  7 * 24 * 60 * 60_000;

function isSafeNonNegativeInteger(
  value: unknown,
): value is number {
  return (
    typeof value === 'number'
    && Number.isSafeInteger(value)
    && value >= 0
  );
}

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
  if (
    zoneRef !== null
    && roomRef === null
  ) {
    return false;
  }

  if (
    furnitureRef !== null
    && roomRef === null
  ) {
    return false;
  }

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
    );
  }

  if (precision === 'room') {
    return (
      roomRef !== null
      && zoneRef === null
      && furnitureRef === null
    );
  }

  if (precision === 'zone') {
    return (
      roomRef !== null
      && zoneRef !== null
      && furnitureRef === null
    );
  }

  if (precision === 'furniture') {
    return (
      roomRef !== null
      && furnitureRef !== null
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

export function isDeviceFindingSignalId(
  value: unknown,
): value is string {
  return (
    typeof value === 'string'
    && SIGNAL_ID.test(value)
  );
}

export function parseDeviceFindingSignal(
  input: unknown,
): DeviceFindingSignal | null {
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
    Object.keys(record).length !== KEYS.size
    || Object.keys(record).some(
      (key) => !KEYS.has(key),
    )
    || !isFinderSessionId(
      record.finderSessionId,
    )
    || !isDeviceFindingSignalId(
      record.signalId,
    )
    || !isSafeNonNegativeInteger(
      record.sequence,
    )
    || !isIdentityId(
      'device',
      record.targetDeviceId,
    )
    || typeof record.component !== 'string'
    || !COMPONENTS.includes(
      record.component as DeviceFindingComponent,
    )
    || typeof record.kind !== 'string'
    || !KINDS.includes(
      record.kind as DeviceFindingSignalKind,
    )
    || !isSafeNonNegativeInteger(
      record.observedAtMs,
    )
    || typeof record.reliability !== 'number'
    || !Number.isFinite(record.reliability)
    || record.reliability < 0
    || record.reliability > 1
    || typeof record.precision !== 'string'
    || !PRECISIONS.includes(
      record.precision as DeviceFindingSpatialPrecision,
    )
  ) {
    return null;
  }

  const roomRef =
    parseNullableRef(
      record.roomRef,
      ROOM_REF,
    );
  const zoneRef =
    parseNullableRef(
      record.zoneRef,
      ZONE_REF,
    );
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

  const kind =
    record.kind as DeviceFindingSignalKind;
  const precision =
    record.precision as DeviceFindingSpatialPrecision;

  if (
    PRECISION_RANK[precision]
      > PRECISION_RANK[
        KIND_MAX_PRECISION[kind]
      ]
    || !precisionShapeIsValid(
      precision,
      roomRef,
      zoneRef,
      furnitureRef,
      distanceMeters,
      directionDegrees,
    )
  ) {
    return null;
  }

  return Object.freeze({
    finderSessionId:
      record.finderSessionId,
    signalId:
      record.signalId,
    sequence:
      record.sequence,
    targetDeviceId:
      record.targetDeviceId,
    component:
      record.component as DeviceFindingComponent,
    kind,
    observedAtMs:
      record.observedAtMs,
    reliability:
      record.reliability,
    precision,
    roomRef,
    zoneRef,
    furnitureRef,
    distanceMeters,
    directionDegrees,
  });
}

export function evaluateDeviceFindingSignalTime(
  signal: DeviceFindingSignal,
  trustedEvaluationTimeMs: unknown,
): DeviceFindingSignalEvaluation {
  const nowMs =
    parseTrustedEvaluationTime(
      trustedEvaluationTimeMs,
    );

  if (nowMs === null) {
    return Object.freeze({
      accepted: false,
      freshness: 'invalid_time',
      ageMs: null,
    });
  }

  if (signal.observedAtMs > nowMs) {
    return Object.freeze({
      accepted: false,
      freshness: 'future',
      ageMs: null,
    });
  }

  const ageMs =
    nowMs - signal.observedAtMs;

  if (
    ageMs <= FRESH_MS[signal.kind]
  ) {
    return Object.freeze({
      accepted: true,
      freshness: 'fresh',
      ageMs,
    });
  }

  if (
    signal.kind === 'last_seen'
    && ageMs <= LAST_SEEN_RETENTION_MS
  ) {
    return Object.freeze({
      accepted: true,
      freshness: 'historical',
      ageMs,
    });
  }

  return Object.freeze({
    accepted: false,
    freshness: 'expired',
    ageMs,
  });
}
