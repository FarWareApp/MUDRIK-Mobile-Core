import {
  TtsChunkRegistry,
  type TtsChunkDecision,
} from './ttsChunkRegistry';
import {
  validateStreamingTtsChunkMetadata,
} from './voiceProviderContracts';

export type TtsLifecyclePhase =
  | 'awaiting_first_chunk'
  | 'streaming'
  | 'stream_received'
  | 'playback_started'
  | 'playback_complete'
  | 'cancelled'
  | 'failed';

export type TtsLifecycleState = Readonly<{
  phase: TtsLifecyclePhase;
  firstChunkAccepted: boolean;
  finalChunkAccepted: boolean;
  playbackStarted: boolean;
}>;

export type TtsLifecycleReason =
  | 'accepted'
  | 'idempotent'
  | 'invalid_input'
  | 'chunk_rejected'
  | 'lifecycle_closed'
  | 'first_audio_required'
  | 'final_chunk_required';

export type TtsLifecycleResult = Readonly<{
  accepted: boolean;
  reason: TtsLifecycleReason;
  state: TtsLifecycleState;
  chunkDecision: TtsChunkDecision | null;
}>;

const SESSION_ID = /^voice_[A-Za-z0-9_-]{16,80}$/;
const UTTERANCE_ID = /^utt_[A-Za-z0-9_-]{16,80}$/;

function frozenState(
  phase: TtsLifecyclePhase,
  firstChunkAccepted: boolean,
  finalChunkAccepted: boolean,
  playbackStarted: boolean,
): TtsLifecycleState {
  return Object.freeze({
    phase,
    firstChunkAccepted,
    finalChunkAccepted,
    playbackStarted,
  });
}

function result(
  accepted: boolean,
  reason: TtsLifecycleReason,
  state: TtsLifecycleState,
  chunkDecision: TtsChunkDecision | null = null,
): TtsLifecycleResult {
  return Object.freeze({
    accepted,
    reason,
    state,
    chunkDecision,
  });
}

export class TtsStreamLifecycle {
  private state: TtsLifecycleState = frozenState(
    'awaiting_first_chunk',
    false,
    false,
    false,
  );

  private readonly registry: TtsChunkRegistry;

  constructor(
    private readonly sessionId: string,
    private readonly generation: number,
    private readonly utteranceId: string,
  ) {
    if (
      !SESSION_ID.test(sessionId) ||
      !Number.isSafeInteger(generation) ||
      generation < 0 ||
      !UTTERANCE_ID.test(utteranceId)
    ) {
      throw new Error('Invalid TTS stream identity.');
    }

    this.registry = new TtsChunkRegistry(
      sessionId,
      generation,
      utteranceId,
    );
  }

  getState(): TtsLifecycleState {
    return this.state;
  }

  acceptChunk(input: unknown): TtsLifecycleResult {
    if (
      this.state.phase === 'cancelled' ||
      this.state.phase === 'failed' ||
      this.state.phase === 'playback_complete'
    ) {
      return result(false, 'lifecycle_closed', this.state);
    }

    const chunk = validateStreamingTtsChunkMetadata(input);
    if (!chunk) {
      return result(false, 'invalid_input', this.state);
    }

    const chunkDecision = this.registry.apply(chunk);
    if (!chunkDecision.accepted) {
      return result(
        false,
        'chunk_rejected',
        this.state,
        chunkDecision,
      );
    }

    if (chunkDecision.idempotent) {
      return result(
        true,
        'idempotent',
        this.state,
        chunkDecision,
      );
    }

    const firstChunkAccepted = true;
    const finalChunkAccepted =
      this.state.finalChunkAccepted || chunk.isFinal;

    let phase: TtsLifecyclePhase;
    if (this.state.playbackStarted) {
      phase = finalChunkAccepted
        ? 'stream_received'
        : 'playback_started';
    } else {
      phase = finalChunkAccepted
        ? 'stream_received'
        : 'streaming';
    }

    this.state = frozenState(
      phase,
      firstChunkAccepted,
      finalChunkAccepted,
      this.state.playbackStarted,
    );

    return result(
      true,
      'accepted',
      this.state,
      chunkDecision,
    );
  }

  confirmPlaybackStarted(): TtsLifecycleResult {
    if (
      this.state.phase === 'cancelled' ||
      this.state.phase === 'failed' ||
      this.state.phase === 'playback_complete'
    ) {
      return result(false, 'lifecycle_closed', this.state);
    }

    if (!this.state.firstChunkAccepted) {
      return result(false, 'first_audio_required', this.state);
    }

    if (this.state.playbackStarted) {
      return result(true, 'idempotent', this.state);
    }

    this.state = frozenState(
      this.state.finalChunkAccepted
        ? 'stream_received'
        : 'playback_started',
      true,
      this.state.finalChunkAccepted,
      true,
    );

    return result(true, 'accepted', this.state);
  }

  confirmPlaybackComplete(): TtsLifecycleResult {
    if (this.state.phase === 'playback_complete') {
      return result(true, 'idempotent', this.state);
    }

    if (
      this.state.phase === 'cancelled' ||
      this.state.phase === 'failed'
    ) {
      return result(false, 'lifecycle_closed', this.state);
    }

    if (!this.state.playbackStarted) {
      return result(false, 'first_audio_required', this.state);
    }

    if (!this.state.finalChunkAccepted) {
      return result(false, 'final_chunk_required', this.state);
    }

    this.state = frozenState(
      'playback_complete',
      true,
      true,
      true,
    );

    return result(true, 'accepted', this.state);
  }

  cancel(): TtsLifecycleResult {
    if (this.state.phase === 'cancelled') {
      return result(true, 'idempotent', this.state);
    }

    if (this.state.phase === 'playback_complete') {
      return result(false, 'lifecycle_closed', this.state);
    }

    this.state = frozenState(
      'cancelled',
      this.state.firstChunkAccepted,
      this.state.finalChunkAccepted,
      this.state.playbackStarted,
    );

    return result(true, 'accepted', this.state);
  }

  fail(): TtsLifecycleResult {
    if (this.state.phase === 'failed') {
      return result(true, 'idempotent', this.state);
    }

    if (
      this.state.phase === 'cancelled' ||
      this.state.phase === 'playback_complete'
    ) {
      return result(false, 'lifecycle_closed', this.state);
    }

    this.state = frozenState(
      'failed',
      this.state.firstChunkAccepted,
      this.state.finalChunkAccepted,
      this.state.playbackStarted,
    );

    return result(true, 'accepted', this.state);
  }
}
