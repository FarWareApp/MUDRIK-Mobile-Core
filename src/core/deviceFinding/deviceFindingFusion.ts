import {
  isIdentityId,
} from '../identity/identityIds';

import {
  authorizeDeviceFindingEvidence,
} from './deviceFindingEvidenceAuthorization';

import {
  isFinderSessionId,
} from './deviceFindingRequest';

import type {
  DeviceFindingEvidenceAuthorization,
} from './deviceFindingEvidenceAuthorization';

import type {
  DeviceFindingComponent,
} from './deviceFindingRequest';

import type {
  DeviceFindingSignal,
  DeviceFindingSpatialPrecision,
} from './deviceFindingSignal';

export type DeviceFindingConfidence =
  | 'confirmed'
  | 'high'
  | 'medium'
  | 'low'
  | 'unknown';

export type DeviceFindingFusionResult = Readonly<{
  status:
    | 'located'
    | 'historical'
    | 'unknown'
    | 'invalid_input';
  confidence: DeviceFindingConfidence;
  precision: DeviceFindingSpatialPrecision;
  roomRef: string | null;
  zoneRef: string | null;
  furnitureRef: string | null;
  distanceMeters: number | null;
  directionDegrees: number | null;
  supportingSignalIds: readonly string[];
  historical: boolean;
  reason:
    | 'confirmed_current_evidence'
    | 'corroborated_current_evidence'
    | 'single_current_evidence'
    | 'weak_current_evidence'
    | 'historical_only'
    | 'insufficient_evidence'
    | 'conflicting_evidence'
    | 'invalid_input';
  grantsAuthority: false;
}>;

type AcceptedEvidence = Readonly<{
  signal: DeviceFindingSignal;
  freshness: 'fresh' | 'historical';
}>;

type EvidenceEnvelope =
  Readonly<Record<string, unknown>>;

const INPUT_KEYS = new Set([
  'accountId',
  'finderSessionId',
  'targetDeviceId',
  'component',
  'evidence',
]);

