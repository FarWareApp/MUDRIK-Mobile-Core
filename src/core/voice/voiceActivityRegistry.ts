import type { VoiceActivityEvent } from './voiceActivityEvent';

export type VoiceActivityDecision = Readonly<{
  accepted: boolean;
  idempotent: boolean;
  reason:
    | 'accepted'
    | 'idempotent_duplicate'
    | 'wrong_session'
    | 'stale_generation'
    | 'future_generation'
    | 'stale_sequence'
    | 'sequence_conflict'
    | 'non_monotonic_time';
}>;

function equalEvent(
  a: VoiceActivityEvent,
  b: VoiceActivityEvent,
): boolean {
  return (
    a.sessionId === b.sessionId &&
    a.generation === b.generation &&
    a.sequence === b.sequence &&
    a.atMs === b.atMs &&
    a.speechActive === b.speechActive &&
    a.confidence === b.confidence
  );
}

export class VoiceActivityRegistry {
  private last: VoiceActivityEvent | null = null;

  constructor(
    private readonly expectedSessionId: string,
    private readonly expectedGeneration = 0,
  ) {}

  apply(event: VoiceActivityEvent): VoiceActivityDecision {
    if (event.sessionId !== this.expectedSessionId) {
      return {
        accepted: false,
        idempotent: false,
        reason: 'wrong_session',
      };
    }

    if (event.generation < this.expectedGeneration) {
      return {
        accepted: false,
        idempotent: false,
        reason: 'stale_generation',
      };
    }

    if (event.generation > this.expectedGeneration) {
      return {
        accepted: false,
        idempotent: false,
        reason: 'future_generation',
      };
    }

    if (!this.last) {
      this.last = event;
      return {
        accepted: true,
        idempotent: false,
        reason: 'accepted',
      };
    }

    if (event.sequence < this.last.sequence) {
      return {
        accepted: false,
        idempotent: false,
        reason: 'stale_sequence',
      };
    }

    if (event.sequence === this.last.sequence) {
      if (equalEvent(this.last, event)) {
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

    if (event.atMs < this.last.atMs) {
      return {
        accepted: false,
        idempotent: false,
        reason: 'non_monotonic_time',
      };
    }

    this.last = event;
    return {
      accepted: true,
      idempotent: false,
      reason: 'accepted',
    };
  }

  getLast(): VoiceActivityEvent | null {
    return this.last;
  }
}
