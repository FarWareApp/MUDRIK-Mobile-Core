export type VoiceSessionPhase =
  | 'idle'
  | 'listening'
  | 'user_speaking'
  | 'finalizing'
  | 'processing'
  | 'assistant_speaking'
  | 'cancelling'
  | 'ended'
  | 'error';

export type VoiceCancellationTarget =
  | 'listening'
  | 'ended';

export type VoiceSessionState = Readonly<{
  phase: VoiceSessionPhase;
  generation: number;
  cancellationTarget: VoiceCancellationTarget | null;
}>;

export type VoiceSessionEvent =
  | 'start'
  | 'speech_start'
  | 'speech_end'
  | 'transcript_final'
  | 'response_ready'
  | 'tts_start'
  | 'barge_in'
  | 'cancel'
  | 'cancel_complete'
  | 'response_complete'
  | 'fail'
  | 'reset';

export type VoiceRuntimeAction =
  | 'start_input'
  | 'stop_input'
  | 'finalize_input'
  | 'stop_tts'
  | 'discard_pending_response'
  | 'none';

export type VoiceSessionTransition = Readonly<{
  previous: VoiceSessionState;
  next: VoiceSessionState;
  accepted: boolean;
  reason:
    | 'applied'
    | 'idempotent'
    | 'invalid_event'
    | 'invalid_state';
  actions: readonly VoiceRuntimeAction[];
}>;

const PHASES: readonly VoiceSessionPhase[] = [
  'idle',
  'listening',
  'user_speaking',
  'finalizing',
  'processing',
  'assistant_speaking',
  'cancelling',
  'ended',
  'error',
];

const EVENTS: readonly VoiceSessionEvent[] = [
  'start',
  'speech_start',
  'speech_end',
  'transcript_final',
  'response_ready',
  'tts_start',
  'barge_in',
  'cancel',
  'cancel_complete',
  'response_complete',
  'fail',
  'reset',
];

export const INITIAL_VOICE_SESSION_STATE: VoiceSessionState = Object.freeze({
  phase: 'idle',
  generation: 0,
  cancellationTarget: null,
});

function isPhase(value: unknown): value is VoiceSessionPhase {
  return typeof value === 'string' && PHASES.includes(value as VoiceSessionPhase);
}

function isEvent(value: unknown): value is VoiceSessionEvent {
  return typeof value === 'string' && EVENTS.includes(value as VoiceSessionEvent);
}

function parseState(value: unknown): VoiceSessionState | null {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value)
  ) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const allowedKeys = new Set([
    'phase',
    'generation',
    'cancellationTarget',
  ]);

  if (
    Object.keys(record).some((key) => !allowedKeys.has(key)) ||
    !isPhase(record.phase) ||
    typeof record.generation !== 'number' ||
    !Number.isSafeInteger(record.generation) ||
    record.generation < 0 ||
    (
      record.cancellationTarget !== null &&
      record.cancellationTarget !== 'listening' &&
      record.cancellationTarget !== 'ended'
    )
  ) {
    return null;
  }

  if (
    record.phase !== 'cancelling' &&
    record.cancellationTarget !== null
  ) {
    return null;
  }

  if (
    record.phase === 'cancelling' &&
    record.cancellationTarget === null
  ) {
    return null;
  }

  return Object.freeze({
    phase: record.phase,
    generation: record.generation,
    cancellationTarget: record.cancellationTarget,
  });
}

function result(
  previous: VoiceSessionState,
  next: VoiceSessionState,
  accepted: boolean,
  reason: VoiceSessionTransition['reason'],
  actions: readonly VoiceRuntimeAction[] = ['none'],
): VoiceSessionTransition {
  return Object.freeze({
    previous,
    next,
    accepted,
    reason,
    actions: Object.freeze([...actions]),
  });
}

function nextState(
  state: VoiceSessionState,
  phase: VoiceSessionPhase,
  cancellationTarget: VoiceCancellationTarget | null = null,
  incrementGeneration = false,
): VoiceSessionState {
  return Object.freeze({
    phase,
    generation:
      state.generation +
      (incrementGeneration ? 1 : 0),
    cancellationTarget,
  });
}

