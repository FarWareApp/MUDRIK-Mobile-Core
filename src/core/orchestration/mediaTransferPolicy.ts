import {
  isIdentityId,
} from '../identity/identityIds';

import {
  parseDeviceMediaIntent,
} from './deviceMediaIntent';

import {
  evaluateMediaSessionSnapshot,
} from './mediaSessionContract';

export type MediaTransferManifest = Readonly<{
  mediaSessionRef: string;
  sourceDeviceId: string;
  targetDeviceId: string;
  sourceRevision: number;
  fromTransferGeneration: number;
  toTransferGeneration: number;
  appRef: string | null;
  contentRef: string | null;
  resumePositionMs: number | null;
  grantsInheritedAuthority: false;
}>;

export type MediaTransferDecision = Readonly<{
  accepted: boolean;
  manifest: MediaTransferManifest | null;
  reason:
    | 'accepted'
    | 'invalid_input'
    | 'session_unavailable'
    | 'session_mismatch'
    | 'stale_intent'
    | 'source_mismatch'
    | 'target_mismatch'
    | 'same_device'
    | 'session_not_transferable'
    | 'generation_exhausted';
}>;

function reject(
  reason: Exclude<
    MediaTransferDecision['reason'],
    'accepted'
  >,
): MediaTransferDecision {
  return Object.freeze({
    accepted: false,
    manifest: null,
    reason,
  });
}

export function evaluateMediaTransfer(
  intentInput: unknown,
  sessionInput: unknown,
  resolvedTargetDeviceIdInput: unknown,
  trustedEvaluationTimeInput: unknown,
): MediaTransferDecision {
  const intent =
    parseDeviceMediaIntent(
      intentInput,
    );

  if (
    !intent
    || intent.kind
      !== 'media.transfer_session'
    || !isIdentityId(
      'device',
      resolvedTargetDeviceIdInput,
    )
  ) {
    return reject('invalid_input');
  }

  const evaluation =
    evaluateMediaSessionSnapshot(
      sessionInput,
      trustedEvaluationTimeInput,
    );

  if (
    !evaluation.accepted
    || !evaluation.session
  ) {
    return reject(
      'session_unavailable',
    );
  }

  const session = evaluation.session;
  const targetDeviceId =
    resolvedTargetDeviceIdInput;

  if (
    intent.mediaSessionRef
      !== session.mediaSessionRef
  ) {
    return reject(
      'session_mismatch',
    );
  }

  if (
    intent.expectedMediaRevision
      !== session.revision
    || intent.expectedTransferGeneration
      !== session.transferGeneration
  ) {
    return reject(
      'stale_intent',
    );
  }

  if (
    intent.sourceDeviceId !== null
    && intent.sourceDeviceId
      !== session.sourceDeviceId
  ) {
    return reject(
      'source_mismatch',
    );
  }

  if (
    intent.targetDeviceId !== null
    && intent.targetDeviceId
      !== targetDeviceId
  ) {
    return reject(
      'target_mismatch',
    );
  }

  if (
    targetDeviceId
      === session.sourceDeviceId
  ) {
    return reject('same_device');
  }

  if (
    session.playbackState
      !== 'playing'
    && session.playbackState
      !== 'paused'
  ) {
    return reject(
      'session_not_transferable',
    );
  }

  if (
    session.transferGeneration
      === Number.MAX_SAFE_INTEGER
  ) {
    return reject(
      'generation_exhausted',
    );
  }

  return Object.freeze({
    accepted: true,
    reason: 'accepted',
    manifest: Object.freeze({
      mediaSessionRef:
        session.mediaSessionRef,
      sourceDeviceId:
        session.sourceDeviceId,
      targetDeviceId,
      sourceRevision:
        session.revision,
      fromTransferGeneration:
        session.transferGeneration,
      toTransferGeneration:
        session.transferGeneration + 1,
      appRef: session.appRef,
      contentRef:
        session.contentRef,
      resumePositionMs:
        session.positionMs,
      grantsInheritedAuthority: false,
    }),
  });
}
