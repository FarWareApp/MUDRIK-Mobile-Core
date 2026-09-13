import type { StreamingTtsChunkMetadata } from './voiceProviderContracts';

export type TtsChunkDecision = Readonly<{
  accepted: boolean;
  idempotent: boolean;
  reason:
    | 'accepted'
    | 'idempotent_duplicate'
    | 'wrong_session'
    | 'wrong_generation'
    | 'wrong_utterance'
    | 'stale_sequence'
    | 'sequence_conflict'
    | 'already_finalized';
}>;

function equalChunk(
  a: StreamingTtsChunkMetadata,
  b: StreamingTtsChunkMetadata,
): boolean {
  return (
    a.sessionId === b.sessionId &&
    a.generation === b.generation &&
    a.utteranceId === b.utteranceId &&
    a.sequence === b.sequence &&
    a.payloadRef === b.payloadRef &&
    a.isFinal === b.isFinal
  );
}

export class TtsChunkRegistry {
  private last: StreamingTtsChunkMetadata | null = null;

  constructor(
    private readonly expectedSessionId: string,
    private readonly expectedGeneration: number,
    private readonly expectedUtteranceId: string,
  ) {}

  apply(
    chunk: StreamingTtsChunkMetadata,
  ): TtsChunkDecision {
    if (chunk.sessionId !== this.expectedSessionId) {
      return {
        accepted: false,
        idempotent: false,
        reason: 'wrong_session',
      };
    }

    if (chunk.generation !== this.expectedGeneration) {
      return {
        accepted: false,
        idempotent: false,
        reason: 'wrong_generation',
      };
    }

    if (chunk.utteranceId !== this.expectedUtteranceId) {
      return {
        accepted: false,
        idempotent: false,
        reason: 'wrong_utterance',
      };
    }

    if (!this.last) {
      this.last = chunk;
      return {
        accepted: true,
        idempotent: false,
        reason: 'accepted',
      };
    }

    if (chunk.sequence < this.last.sequence) {
      return {
        accepted: false,
        idempotent: false,
        reason: 'stale_sequence',
      };
    }

    if (chunk.sequence === this.last.sequence) {
      if (equalChunk(this.last, chunk)) {
        return {
          accepted: true,
          idempotent: true,
          reason: 'idempotent_duplicate',
        };
      }

      return {
        accepted: false,
        idempotent: false,
        reason: 'sequence_conflict',
      };
    }

    if (this.last.isFinal) {
      return {
        accepted: false,
        idempotent: false,
        reason: 'already_finalized',
      };
    }

    this.last = chunk;
    return {
      accepted: true,
      idempotent: false,
      reason: 'accepted',
    };
  }
}
