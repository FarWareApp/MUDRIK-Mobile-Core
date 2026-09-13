import {
  VoiceActivationMode,
  VoiceRuntimeFailureCode,
  VoiceRuntimeState,
  VoiceRuntimeStopReason,
  VoiceRuntimeTransition,
  createInitialVoiceRuntimeState,
} from './voiceRuntimeTypes';

type MicrophoneAuthorization =
  | 'granted'
  | 'denied'
  | 'unknown';

const ACTIVATION_MODES:
  readonly VoiceActivationMode[] = [
  'wake_word',
  'press_to_talk',
  'open_session',
  'headset_button',
];

const STOP_REASONS:
  readonly VoiceRuntimeStopReason[] = [
  'user_cancel',
  'barge_in',
  'privacy_restriction',
  'session_end',
  'runtime_error',
];

const FAILURE_CODES:
  readonly VoiceRuntimeFailureCode[] = [
  'microphone_permission_denied',
  'microphone_permission_unverified',
  'privacy_blocked',
  'microphone_unavailable',
  'recognition_failed',
  'synthesis_failed',
  'playback_failed',
  'network_unavailable',
  'internal_error',
];

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === 'object'
    && value !== null
    && !Array.isArray(value)
  );
}

function hasExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  const actual = Object.keys(value)
    .sort();

  const expected = [...keys]
    .sort();

  return (
    actual.length === expected.length
    && actual.every(
      (key, index) =>
        key === expected[index],
    )
  );
}

function isNonEmptyId(
  value: unknown,
): value is string {
  return (
    typeof value === 'string'
    && value.trim().length > 0
    && value.length <= 160
  );
}

function cloneState(
  state: VoiceRuntimeState,
): VoiceRuntimeState {
  return {
    ...state,
    lastFailure:
      state.lastFailure
        ? { ...state.lastFailure }
        : null,
  };
}

function reject(
  state: VoiceRuntimeState,
  reason: string,
): VoiceRuntimeTransition {
  return {
    accepted: false,
    reason,
    state: cloneState(state),
  };
}

function accept(
  state: VoiceRuntimeState,
  reason: string,
): VoiceRuntimeTransition {
  return {
    accepted: true,
    reason,
    state,
  };
}

function isActivationMode(
  value: unknown,
): value is VoiceActivationMode {
  return (
    typeof value === 'string'
    && ACTIVATION_MODES.includes(
      value as VoiceActivationMode,
    )
  );
}

function isStopReason(
  value: unknown,
): value is VoiceRuntimeStopReason {
  return (
    typeof value === 'string'
    && STOP_REASONS.includes(
      value as VoiceRuntimeStopReason,
    )
  );
}

function isFailureCode(
  value: unknown,
): value is VoiceRuntimeFailureCode {
  return (
    typeof value === 'string'
    && FAILURE_CODES.includes(
      value as VoiceRuntimeFailureCode,
    )
  );
}

function isMicrophoneAuthorization(
  value: unknown,
): value is MicrophoneAuthorization {
  return (
    value === 'granted'
    || value === 'denied'
    || value === 'unknown'
  );
}