export function transitionVoiceSession(input: unknown): VoiceSessionTransition {
  if (
    typeof input !== 'object' ||
    input === null ||
    Array.isArray(input)
  ) {
    return result(
      INITIAL_VOICE_SESSION_STATE,
      INITIAL_VOICE_SESSION_STATE,
      false,
      'invalid_state',
    );
  }

  const record = input as Record<string, unknown>;
  const allowedKeys = new Set(['state', 'event']);

  if (
    Object.keys(record).some((key) => !allowedKeys.has(key))
  ) {
    return result(
      INITIAL_VOICE_SESSION_STATE,
      INITIAL_VOICE_SESSION_STATE,
      false,
      'invalid_state',
    );
  }

  const state = parseState(record.state);
  if (!state) {
    return result(
      INITIAL_VOICE_SESSION_STATE,
      INITIAL_VOICE_SESSION_STATE,
      false,
      'invalid_state',
    );
  }

  if (!isEvent(record.event)) {
    return result(state, state, false, 'invalid_event');
  }

  const event = record.event;

  if (event === 'reset') {
    return result(
      state,
      INITIAL_VOICE_SESSION_STATE,
      true,
      'applied',
      state.phase === 'assistant_speaking'
        ? ['stop_tts', 'stop_input']
        : ['stop_input'],
    );
  }

  if (event === 'fail') {
    if (state.phase === 'error') {
      return result(state, state, true, 'idempotent');
    }

    return result(
      state,
      nextState(state, 'error'),
      true,
      'applied',
      state.phase === 'assistant_speaking'
        ? ['stop_tts', 'stop_input']
        : ['stop_input'],
    );
  }

  if (event === 'cancel') {
    if (state.phase === 'ended') {
      return result(state, state, true, 'idempotent');
    }

    if (state.phase === 'cancelling') {
      return result(state, state, true, 'idempotent');
    }

    const actions: VoiceRuntimeAction[] = ['stop_input', 'discard_pending_response'];
    if (state.phase === 'assistant_speaking') {
      actions.unshift('stop_tts');
    }

    return result(
      state,
      nextState(state, 'cancelling', 'ended'),
      true,
      'applied',
      actions,
    );
  }

  if (event === 'barge_in') {
    if (state.phase !== 'assistant_speaking') {
      return result(state, state, false, 'invalid_event');
    }

    return result(
      state,
      nextState(state, 'cancelling', 'listening'),
      true,
      'applied',
      ['stop_tts', 'discard_pending_response'],
    );
  }

  if (event === 'cancel_complete') {
    if (
      state.phase !== 'cancelling' ||
      state.cancellationTarget === null
    ) {
      return result(state, state, false, 'invalid_event');
    }

    const target = state.cancellationTarget;
    return result(
      state,
      nextState(
        state,
        target,
        null,
        target === 'listening',
      ),
      true,
      'applied',
      target === 'listening'
        ? ['start_input']
        : ['none'],
    );
  }

  const transitions: Partial<
    Record<
      VoiceSessionPhase,
      Partial<Record<VoiceSessionEvent, VoiceSessionPhase>>
    >
  > = {
    idle: {
      start: 'listening',
    },
    listening: {
      speech_start: 'user_speaking',
    },
    user_speaking: {
      speech_end: 'finalizing',
    },
    finalizing: {
      transcript_final: 'processing',
    },
    processing: {
      response_ready: 'processing',
      tts_start: 'assistant_speaking',
    },
    assistant_speaking: {
      response_complete: 'listening',
    },
  };

  const target = transitions[state.phase]?.[event];
  if (!target) {
    return result(state, state, false, 'invalid_event');
  }

  if (target === state.phase) {
    return result(state, state, true, 'idempotent');
  }

  const actions: VoiceRuntimeAction[] = [];

  if (state.phase === 'idle' && target === 'listening') {
    actions.push('start_input');
  }

  if (state.phase === 'user_speaking' && target === 'finalizing') {
    actions.push('finalize_input');
  }

  if (
    state.phase === 'assistant_speaking' &&
    target === 'listening'
  ) {
    actions.push('start_input');
  }

  return result(
    state,
    nextState(state, target),
    true,
    'applied',
    actions.length > 0 ? actions : ['none'],
  );
}
