import type { StreamingSpeechSegment } from './streamingSpeech';

export type SpeechRegistryDecision = Readonly<{
  accepted: boolean;
  idempotent: boolean;
  reason:
    | 'accepted'
    | 'idempotent_duplicate'
    | 'wrong_session'
    | 'stale_sequence'
    | 'sequence_conflict'
    | 'already_finalized';
}>;

function equalSegments(
  a: StreamingSpeechSegment,
  b: StreamingSpeechSegment,
): boolean {
  return (
    a.sessionId === b.sessionId &&
    a.segmentId === b.segmentId &&
    a.sequence === b.sequence &&
    a.kind === b.kind &&
    a.text === b.text &&
    a.confidence === b.confidence &&
    a.stability === b.stability &&
    a.startedAtMs === b.startedAtMs &&
    a.endedAtMs === b.endedAtMs &&
    a.languageTags.length === b.languageTags.length &&
    a.languageTags.every(
      (tag, index) => tag === b.languageTags[index],
    )
  );
}

export class SpeechSegmentRegistry {
  private readonly segments =
    new Map<string, StreamingSpeechSegment>();

  constructor(
    private readonly expectedSessionId: string,
  ) {}

  apply(
    segment: StreamingSpeechSegment,
  ): SpeechRegistryDecision {
    if (segment.sessionId !== this.expectedSessionId) {
      return {
        accepted: false,
        idempotent: false,
        reason: 'wrong_session',
      };
    }

    const previous =
      this.segments.get(segment.segmentId);

    if (!previous) {
      this.segments.set(segment.segmentId, segment);
      return {
        accepted: true,
        idempotent: false,
        reason: 'accepted',
      };
    }

    if (segment.sequence < previous.sequence) {
      return {
        accepted: false,
        idempotent: false,
        reason: 'stale_sequence',
      };
    }

    if (segment.sequence === previous.sequence) {
      if (equalSegments(previous, segment)) {
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

    if (previous.kind === 'final') {
      return {
        accepted: false,
        idempotent: false,
        reason: 'already_finalized',
      };
    }

    this.segments.set(segment.segmentId, segment);
    return {
      accepted: true,
      idempotent: false,
      reason: 'accepted',
    };
  }

  getFinal(
    segmentId: string,
  ): StreamingSpeechSegment | null {
    const segment = this.segments.get(segmentId);
    return segment?.kind === 'final'
      ? segment
      : null;
  }
}