export function transitionVoiceRuntime(
  state: VoiceRuntimeState,
  event: unknown,
): VoiceRuntimeTransition {
  if (!isRecord(event)) {
    return reject(
      state,
      'malformed_event',
    );
  }

  const type = event.type;

  if (type === 'start_requested') {
    if (
      !hasExactKeys(event, [
        'type',
        'mode',
        'sessionId',
        'microphonePermission',
        'privacyAllowsMicrophone',
      ])
      || !isActivationMode(event.mode)
      || !isNonEmptyId(event.sessionId)
      || !isMicrophoneAuthorization(
        event.microphonePermission,
      )
      || typeof event.privacyAllowsMicrophone
        !== 'boolean'
    ) {
      return reject(
        state,
        'malformed_start_request',
      );
    }

    if (state.phase !== 'idle') {
      return reject(
        state,
        'runtime_not_idle',
      );
    }

    if (!event.privacyAllowsMicrophone) {
      return accept(
        {
          ...createInitialVoiceRuntimeState(),
          phase: 'blocked',
          lastFailure: {
            code: 'privacy_blocked',
            retryable: true,
          },
        },
        'privacy_blocked',
      );
    }

    if (
      event.microphonePermission
      !== 'granted'
    ) {
      const code:
        VoiceRuntimeFailureCode =
        event.microphonePermission
          === 'denied'
          ? 'microphone_permission_denied'
          : 'microphone_permission_unverified';

      return accept(
        {
          ...createInitialVoiceRuntimeState(),
          phase: 'blocked',
          lastFailure: {
            code,
            retryable:
              event.microphonePermission
              !== 'denied',
          },
        },
        code,
      );
    }

    return accept(
      {
        phase: 'arming',
        activationMode: event.mode,
        sessionId: event.sessionId,
        turnId: null,
        pendingStopReason: null,
        lastFailure: null,
      },
      'arming',
    );
  }

  if (type === 'capture_started') {
    if (!hasExactKeys(event, ['type'])) {
      return reject(
        state,
        'malformed_capture_started',
      );
    }

    if (
      state.phase !== 'arming'
      && state.phase !== 'interrupting'
    ) {
      return reject(
        state,
        'capture_start_not_expected',
      );
    }

    return accept(
      {
        ...cloneState(state),
        phase: 'listening',
        turnId: null,
        pendingStopReason: null,
        lastFailure: null,
      },
      'listening',
    );
  }

  if (type === 'utterance_finalized') {
    if (
      !hasExactKeys(event, [
        'type',
        'turnId',
      ])
      || !isNonEmptyId(event.turnId)
    ) {
      return reject(
        state,
        'malformed_utterance',
      );
    }

    if (state.phase !== 'listening') {
      return reject(
        state,
        'utterance_not_expected',
      );
    }

    return accept(
      {
        ...cloneState(state),
        phase: 'processing',
        turnId: event.turnId,
        pendingStopReason: null,
      },
      'processing',
    );
  }

  if (type === 'output_prepared') {
    if (
      !hasExactKeys(event, [
        'type',
        'turnId',
      ])
      || !isNonEmptyId(event.turnId)
    ) {
      return reject(
        state,
        'malformed_output',
      );
    }

    if (
      state.phase !== 'processing'
      || state.turnId !== event.turnId
    ) {
      return reject(
        state,
        'output_turn_mismatch',
      );
    }

    return accept(
      {
        ...cloneState(state),
        phase: 'preparing_output',
      },
      'preparing_output',
    );
  }

  if (type === 'playback_started') {
    if (
      !hasExactKeys(event, [
        'type',
        'turnId',
      ])
      || !isNonEmptyId(event.turnId)
    ) {
      return reject(
        state,
        'malformed_playback',
      );
    }

    if (
      state.phase !== 'preparing_output'
      || state.turnId !== event.turnId
    ) {
      return reject(
        state,
        'playback_turn_mismatch',
      );
    }

    return accept(
      {
        ...cloneState(state),
        phase: 'speaking',
      },
      'speaking',
    );
  }

  if (type === 'barge_in_requested') {
    if (!hasExactKeys(event, ['type'])) {
      return reject(
        state,
        'malformed_barge_in',
      );
    }

    if (state.phase !== 'speaking') {
      return reject(
        state,
        'barge_in_not_available',
      );
    }

    return accept(
      {
        ...cloneState(state),
        phase: 'interrupting',
        pendingStopReason: 'barge_in',
      },
      'interrupting',
    );
  }

  if (type === 'stop_requested') {
    if (
      !hasExactKeys(event, [
        'type',
        'reason',
      ])
      || !isStopReason(event.reason)
    ) {
      return reject(
        state,
        'malformed_stop_request',
      );
    }

    if (
      state.phase === 'idle'
      || state.phase === 'blocked'
    ) {
      return reject(
        state,
        'nothing_active_to_stop',
      );
    }

    return accept(
      {
        ...cloneState(state),
        phase: 'stopping',
        pendingStopReason: event.reason,
      },
      'stopping',
    );
  }

  if (type === 'privacy_restricted') {
    if (!hasExactKeys(event, ['type'])) {
      return reject(
        state,
        'malformed_privacy_restriction',
      );
    }

    if (state.phase === 'idle') {
      return accept(
        cloneState(state),
        'already_private',
      );
    }

    if (state.phase === 'blocked') {
      return accept(
        cloneState(state),
        'already_blocked',
      );
    }

    return accept(
      {
        ...cloneState(state),
        phase: 'stopping',
        pendingStopReason:
          'privacy_restriction',
      },
      'privacy_stop_required',
    );
  }

  if (type === 'stopped') {
    if (!hasExactKeys(event, ['type'])) {
      return reject(
        state,
        'malformed_stopped_event',
      );
    }

    if (state.phase !== 'stopping') {
      return reject(
        state,
        'stop_not_pending',
      );
    }

    return accept(
      createInitialVoiceRuntimeState(),
      'idle',
    );
  }

  if (type === 'failure') {
    if (
      !hasExactKeys(event, [
        'type',
        'code',
        'retryable',
      ])
      || !isFailureCode(event.code)
      || typeof event.retryable !== 'boolean'
    ) {
      return reject(
        state,
        'malformed_failure',
      );
    }

    if (state.phase === 'idle') {
      return reject(
        state,
        'failure_without_runtime',
      );
    }

    return accept(
      {
        ...cloneState(state),
        phase: 'error',
        pendingStopReason:
          'runtime_error',
        lastFailure: {
          code: event.code,
          retryable: event.retryable,
        },
      },
      'runtime_error',
    );
  }

  if (type === 'reset') {
    if (!hasExactKeys(event, ['type'])) {
      return reject(
        state,
        'malformed_reset',
      );
    }

    if (
      state.phase !== 'blocked'
      && state.phase !== 'error'
    ) {
      return reject(
        state,
        'reset_not_required',
      );
    }

    return accept(
      createInitialVoiceRuntimeState(),
      'idle',
    );
  }

  return reject(
    state,
    'unknown_event',
  );
}
