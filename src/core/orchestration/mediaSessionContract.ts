import {
  isIdentityId,
} from '../identity/identityIds';

import {
  parseTrustedEvaluationTime,
} from '../security/trustedEvaluationTime';

import {
  parseOpaqueOrchestrationReference,
} from './orchestrationReference';

export type MediaSessionKind =
  | 'audio'
  | 'video'
  | 'podcast'
  | 'remote_game'
  | 'browser'
  | 'document'
  | 'presentation';

export type MediaPlaybackState =
  | 'playing'
  | 'paused'
  | 'stopped'
  | 'unknown';

export type MediaSessionSnapshot = Readonly<{
  mediaSessionRef: string;
  sourceDeviceId: string;
  revision: number;
  transferGeneration: number;
  mediaKind: MediaSessionKind;
  appRef: string | null;
  contentRef: string | null;
  positionMs: number | null;
  playbackState: MediaPlaybackState;
  observedAt: number;
  expiresAt: number;
  grantsInheritedAuthority: false;
}>;

export type MediaSessionEvaluation = Readonly<{
  accepted: boolean;
  session: MediaSessionSnapshot | null;
  reason:
    | 'accepted'
    | 'invalid_session'
    | 'invalid_evaluation_time'
    | 'future_session'
    | 'stale_session';
}>;

const INPUT_KEYS = new Set([
  'mediaSessionRef',
  'sourceDeviceId',
  'revision',
  'transferGeneration',
  'mediaKind',
  'appRef',
  'contentRef',
  'positionMs',
  'playbackState',
  'observedAt',
  'expiresAt',
]);

const KINDS: readonly MediaSessionKind[] = [
  'audio',
  'video',
  'podcast',
  'remote_game',
  'browser',
  'document',
  'presentation',
];

const PLAYBACK_STATES: readonly MediaPlaybackState[] = [
  'playing',
  'paused',
  'stopped',
  'unknown',
];

const MAX_TTL_MS =
  2 * 60 * 1000;

const MAX_POSITION_MS =
  7 * 24 * 60 * 60 * 1000;

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
  prefix: 'app' | 'content',
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

export function parseMediaSessionSnapshot(
  input: unknown,
): MediaSessionSnapshot | null {
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
    Object.keys(record).length !== INPUT_KEYS.size
    || Object.keys(record).some(
      (key) => !INPUT_KEYS.has(key),
    )
    || !parseOpaqueOrchestrationReference(
      record.mediaSessionRef,
      'media',
    )
    || !isIdentityId(
      'device',
      record.sourceDeviceId,
    )
    || !isSafeNonNegativeInteger(
      record.revision,
    )
    || record.revision < 1
    || !isSafeNonNegativeInteger(
      record.transferGeneration,
    )
    || typeof record.mediaKind !== 'string'
    || !KINDS.includes(
      record.mediaKind as MediaSessionKind,
    )
    || typeof record.playbackState !== 'string'
    || !PLAYBACK_STATES.includes(
      record.playbackState as MediaPlaybackState,
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
  ) {
    return null;
  }

  const appRef =
    parseNullableRef(
      record.appRef,
      'app',
    );
  const contentRef =
    parseNullableRef(
      record.contentRef,
      'content',
    );

  if (
    appRef === undefined
    || contentRef === undefined
  ) {
    return null;
  }

  let positionMs: number | null;

  if (record.positionMs === null) {
    positionMs = null;
  } else if (
    isSafeNonNegativeInteger(
      record.positionMs,
    )
    && record.positionMs
      <= MAX_POSITION_MS
  ) {
    positionMs = record.positionMs;
  } else {
    return null;
  }

  return Object.freeze({
    mediaSessionRef:
      record.mediaSessionRef as string,
    sourceDeviceId:
      record.sourceDeviceId,
    revision: record.revision,
    transferGeneration:
      record.transferGeneration,
    mediaKind:
      record.mediaKind as MediaSessionKind,
    appRef,
    contentRef,
    positionMs,
    playbackState:
      record.playbackState as MediaPlaybackState,
    observedAt: record.observedAt,
    expiresAt: record.expiresAt,
    grantsInheritedAuthority: false,
  });
}

export function evaluateMediaSessionSnapshot(
  input: unknown,
  trustedEvaluationTimeInput: unknown,
): MediaSessionEvaluation {
  const session =
    parseMediaSessionSnapshot(input);

  if (!session) {
    return Object.freeze({
      accepted: false,
      session: null,
      reason: 'invalid_session',
    });
  }

  const trustedEvaluationTimeMs =
    parseTrustedEvaluationTime(
      trustedEvaluationTimeInput,
    );

  if (trustedEvaluationTimeMs === null) {
    return Object.freeze({
      accepted: false,
      session: null,
      reason:
        'invalid_evaluation_time',
    });
  }

  if (
    session.observedAt
      > trustedEvaluationTimeMs
  ) {
    return Object.freeze({
      accepted: false,
      session: null,
      reason: 'future_session',
    });
  }

  if (
    session.expiresAt
      <= trustedEvaluationTimeMs
  ) {
    return Object.freeze({
      accepted: false,
      session: null,
      reason: 'stale_session',
    });
  }

  return Object.freeze({
    accepted: true,
    session,
    reason: 'accepted',
  });
}
