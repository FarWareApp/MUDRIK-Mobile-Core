import {
  qualifyBargeIn,
  type BargeInDecisionReason,
} from './bargeInPolicy';
import {
  decideEndOfTurn,
  type EndOfTurnResult,
} from './endOfTurnPolicy';
import {
  SpeechSegmentRegistry,
  type SpeechRegistryDecision,
} from './speechSegmentRegistry';
import {
  isExecutableSpeechSegment,
  validateStreamingSpeechSegment,
} from './streamingSpeech';
import {
  TtsStreamLifecycle,
  type TtsLifecycleReason,
  type TtsLifecycleState,
} from './TtsStreamLifecycle';
import {
  validateVoiceActivityEvent,
} from './voiceActivityEvent';
import {
  VoiceActivityRegistry,
  type VoiceActivityDecision,
} from './voiceActivityRegistry';
import {
  INITIAL_VOICE_SESSION_STATE,
  transitionVoiceSession,
  type VoiceRuntimeAction,
  type VoiceSessionEvent,
  type VoiceSessionState,
} from './voiceSessionState';

export type VoiceCoordinatorReason =
  | 'applied'
  | 'waiting'
  | 'no_state_change'
  | 'invalid_input'
  | 'activity_rejected'
  | 'speech_rejected'
  | 'partial_not_executable'
  | 'wrong_phase'
  | 'barge_in_rejected'
  | 'tts_not_prepared'
  | 'tts_already_prepared'
  | 'tts_rejected'
  | 'transition_rejected';

export type VoiceCoordinatorResult = Readonly<{
  accepted: boolean;
  reason: VoiceCoordinatorReason;
  state: VoiceSessionState;
  actions: readonly VoiceRuntimeAction[];
  endOfTurn: EndOfTurnResult | null;
  activityDecision: VoiceActivityDecision | null;
  speechDecision: SpeechRegistryDecision | null;
  bargeInDecisionReason: BargeInDecisionReason | null;
  ttsState: TtsLifecycleState | null;
  ttsReason: TtsLifecycleReason | null;
}>;

const SESSION_ID = /^voice_[A-Za-z0-9_-]{16,80}$/;

function result(
  accepted: boolean,
  reason: VoiceCoordinatorReason,
  state: VoiceSessionState,
  actions: readonly VoiceRuntimeAction[] = ['none'],
  endOfTurn: EndOfTurnResult | null = null,
  activityDecision: VoiceActivityDecision | null = null,
  speechDecision: SpeechRegistryDecision | null = null,
  bargeInDecisionReason: BargeInDecisionReason | null = null,
  ttsState: TtsLifecycleState | null = null,
  ttsReason: TtsLifecycleReason | null = null,
): VoiceCoordinatorResult {
  return Object.freeze({
    accepted,
    reason,
    state,
    actions: Object.freeze([...actions]),
    endOfTurn,
    activityDecision,
    speechDecision,
    bargeInDecisionReason,
    ttsState,
    ttsReason,
  });
}

function withStopTts(
  actions: readonly VoiceRuntimeAction[],
): readonly VoiceRuntimeAction[] {
  if (actions.includes('stop_tts')) {
    return actions;
  }

  const withoutNone = actions.filter((action) => action !== 'none');
  return Object.freeze([
    'stop_tts' as const,
    ...withoutNone,
  ]);
}

export class VoiceRuntimeCoordinator {
  private state: VoiceSessionState = INITIAL_VOICE_SESSION_STATE;
  private activityRegistry: VoiceActivityRegistry;
  private speechRegistry: SpeechSegmentRegistry;
  private ttsLifecycle: TtsStreamLifecycle | null = null;

  constructor(private readonly sessionId: string) {
    if (!SESSION_ID.test(sessionId)) {
      throw new Error('Invalid voice session id.');
    }

    this.activityRegistry = new VoiceActivityRegistry(
      sessionId,
      this.state.generation,
    );
    this.speechRegistry = new SpeechSegmentRegistry(
      sessionId,
      this.state.generation,
    );
  }

