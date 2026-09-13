import {
  isSurfaceId,
} from './surfaceContract';

export type SurfaceAvailability =
  | 'online'
  | 'degraded'
  | 'offline';

export type PresenceObservation = Readonly<{
  surfaceId: string;
  sequence: number;
  observedAt: number;
  expiresAt: number;
  availability: SurfaceAvailability;
  confidence: number;
  deviceActive: boolean;
  recentDirectInteraction: boolean;
  explicitRoomMatch: boolean;
  estimatedLatencyMs: number;
}>;

export type PresenceRegistryUpdate = Readonly<{
  accepted: boolean;
  reason:
    | 'accepted'
    | 'duplicate'
    | 'invalid_observation'
    | 'stale_sequence'
    | 'sequence_conflict';
}>;

const MAX_OBSERVATION_TTL_MS =
  120_000;

const MAX_LATENCY_MS =
  60_000;

const ALLOWED_KEYS = new Set([
  'surfaceId',
  'sequence',
  'observedAt',
  'expiresAt',
  'availability',
  'confidence',
  'deviceActive',
  'recentDirectInteraction',
  'explicitRoomMatch',
  'estimatedLatencyMs',
]);

function isSafeNonNegativeInteger(
  value: unknown,
): value is number {
  return (
    typeof value === 'number'
    && Number.isSafeInteger(value)
    && value >= 0
  );
}

function isAvailability(
  value: unknown,
): value is SurfaceAvailability {
  return (
    value === 'online'
    || value === 'degraded'
    || value === 'offline'
  );
}

export function parsePresenceObservation(
  input: unknown,
): PresenceObservation | null {
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
    Object.keys(record).length !== ALLOWED_KEYS.size
    || Object.keys(record).some(
      (key) => !ALLOWED_KEYS.has(key),
    )
  ) {
    return null;
  }

  if (
    !isSurfaceId(record.surfaceId)
    || !isSafeNonNegativeInteger(record.sequence)
    || !isSafeNonNegativeInteger(record.observedAt)
    || !isSafeNonNegativeInteger(record.expiresAt)
    || !isAvailability(record.availability)
    || !isSafeNonNegativeInteger(record.confidence)
    || record.confidence > 100
    || typeof record.deviceActive !== 'boolean'
    || typeof record.recentDirectInteraction !== 'boolean'
    || typeof record.explicitRoomMatch !== 'boolean'
    || !isSafeNonNegativeInteger(record.estimatedLatencyMs)
    || record.estimatedLatencyMs > MAX_LATENCY_MS
  ) {
    return null;
  }

  if (
    record.expiresAt < record.observedAt
    || record.expiresAt - record.observedAt
      > MAX_OBSERVATION_TTL_MS
  ) {
    return null;
  }

  return Object.freeze({
    surfaceId: record.surfaceId,
    sequence: record.sequence,
    observedAt: record.observedAt,
    expiresAt: record.expiresAt,
    availability: record.availability,
    confidence: record.confidence,
    deviceActive: record.deviceActive,
    recentDirectInteraction:
      record.recentDirectInteraction,
    explicitRoomMatch:
      record.explicitRoomMatch,
    estimatedLatencyMs:
      record.estimatedLatencyMs,
  });
}

function observationsEqual(
  left: PresenceObservation,
  right: PresenceObservation,
): boolean {
  return (
    left.surfaceId === right.surfaceId
    && left.sequence === right.sequence
    && left.observedAt === right.observedAt
    && left.expiresAt === right.expiresAt
    && left.availability === right.availability
    && left.confidence === right.confidence
    && left.deviceActive === right.deviceActive
    && left.recentDirectInteraction
      === right.recentDirectInteraction
    && left.explicitRoomMatch
      === right.explicitRoomMatch
    && left.estimatedLatencyMs
      === right.estimatedLatencyMs
  );
}

export class PresenceRegistry {
  private readonly observations =
    new Map<string, PresenceObservation>();

  update(
    input: unknown,
  ): PresenceRegistryUpdate {
    const next =
      parsePresenceObservation(input);

    if (!next) {
      return {
        accepted: false,
        reason: 'invalid_observation',
      };
    }

    const current =
      this.observations.get(
        next.surfaceId,
      );

    if (!current) {
      this.observations.set(
        next.surfaceId,
        next,
      );

      return {
        accepted: true,
        reason: 'accepted',
      };
    }

    if (next.sequence < current.sequence) {
      return {
        accepted: false,
        reason: 'stale_sequence',
      };
    }

    if (next.sequence === current.sequence) {
      if (
        observationsEqual(
          current,
          next,
        )
      ) {
        return {
          accepted: true,
          reason: 'duplicate',
        };
      }

      return {
        accepted: false,
        reason: 'sequence_conflict',
      };
    }

    this.observations.set(
      next.surfaceId,
      next,
    );

    return {
      accepted: true,
      reason: 'accepted',
    };
  }

  get(
    surfaceId: string,
  ): PresenceObservation | null {
    return this.observations.get(
      surfaceId,
    ) ?? null;
  }

  list(): readonly PresenceObservation[] {
    return Object.freeze(
      [...this.observations.values()],
    );
  }

  clear(): void {
    this.observations.clear();
  }
}
