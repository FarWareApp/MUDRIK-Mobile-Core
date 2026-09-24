import {
  isIdentityId,
} from '../identity/identityIds';

import {
  parseTrustedEvaluationTime,
} from '../security/trustedEvaluationTime';

import {
  isOrchestrationSessionId,
} from './deviceMediaIntent';

import {
  parseOpaqueOrchestrationReference,
} from './orchestrationReference';

export type AmbientTimeOfDay =
  | 'morning'
  | 'afternoon'
  | 'evening'
  | 'night'
  | 'unknown';

export type AmbientContext = Readonly<{
  orchestrationSessionId: string;
  sequence: number;
  observedAt: number;
  expiresAt: number;
  roomRef: string | null;
  timeOfDay: AmbientTimeOfDay;
  lightingLevel: number | null;
  lightingSceneRef: string | null;
  activeDisplayDeviceId: string | null;
  activeAudioDeviceId: string | null;
  recentMediaCategoryRef: string | null;
  currentRoutineRef: string | null;
  householdQuietMode: boolean;
  presenceConfidence: number | null;
  manualMoodPresetRef: string | null;
  persistByDefault: false;
  grantsMemoryAuthority: false;
  assertsEmotion: false;
}>;

export type AmbientContextEvaluation = Readonly<{
  accepted: boolean;
  context: AmbientContext | null;
  reason:
    | 'accepted'
    | 'invalid_context'
    | 'invalid_evaluation_time'
    | 'future_context'
    | 'stale_context';
}>;

const INPUT_KEYS = new Set([
  'orchestrationSessionId',
  'sequence',
  'observedAt',
  'expiresAt',
  'roomRef',
  'timeOfDay',
  'lightingLevel',
  'lightingSceneRef',
  'activeDisplayDeviceId',
  'activeAudioDeviceId',
  'recentMediaCategoryRef',
  'currentRoutineRef',
  'householdQuietMode',
  'presenceConfidence',
  'manualMoodPresetRef',
]);

const TIMES: readonly AmbientTimeOfDay[] = [
  'morning',
  'afternoon',
  'evening',
  'night',
  'unknown',
];

const MAX_TTL_MS =
  15 * 60 * 1000;

function isSafeNonNegativeInteger(
  value: unknown,
): value is number {
  return (
    typeof value === 'number'
    && Number.isSafeInteger(value)
    && value >= 0
  );
}

function parseNullablePercent(
  value: unknown,
): number | null | undefined {
  if (value === null) {
    return null;
  }

  if (
    isSafeNonNegativeInteger(value)
    && value <= 100
  ) {
    return value;
  }

  return undefined;
}

function parseNullableDeviceId(
  value: unknown,
): string | null | undefined {
  if (value === null) {
    return null;
  }

  return isIdentityId('device', value)
    ? value
    : undefined;
}

function parseNullableRef(
  value: unknown,
  prefix:
    | 'room'
    | 'scene'
    | 'category'
    | 'routine'
    | 'preset',
): string | null | undefined {
  if (value === null) {
    return null;
  }

  return (
    parseOpaqueOrchestrationReference(
      value,
      prefix,
    )
    ?? undefined
  );
}

export function parseAmbientContext(
  input: unknown,
): AmbientContext | null {
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
    Object.keys(record).length
      !== INPUT_KEYS.size
    || Object.keys(record).some(
      (key) => !INPUT_KEYS.has(key),
    )
    || !isOrchestrationSessionId(
      record.orchestrationSessionId,
    )
    || !isSafeNonNegativeInteger(
      record.sequence,
    )
    || !isSafeNonNegativeInteger(
      record.observedAt,
    )
    || !isSafeNonNegativeInteger(
      record.expiresAt,
    )
    || record.expiresAt
      <= record.observedAt
    || record.expiresAt
      - record.observedAt
      > MAX_TTL_MS
    || typeof record.timeOfDay
      !== 'string'
    || !TIMES.includes(
      record.timeOfDay as AmbientTimeOfDay,
    )
    || typeof record.householdQuietMode
      !== 'boolean'
  ) {
    return null;
  }

  const roomRef =
    parseNullableRef(
      record.roomRef,
      'room',
    );
  const lightingLevel =
    parseNullablePercent(
      record.lightingLevel,
    );
  const lightingSceneRef =
    parseNullableRef(
      record.lightingSceneRef,
      'scene',
    );
  const activeDisplayDeviceId =
    parseNullableDeviceId(
      record.activeDisplayDeviceId,
    );
  const activeAudioDeviceId =
    parseNullableDeviceId(
      record.activeAudioDeviceId,
    );
  const recentMediaCategoryRef =
    parseNullableRef(
      record.recentMediaCategoryRef,
      'category',
    );
  const currentRoutineRef =
    parseNullableRef(
      record.currentRoutineRef,
      'routine',
    );
  const presenceConfidence =
    parseNullablePercent(
      record.presenceConfidence,
    );
  const manualMoodPresetRef =
    parseNullableRef(
      record.manualMoodPresetRef,
      'preset',
    );

  if (
    roomRef === undefined
    || lightingLevel === undefined
    || lightingSceneRef === undefined
    || activeDisplayDeviceId === undefined
    || activeAudioDeviceId === undefined
    || recentMediaCategoryRef === undefined
    || currentRoutineRef === undefined
    || presenceConfidence === undefined
    || manualMoodPresetRef === undefined
  ) {
    return null;
  }

  return Object.freeze({
    orchestrationSessionId:
      record.orchestrationSessionId,
    sequence: record.sequence,
    observedAt: record.observedAt,
    expiresAt: record.expiresAt,
    roomRef,
    timeOfDay:
      record.timeOfDay as AmbientTimeOfDay,
    lightingLevel,
    lightingSceneRef,
    activeDisplayDeviceId,
    activeAudioDeviceId,
    recentMediaCategoryRef,
    currentRoutineRef,
    householdQuietMode:
      record.householdQuietMode,
    presenceConfidence,
    manualMoodPresetRef,
    persistByDefault: false,
    grantsMemoryAuthority: false,
    assertsEmotion: false,
  });
}

export function evaluateAmbientContext(
  input: unknown,
  trustedEvaluationTimeInput: unknown,
): AmbientContextEvaluation {
  const context =
    parseAmbientContext(input);

  if (!context) {
    return Object.freeze({
      accepted: false,
      context: null,
      reason: 'invalid_context',
    });
  }

  const trustedEvaluationTimeMs =
    parseTrustedEvaluationTime(
      trustedEvaluationTimeInput,
    );

  if (trustedEvaluationTimeMs === null) {
    return Object.freeze({
      accepted: false,
      context: null,
      reason:
        'invalid_evaluation_time',
    });
  }

  if (
    context.observedAt
      > trustedEvaluationTimeMs
  ) {
    return Object.freeze({
      accepted: false,
      context: null,
      reason: 'future_context',
    });
  }

  if (
    context.expiresAt
      <= trustedEvaluationTimeMs
  ) {
    return Object.freeze({
      accepted: false,
      context: null,
      reason: 'stale_context',
    });
  }

  return Object.freeze({
    accepted: true,
    context,
    reason: 'accepted',
  });
}