  getState(): VoiceSessionState {
    return this.state;
  }

  private replaceGenerationRegistries(): void {
    this.activityRegistry = new VoiceActivityRegistry(
      this.sessionId,
      this.state.generation,
    );
    this.speechRegistry = new SpeechSegmentRegistry(
      this.sessionId,
      this.state.generation,
    );
    this.ttsLifecycle = null;
  }

  private applyTransition(
    event: VoiceSessionEvent,
  ): VoiceCoordinatorResult {
    const previousGeneration = this.state.generation;
    const transition = transitionVoiceSession({
      state: this.state,
      event,
    });

    if (!transition.accepted) {
      return result(
        false,
        'transition_rejected',
        this.state,
      );
    }

    this.state = transition.next;
    if (this.state.generation !== previousGeneration) {
      this.replaceGenerationRegistries();
    }

    return result(
      true,
      transition.reason === 'applied'
        ? 'applied'
        : 'no_state_change',
      this.state,
      transition.actions,
    );
  }

  start(): VoiceCoordinatorResult {
    return this.applyTransition('start');
  }

  cancel(): VoiceCoordinatorResult {
    const hadTts = this.ttsLifecycle !== null;
    const ttsState = this.ttsLifecycle?.cancel().state ?? null;
    this.ttsLifecycle = null;

    const transitioned = this.applyTransition('cancel');
    if (!hadTts) {
      return transitioned;
    }

    return result(
      transitioned.accepted,
      transitioned.reason,
      transitioned.state,
      withStopTts(transitioned.actions),
      null,
      null,
      null,
      null,
      ttsState,
      'accepted',
    );
  }

  completeCancellation(): VoiceCoordinatorResult {
    return this.applyTransition('cancel_complete');
  }

  bargeIn(input: unknown): VoiceCoordinatorResult {
    if (
      typeof input !== 'object' ||
      input === null ||
      Array.isArray(input)
    ) {
      return result(
        false,
        'barge_in_rejected',
        this.state,
        ['none'],
        null,
        null,
        null,
        'invalid_input',
      );
    }

    const record = input as Record<string, unknown>;
    const allowedKeys = new Set([
      'inputAuthorized',
      'speechActive',
      'speechDurationMs',
      'vadConfidence',
      'echoState',
      'hasLexicalEvidence',
      'hypothesisStability',
    ]);

    if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
      return result(
        false,
        'barge_in_rejected',
        this.state,
        ['none'],
        null,
        null,
        null,
        'invalid_input',
      );
    }

    const qualification = qualifyBargeIn({
      ...record,
      assistantSpeaking: this.state.phase === 'assistant_speaking',
    });

    if (!qualification.interrupt) {
      return result(
        false,
        'barge_in_rejected',
        this.state,
        ['none'],
        null,
        null,
        null,
        qualification.reason,
      );
    }

    if (!this.ttsLifecycle) {
      return result(
        false,
        'tts_not_prepared',
        this.state,
        ['none'],
        null,
        null,
        null,
        qualification.reason,
      );
    }

    const ttsCancelled = this.ttsLifecycle.cancel();
    const ttsState = ttsCancelled.state;
    this.ttsLifecycle = null;

