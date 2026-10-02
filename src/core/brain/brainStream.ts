import {
  parseBrainInputEnvelope,
  parseBrainOutputEvent,
  type BrainInputEnvelope,
  type BrainOutputEvent,
} from './brainEnvelope';

export type BrainStreamPhase =
  | 'processing'
  | 'streaming'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type BrainStreamState =
  Readonly<{
    phase: BrainStreamPhase;
    nextSequence: number;
    eventCount: number;
    lastObservedAtMs: number | null;
    finalEventId: string | null;
  }>;

export type BrainStreamResult =
  Readonly<{
    accepted: boolean;
    idempotent: boolean;
    reason:
      | 'accepted'
      | 'idempotent'
      | 'invalid_event'
      | 'identity_mismatch'
      | 'sequence_gap'
      | 'sequence_conflict'
      | 'time_rollback'
      | 'deadline_exceeded'
      | 'lifecycle_closed';
    state: BrainStreamState;
  }>;

function state(
  phase: BrainStreamPhase,
  nextSequence: number,
  eventCount: number,
  lastObservedAtMs: number | null,
  finalEventId: string | null,
): BrainStreamState {
  return Object.freeze({
    phase,
    nextSequence,
    eventCount,
    lastObservedAtMs,
    finalEventId,
  });
}

function result(
  accepted: boolean,
  idempotent: boolean,
  reason: BrainStreamResult['reason'],
  value: BrainStreamState,
): BrainStreamResult {
  return Object.freeze({
    accepted,
    idempotent,
    reason,
    state: value,
  });
}

function sameEvent(
  left: BrainOutputEvent,
  right: BrainOutputEvent,
): boolean {
  return (
    left.eventId === right.eventId
    && left.requestId === right.requestId
    && left.sessionId === right.sessionId
    && left.traceId === right.traceId
    && left.conversationId === right.conversationId
    && left.kind === right.kind
    && left.sequence === right.sequence
    && left.payloadRef === right.payloadRef
    && left.reasonCode === right.reasonCode
    && left.isFinal === right.isFinal
    && left.observedAtMs === right.observedAtMs
  );
}

export class BrainStreamTracker {
  private readonly request: BrainInputEnvelope;

  private current: BrainStreamState =
    state('processing', 0, 0, null, null);

  private readonly bySequence =
    new Map<number, BrainOutputEvent>();

  constructor(
    requestInput: unknown,
  ) {
    const request =
      parseBrainInputEnvelope(requestInput);

    if (!request) {
      throw new TypeError(
        'Invalid brain request envelope.',
      );
    }

    this.request = request;
  }

  getRequest(): BrainInputEnvelope {
    return this.request;
  }

  getState(): BrainStreamState {
    return this.current;
  }

  accept(
    eventInput: unknown,
  ): BrainStreamResult {
    const event =
      parseBrainOutputEvent(eventInput);

    if (!event) {
      return result(
        false,
        false,
        'invalid_event',
        this.current,
      );
    }

    if (
      event.requestId !== this.request.requestId
      || event.sessionId !== this.request.sessionId
      || event.traceId !== this.request.traceId
      || event.conversationId
        !== this.request.conversationId
    ) {
      return result(
        false,
        false,
        'identity_mismatch',
        this.current,
      );
    }

    const previous =
      this.bySequence.get(event.sequence);

    if (previous) {
      return sameEvent(previous, event)
        ? result(
            true,
            true,
            'idempotent',
            this.current,
          )
        : result(
            false,
            false,
            'sequence_conflict',
            this.current,
          );
    }

    if (
      this.current.phase === 'completed'
      || this.current.phase === 'failed'
      || this.current.phase === 'cancelled'
    ) {
      return result(
        false,
        false,
        'lifecycle_closed',
        this.current,
      );
    }

    if (
      event.sequence !== this.current.nextSequence
    ) {
      return result(
        false,
        false,
        'sequence_gap',
        this.current,
      );
    }

    const lowerBound =
      this.current.lastObservedAtMs
        ?? this.request.createdAtMs;

    if (event.observedAtMs < lowerBound) {
      return result(
        false,
        false,
        'time_rollback',
        this.current,
      );
    }

    if (
      this.request.deadlineAtMs !== null
      && event.observedAtMs
        > this.request.deadlineAtMs
      && !(
        event.kind === 'error'
        && event.reasonCode === 'deadline_exceeded'
        && event.isFinal
      )
    ) {
      return result(
        false,
        false,
        'deadline_exceeded',
        this.current,
      );
    }

    this.bySequence.set(
      event.sequence,
      event,
    );

    const finalPhase =
      event.kind === 'error'
        ? 'failed'
        : 'completed';

    this.current =
      state(
        event.isFinal
          ? finalPhase
          : 'streaming',
        event.sequence + 1,
        this.current.eventCount + 1,
        event.observedAtMs,
        event.isFinal
          ? event.eventId
          : null,
      );

    return result(
      true,
      false,
      'accepted',
      this.current,
    );
  }

  cancel(): BrainStreamResult {
    if (this.current.phase === 'cancelled') {
      return result(
        true,
        true,
        'idempotent',
        this.current,
      );
    }

    if (
      this.current.phase === 'completed'
      || this.current.phase === 'failed'
    ) {
      return result(
        false,
        false,
        'lifecycle_closed',
        this.current,
      );
    }

    this.current =
      state(
        'cancelled',
        this.current.nextSequence,
        this.current.eventCount,
        this.current.lastObservedAtMs,
        null,
      );

    return result(
      true,
      false,
      'accepted',
      this.current,
    );
  }
}
