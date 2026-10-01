import {
  parseIntelligenceAdapterOutputEvent,
  type IntelligenceAdapterOutputEvent,
} from './intelligenceAdapter';

import {
  parseIntelligenceRoutePlan,
  type IntelligenceRoutePlan,
} from './intelligenceRouting';

import {
  INTELLIGENCE_MODEL_REF,
  INTELLIGENCE_PROVIDER_REF,
  safeInteger,
} from './intelligenceSecurity';

export type IntelligenceAttemptState =
  Readonly<{
    phase:
      | 'awaiting_output'
      | 'streaming'
      | 'completed'
      | 'cancelled'
      | 'failed';
    nextSequence: number;
    outputObserved: boolean;
    finalObserved: boolean;
  }>;

export type IntelligenceAttemptResult =
  Readonly<{
    accepted: boolean;
    idempotent: boolean;
    reason:
      | 'accepted'
      | 'idempotent'
      | 'invalid_input'
      | 'identity_mismatch'
      | 'sequence_gap'
      | 'sequence_conflict'
      | 'plan_invalidated'
      | 'lifecycle_closed';
    state: IntelligenceAttemptState;
  }>;

function frozenState(
  phase: IntelligenceAttemptState['phase'],
  nextSequence: number,
  outputObserved: boolean,
  finalObserved: boolean,
): IntelligenceAttemptState {
  return Object.freeze({
    phase,
    nextSequence,
    outputObserved,
    finalObserved,
  });
}

function result(
  accepted: boolean,
  idempotent: boolean,
  reason: IntelligenceAttemptResult['reason'],
  state: IntelligenceAttemptState,
): IntelligenceAttemptResult {
  return Object.freeze({
    accepted,
    idempotent,
    reason,
    state,
  });
}

function sameEvent(
  left: IntelligenceAdapterOutputEvent,
  right: IntelligenceAdapterOutputEvent,
): boolean {
  return (
    left.requestId === right.requestId
    && left.planId === right.planId
    && left.providerRef === right.providerRef
    && left.modelRef === right.modelRef
    && left.service === right.service
    && left.generation === right.generation
    && left.sequence === right.sequence
    && left.resultRef === right.resultRef
    && left.isFinal === right.isFinal
    && left.observedAtMs === right.observedAtMs
  );
}

export class IntelligenceAttemptTracker {
  private state:
    IntelligenceAttemptState =
      frozenState(
        'awaiting_output',
        0,
        false,
        false,
      );

  private readonly accepted =
    new Map<
      number,
      IntelligenceAdapterOutputEvent
    >();

  private readonly plan:
    IntelligenceRoutePlan;

  constructor(
    planInput: unknown,
    private readonly providerRef: string,
    private readonly modelRef: string,
    private readonly generation: number,
    private readonly isPlanCurrent:
      (() => boolean) | null = null,
  ) {
    const plan =
      parseIntelligenceRoutePlan(
        planInput,
      );

    if (
      !plan
      || !INTELLIGENCE_PROVIDER_REF.test(
        providerRef,
      )
      || !INTELLIGENCE_MODEL_REF.test(
        modelRef,
      )
      || !safeInteger(generation)
      || ![
        ...(plan.primary
          ? [plan.primary]
          : []),
        ...plan.fallbacks,
      ].some(
        (candidate) =>
          candidate.providerRef
            === providerRef
          && candidate.modelRef
            === modelRef,
      )
    ) {
      throw new Error(
        'Invalid intelligence attempt identity.',
      );
    }

    this.plan = plan;
  }

  getState():
    IntelligenceAttemptState {
    return this.state;
  }

  acceptOutput(
    input: unknown,
  ): IntelligenceAttemptResult {
    if (this.isPlanCurrent) {
      let current = false;

      try {
        current = this.isPlanCurrent();
      } catch {
        current = false;
      }

      if (!current) {
        return result(
          false,
          false,
          'plan_invalidated',
          this.state,
        );
      }
    }

    const event =
      parseIntelligenceAdapterOutputEvent(
        input,
      );

    if (!event) {
      return result(
        false,
        false,
        'invalid_input',
        this.state,
      );
    }

    if (
      event.requestId
        !== this.plan.requestId
      || event.planId
        !== this.plan.planId
      || event.providerRef
        !== this.providerRef
      || event.modelRef
        !== this.modelRef
      || event.service
        !== this.plan.service
      || event.generation
        !== this.generation
      || event.observedAtMs
        < this.plan.generatedAtMs
    ) {
      return result(
        false,
        false,
        'identity_mismatch',
        this.state,
      );
    }

    const previous =
      this.accepted.get(
        event.sequence,
      );

    if (previous) {
      return sameEvent(
        previous,
        event,
      )
        ? result(
            true,
            true,
            'idempotent',
            this.state,
          )
        : result(
            false,
            false,
            'sequence_conflict',
            this.state,
          );
    }

    if (
      this.state.phase === 'completed'
      || this.state.phase === 'cancelled'
      || this.state.phase === 'failed'
    ) {
      return result(
        false,
        false,
        'lifecycle_closed',
        this.state,
      );
    }

    if (
      event.sequence
        !== this.state.nextSequence
    ) {
      return result(
        false,
        false,
        'sequence_gap',
        this.state,
      );
    }

    this.accepted.set(
      event.sequence,
      event,
    );

    const nextSequence =
      event.sequence + 1;

    this.state =
      frozenState(
        event.isFinal
          ? 'completed'
          : 'streaming',
        nextSequence,
        true,
        event.isFinal,
      );

    return result(
      true,
      false,
      'accepted',
      this.state,
    );
  }

  cancel():
    IntelligenceAttemptResult {
    if (
      this.state.phase === 'cancelled'
    ) {
      return result(
        true,
        true,
        'idempotent',
        this.state,
      );
    }

    if (
      this.state.phase === 'completed'
      || this.state.phase === 'failed'
    ) {
      return result(
        false,
        false,
        'lifecycle_closed',
        this.state,
      );
    }

    this.state =
      frozenState(
        'cancelled',
        this.state.nextSequence,
        this.state.outputObserved,
        this.state.finalObserved,
      );

    return result(
      true,
      false,
      'accepted',
      this.state,
    );
  }

  fail():
    IntelligenceAttemptResult {
    if (
      this.state.phase === 'failed'
    ) {
      return result(
        true,
        true,
        'idempotent',
        this.state,
      );
    }

    if (
      this.state.phase === 'completed'
      || this.state.phase
        === 'cancelled'
    ) {
      return result(
        false,
        false,
        'lifecycle_closed',
        this.state,
      );
    }

    this.state =
      frozenState(
        'failed',
        this.state.nextSequence,
        this.state.outputObserved,
        this.state.finalObserved,
      );

    return result(
      true,
      false,
      'accepted',
      this.state,
    );
  }
}