    const transitioned = this.applyTransition('barge_in');
    return result(
      transitioned.accepted,
      transitioned.reason,
      transitioned.state,
      transitioned.actions,
      null,
      null,
      null,
      qualification.reason,
      ttsState,
      ttsCancelled.reason,
    );
  }

  fail(): VoiceCoordinatorResult {
    const hadTts = this.ttsLifecycle !== null;
    const ttsState = this.ttsLifecycle?.fail().state ?? null;
    this.ttsLifecycle = null;

    const transitioned = this.applyTransition('fail');
    if (!hadTts) {
      return transitioned;
    }

    return result(
      transitioned.accepted,
      transitioned.reason,
      transitioned.state,
      withStopTts(transitioned.actions),
      null,
      null,
      null,
      null,
      ttsState,
      'accepted',
    );
  }

  reset(): VoiceCoordinatorResult {
    const hadTts = this.ttsLifecycle !== null;
    const ttsState = this.ttsLifecycle?.cancel().state ?? null;
    this.ttsLifecycle = null;

    const transitioned = this.applyTransition('reset');
    if (!hadTts) {
      return transitioned;
    }

    return result(
      transitioned.accepted,
      transitioned.reason,
      transitioned.state,
      withStopTts(transitioned.actions),
      null,
      null,
      null,
      null,
      ttsState,
      'accepted',
    );
  }

  onActivity(
    input: unknown,
    endOfTurnInput: unknown,
  ): VoiceCoordinatorResult {
    const validation = validateVoiceActivityEvent(input);
    if (!validation.accepted || !validation.event) {
      return result(false, 'invalid_input', this.state);
    }

    const activityDecision = this.activityRegistry.apply(
      validation.event,
    );
    if (!activityDecision.accepted) {
      return result(
        false,
        'activity_rejected',
        this.state,
        ['none'],
        null,
        activityDecision,
      );
    }

    if (
      this.state.phase === 'listening' &&
      validation.event.speechActive
    ) {
      const transitioned = this.applyTransition('speech_start');
      return result(
        transitioned.accepted,
        transitioned.reason,
        transitioned.state,
        transitioned.actions,
        null,
        activityDecision,
      );
    }

    if (
      this.state.phase === 'user_speaking' &&
      !validation.event.speechActive
    ) {
      const endOfTurn = decideEndOfTurn(endOfTurnInput);
      if (
        endOfTurn.decision === 'finalize' ||
        endOfTurn.decision === 'force_finalize'
      ) {
        const transitioned = this.applyTransition('speech_end');
        return result(
          transitioned.accepted,
          transitioned.reason,
          transitioned.state,
          transitioned.actions,
          endOfTurn,
          activityDecision,
        );
      }

      return result(
        true,
        'waiting',
        this.state,
        ['none'],
        endOfTurn,
        activityDecision,
      );
    }

    return result(
      true,
      'no_state_change',
      this.state,
      ['none'],
      null,
      activityDecision,
    );
  }

  onTranscript(input: unknown): VoiceCoordinatorResult {
    const validation = validateStreamingSpeechSegment(input);
    if (!validation.accepted || !validation.segment) {
      return result(false, 'invalid_input', this.state);
    }

    if (!isExecutableSpeechSegment(validation.segment)) {
      return result(
        false,
        'partial_not_executable',
        this.state,
      );
    }

    if (this.state.phase !== 'finalizing') {
      return result(
        false,
        'wrong_phase',
        this.state,
      );
    }

    const speechDecision = this.speechRegistry.apply(
      validation.segment,
    );
    if (!speechDecision.accepted) {
      return result(
        false,
        'speech_rejected',
        this.state,
        ['none'],
        null,
        null,
        speechDecision,
      );
    }

    const transitioned = this.applyTransition('transcript_final');
    return result(
      transitioned.accepted,
      transitioned.reason,
      transitioned.state,
      transitioned.actions,
      null,
      null,
      speechDecision,
    );
  }

  markResponseReady(): VoiceCoordinatorResult {
    return this.applyTransition('response_ready');
  }

  beginTts(utteranceId: unknown): VoiceCoordinatorResult {
    if (this.state.phase !== 'processing') {
      return result(false, 'wrong_phase', this.state);
    }

    if (this.ttsLifecycle) {
      return result(
        false,
        'tts_already_prepared',
        this.state,
        ['none'],
        null,
        null,
        null,
        null,
        this.ttsLifecycle.getState(),
      );
    }

    if (typeof utteranceId !== 'string') {
      return result(false, 'invalid_input', this.state);
    }

    try {
      this.ttsLifecycle = new TtsStreamLifecycle(
        this.sessionId,
        this.state.generation,
        utteranceId,
      );
    } catch {
      return result(false, 'invalid_input', this.state);
    }

    return result(
      true,
      'no_state_change',
      this.state,
      ['none'],
      null,
      null,
      null,
      null,
      this.ttsLifecycle.getState(),
    );
  }

  onTtsChunk(input: unknown): VoiceCoordinatorResult {
    if (!this.ttsLifecycle) {
      return result(false, 'tts_not_prepared', this.state);
    }

    if (
      this.state.phase !== 'processing' &&
      this.state.phase !== 'assistant_speaking'
    ) {
      return result(
        false,
        'wrong_phase',
        this.state,
        ['none'],
        null,
        null,
        null,
        null,
        this.ttsLifecycle.getState(),
      );
    }

    const ttsResult = this.ttsLifecycle.acceptChunk(input);
    if (!ttsResult.accepted) {
      return result(
        false,
        'tts_rejected',
        this.state,
        ['none'],
        null,
        null,
        null,
        null,
        ttsResult.state,
        ttsResult.reason,
      );
    }

    return result(
      true,
      'no_state_change',
      this.state,
      ['none'],
      null,
      null,
      null,
      null,
      ttsResult.state,
      ttsResult.reason,
    );
  }

  confirmTtsPlaybackStarted(): VoiceCoordinatorResult {
    if (!this.ttsLifecycle) {
      return result(false, 'tts_not_prepared', this.state);
    }

    if (
      this.state.phase !== 'processing' &&
      this.state.phase !== 'assistant_speaking'
    ) {
      return result(
        false,
        'wrong_phase',
        this.state,
        ['none'],
        null,
        null,
        null,
        null,
        this.ttsLifecycle.getState(),
      );
    }

    const ttsResult = this.ttsLifecycle.confirmPlaybackStarted();
    if (!ttsResult.accepted) {
      return result(
        false,
        'tts_rejected',
        this.state,
        ['none'],
        null,
        null,
        null,
        null,
        ttsResult.state,
        ttsResult.reason,
      );
    }

    if (this.state.phase === 'assistant_speaking') {
      return result(
        true,
        'no_state_change',
        this.state,
        ['none'],
        null,
        null,
        null,
        null,
        ttsResult.state,
        ttsResult.reason,
      );
    }

    const transitioned = this.applyTransition('tts_start');
    return result(
      transitioned.accepted,
      transitioned.reason,
      transitioned.state,
      transitioned.actions,
      null,
      null,
      null,
      null,
      ttsResult.state,
      ttsResult.reason,
    );
  }

  confirmTtsPlaybackComplete(): VoiceCoordinatorResult {
    if (!this.ttsLifecycle) {
      return result(false, 'tts_not_prepared', this.state);
    }

    if (this.state.phase !== 'assistant_speaking') {
      return result(
        false,
        'wrong_phase',
        this.state,
        ['none'],
        null,
        null,
        null,
        null,
        this.ttsLifecycle.getState(),
      );
    }

    const ttsResult = this.ttsLifecycle.confirmPlaybackComplete();
    if (!ttsResult.accepted) {
      return result(
        false,
        'tts_rejected',
        this.state,
        ['none'],
        null,
        null,
        null,
        null,
        ttsResult.state,
        ttsResult.reason,
      );
    }

    const transitioned = this.applyTransition('response_complete');
    const completedState = ttsResult.state;
    this.ttsLifecycle = null;

    return result(
      transitioned.accepted,
      transitioned.reason,
      transitioned.state,
      transitioned.actions,
      null,
      null,
      null,
      null,
      completedState,
      ttsResult.reason,
    );
  }
}