const COMPONENTS:
  readonly DeviceFindingComponent[] = [
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

const CONFIRMED_KINDS =
  new Set([
    'uwb',
    'visual',
    'spatial',
  ]);

function emptyResult(
  status: DeviceFindingFusionResult['status'],
  reason: DeviceFindingFusionResult['reason'],
): DeviceFindingFusionResult {
  return Object.freeze({
    status,
    confidence: 'unknown',
    precision: 'unknown',
    roomRef: null,
    zoneRef: null,
    furnitureRef: null,
    distanceMeters: null,
    directionDegrees: null,
    supportingSignalIds:
      Object.freeze([]),
    historical: false,
    reason,
    grantsAuthority: false,
  });
}

function evidenceSort(
  a: AcceptedEvidence,
  b: AcceptedEvidence,
): number {
  if (
    a.signal.reliability
      !== b.signal.reliability
  ) {
    return (
      b.signal.reliability
      - a.signal.reliability
    );
  }

  const precisionDifference =
    PRECISION_RANK[b.signal.precision]
    - PRECISION_RANK[a.signal.precision];

  if (precisionDifference !== 0) {
    return precisionDifference;
  }

  if (
    a.signal.observedAtMs
      !== b.signal.observedAtMs
  ) {
    return (
      b.signal.observedAtMs
      - a.signal.observedAtMs
    );
  }

  return a.signal.signalId.localeCompare(
    b.signal.signalId,
  );
}

function projectSignal(
  signal: DeviceFindingSignal,
  precision:
    DeviceFindingSpatialPrecision =
      signal.precision,
): Readonly<{
  precision: DeviceFindingSpatialPrecision;
  roomRef: string | null;
  zoneRef: string | null;
  furnitureRef: string | null;
  distanceMeters: number | null;
  directionDegrees: number | null;
}> {
  if (precision === 'unknown') {
    return Object.freeze({
      precision,
      roomRef: null,
      zoneRef: null,
      furnitureRef: null,
      distanceMeters: null,
      directionDegrees: null,
    });
  }

  if (precision === 'proximity') {
    return Object.freeze({
      precision,
      roomRef: null,
      zoneRef: null,
      furnitureRef: null,
      distanceMeters:
        signal.distanceMeters,
      directionDegrees: null,
    });
  }

  if (precision === 'room') {
    return Object.freeze({
      precision,
      roomRef: signal.roomRef,
      zoneRef: null,
      furnitureRef: null,
      distanceMeters: null,
      directionDegrees: null,
    });
  }

  if (precision === 'zone') {
    return Object.freeze({
      precision,
      roomRef: signal.roomRef,
      zoneRef: signal.zoneRef,
      furnitureRef: null,
      distanceMeters: null,
      directionDegrees: null,
    });
  }

  if (precision === 'furniture') {
    return Object.freeze({
      precision,
      roomRef: signal.roomRef,
      zoneRef: null,
      furnitureRef:
        signal.furnitureRef,
      distanceMeters: null,
      directionDegrees: null,
    });
  }

  return Object.freeze({
    precision,
    roomRef: signal.roomRef,
    zoneRef: signal.zoneRef,
    furnitureRef:
      signal.furnitureRef,
    distanceMeters:
      signal.distanceMeters,
    directionDegrees:
      signal.directionDegrees,
  });
}

function locatedResult(
  status: 'located' | 'historical',
  confidence: Exclude<
    DeviceFindingConfidence,
    'unknown'
  >,
  signal: DeviceFindingSignal,
  precision:
    DeviceFindingSpatialPrecision,
  supportingSignalIds:
    readonly string[],
  reason:
    DeviceFindingFusionResult['reason'],
): DeviceFindingFusionResult {
  const projection =
    projectSignal(
      signal,
      precision,
    );

  return Object.freeze({
    status,
    confidence,
    ...projection,
    supportingSignalIds:
      Object.freeze(
        [...supportingSignalIds]
          .sort((a, b) =>
            a.localeCompare(b),
          ),
      ),
    historical:
      status === 'historical',
    reason,
    grantsAuthority: false,
  });
}

function keyForPrecision(
  signal: DeviceFindingSignal,
  precision:
    'furniture'
    | 'zone'
    | 'room'
    | 'proximity',
): string | null {
  if (
    PRECISION_RANK[signal.precision]
      < PRECISION_RANK[precision]
  ) {
    return null;
  }

  if (precision === 'furniture') {
    return (
      signal.roomRef
      && signal.furnitureRef
    )
      ? `${signal.roomRef}|${signal.furnitureRef}`
      : null;
  }

  if (precision === 'zone') {
    return (
      signal.roomRef
      && signal.zoneRef
    )
      ? `${signal.roomRef}|${signal.zoneRef}`
      : null;
  }

  if (precision === 'room') {
    return signal.roomRef;
  }

  return 'proximity';
}

function findCorroboration(
  evidence:
    readonly AcceptedEvidence[],
): Readonly<{
  precision:
    'furniture'
    | 'zone'
    | 'room'
    | 'proximity';
  representative: DeviceFindingSignal;
  signalIds: readonly string[];
}> | null {
  const eligible =
    evidence.filter(
      (item) =>
        item.signal.reliability >= 0.75,
    );

  for (const precision of [
    'furniture',
    'zone',
    'room',
    'proximity',
  ] as const) {
    const groups =
      new Map<
        string,
        AcceptedEvidence[]
      >();

    for (const item of eligible) {
      const key =
        keyForPrecision(
          item.signal,
          precision,
        );

      if (!key) {
        continue;
      }

      const group =
        groups.get(key) ?? [];

      group.push(item);
      groups.set(key, group);
    }

    const qualifying = [
      ...groups.values(),
    ].filter((group) => (
      new Set(
        group.map(
          (item) =>
            item.signal.kind,
        ),
      ).size >= 2
    ));

    if (qualifying.length !== 1) {
      continue;
    }

    const ordered =
      [...qualifying[0]]
        .sort(evidenceSort);

    return Object.freeze({
      precision,
      representative:
        ordered[0].signal,
      signalIds: Object.freeze(
        ordered.map(
          (item) =>
            item.signal.signalId,
        ),
      ),
    });
  }

  return null;
}

function hasReliableRoomConflict(
  evidence:
    readonly AcceptedEvidence[],
): boolean {
  const rooms =
    new Set(
      evidence
        .filter(
          (item) =>
            item.signal.reliability
              >= 0.6
            && item.signal.roomRef
              !== null,
        )
        .map(
          (item) =>
            item.signal.roomRef!,
        ),
    );

  return rooms.size > 1;
}

function parseEnvelope(
  value: unknown,
): EvidenceEnvelope | null {
  if (
    typeof value !== 'object'
    || value === null
    || Array.isArray(value)
  ) {
    return null;
  }

  return value as EvidenceEnvelope;
}

export function fuseDeviceFindingEvidence(
  input: unknown,
  trustedEvaluationTimeMs: unknown,
): DeviceFindingFusionResult {
  if (
    typeof input !== 'object'
    || input === null
    || Array.isArray(input)
  ) {
    return emptyResult(
      'invalid_input',
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
    || !isFinderSessionId(
      record.finderSessionId,
    )
    || !isIdentityId(
      'device',
      record.targetDeviceId,
    )
    || typeof record.component !== 'string'
    || !COMPONENTS.includes(
      record.component as DeviceFindingComponent,
    )
    || !Array.isArray(record.evidence)
    || record.evidence.length === 0
    || record.evidence.length > 64
  ) {
    return emptyResult(
      'invalid_input',
      'invalid_input',
    );
  }

  const accepted:
    AcceptedEvidence[] = [];

  for (const rawEnvelope of record.evidence) {
    const envelope =
      parseEnvelope(rawEnvelope);

    if (
      !envelope
      || envelope.accountId
        !== record.accountId
      || envelope.expectedTargetDeviceId
        !== record.targetDeviceId
    ) {
      return emptyResult(
        'invalid_input',
        'invalid_input',
      );
    }

    const authorization:
      DeviceFindingEvidenceAuthorization =
        authorizeDeviceFindingEvidence(
          envelope,
          trustedEvaluationTimeMs,
        );

    if (!authorization.accepted) {
      if (
        authorization.reason
          === 'invalid_input'
        || authorization.reason
          === 'target_mismatch'
      ) {
        return emptyResult(
          'invalid_input',
          'invalid_input',
        );
      }

      continue;
    }

    const signal =
      authorization.signal!;

    if (
      signal.finderSessionId
        !== record.finderSessionId
      || signal.component
        !== record.component
    ) {
      return emptyResult(
        'invalid_input',
        'invalid_input',
      );
    }

    accepted.push(
      Object.freeze({
        signal,
        freshness:
          authorization.freshness as AcceptedEvidence['freshness'],
      }),
    );
  }

  const fresh =
    accepted
      .filter(
        (item) =>
          item.freshness === 'fresh',
      )
      .sort(evidenceSort);

  if (
    fresh.length > 0
    && hasReliableRoomConflict(fresh)
  ) {
    return emptyResult(
      'unknown',
      'conflicting_evidence',
    );
  }

  if (fresh.length > 0) {
    const strongest = fresh[0];

    if (
      CONFIRMED_KINDS.has(
        strongest.signal.kind,
      )
      && strongest.signal.reliability
        >= 0.9
      && PRECISION_RANK[
        strongest.signal.precision
      ] >= PRECISION_RANK.furniture
    ) {
      return locatedResult(
        'located',
        'confirmed',
        strongest.signal,
        strongest.signal.precision,
        [strongest.signal.signalId],
        'confirmed_current_evidence',
      );
    }

    const corroboration =
      findCorroboration(fresh);

    if (corroboration) {
      return locatedResult(
        'located',
        'high',
        corroboration.representative,
        corroboration.precision,
        corroboration.signalIds,
        'corroborated_current_evidence',
      );
    }

    if (
      strongest.signal.reliability
        >= 0.6
    ) {
      return locatedResult(
        'located',
        'medium',
        strongest.signal,
        strongest.signal.precision,
        [strongest.signal.signalId],
        'single_current_evidence',
      );
    }

    return locatedResult(
      'located',
      'low',
      strongest.signal,
      strongest.signal.precision,
      [strongest.signal.signalId],
      'weak_current_evidence',
    );
  }

  const historical =
    accepted
      .filter(
        (item) =>
          item.freshness
            === 'historical',
      )
      .sort(evidenceSort);

  if (historical.length > 0) {
    const strongest =
      historical[0];

    return locatedResult(
      'historical',
      'low',
      strongest.signal,
      strongest.signal.precision,
      [strongest.signal.signalId],
      'historical_only',
    );
  }

  return emptyResult(
    'unknown',
    'insufficient_evidence',
  );
}
