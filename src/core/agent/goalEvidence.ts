import {
  exactObject,
  safeInteger,
  safeReasonCode,
  safeReference,
} from '../brain/brainSecurity';

import {
  GOAL_ID,
  GOAL_PLAN_ID,
  GOAL_STEP_ID,
} from './goalContract';

const BODY =
  '[a-z0-9][a-z0-9_-]{15,127}';

const GOAL_EVENT_ID =
  new RegExp('^goal_event_' + BODY + '$');

export type GoalEvidenceKind =
  | 'execution_started'
  | 'step_started'
  | 'step_succeeded'
  | 'step_failed'
  | 'repair_started'
  | 'repair_completed'
  | 'verification_passed'
  | 'verification_failed'
  | 'finalized'
  | 'blocked'
  | 'cancelled';

export type GoalEvidenceEvent =
  Readonly<{
    protocolVersion: '1.0';
    eventId: string;
    goalId: string;
    planId: string;
    stepId: string | null;
    kind: GoalEvidenceKind;
    sequence: number;
    previousEventId: string | null;
    evidenceRef: string | null;
    reasonCode: string | null;
    observedAtMs: number;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

const KINDS =
  new Set<GoalEvidenceKind>([
    'execution_started',
    'step_started',
    'step_succeeded',
    'step_failed',
    'repair_started',
    'repair_completed',
    'verification_passed',
    'verification_failed',
    'finalized',
    'blocked',
    'cancelled',
  ]);

const KEYS =
  new Set([
    'protocolVersion',
    'eventId',
    'goalId',
    'planId',
    'stepId',
    'kind',
    'sequence',
    'previousEventId',
    'evidenceRef',
    'reasonCode',
    'observedAtMs',
    'grantsExecutionAuthority',
    'grantsSensorAuthority',
    'grantsApprovalAuthority',
    'grantsCapabilityAuthority',
  ]);

function hasAuthority(
  record: Record<string, unknown>,
): boolean {
  return !(
    record.grantsExecutionAuthority === false
    && record.grantsSensorAuthority === false
    && record.grantsApprovalAuthority === false
    && record.grantsCapabilityAuthority === false
  );
}

function requiresEvidence(
  kind: GoalEvidenceKind,
): boolean {
  return [
    'step_succeeded',
    'repair_completed',
    'verification_passed',
    'finalized',
  ].includes(kind);
}

function requiresReason(
  kind: GoalEvidenceKind,
): boolean {
  return [
    'step_failed',
    'verification_failed',
    'blocked',
  ].includes(kind);
}

function stepRequired(
  kind: GoalEvidenceKind,
): boolean {
  return [
    'step_started',
    'step_succeeded',
    'step_failed',
    'repair_started',
    'repair_completed',
    'verification_passed',
    'verification_failed',
  ].includes(kind);
}

export function parseGoalEvidenceEvent(
  input: unknown,
): GoalEvidenceEvent | null {
  const record = exactObject(input, KEYS);

  if (
    !record
    || record.protocolVersion !== '1.0'
    || typeof record.eventId !== 'string'
    || !GOAL_EVENT_ID.test(record.eventId)
    || typeof record.goalId !== 'string'
    || !GOAL_ID.test(record.goalId)
    || typeof record.planId !== 'string'
    || !GOAL_PLAN_ID.test(record.planId)
    || (
      record.stepId !== null
      && (
        typeof record.stepId !== 'string'
        || !GOAL_STEP_ID.test(record.stepId)
      )
    )
    || typeof record.kind !== 'string'
    || !KINDS.has(record.kind as GoalEvidenceKind)
    || !safeInteger(record.sequence)
    || (
      record.previousEventId !== null
      && (
        typeof record.previousEventId !== 'string'
        || !GOAL_EVENT_ID.test(record.previousEventId)
      )
    )
    || (
      record.evidenceRef !== null
      && !safeReference(record.evidenceRef, 240)
    )
    || (
      record.reasonCode !== null
      && !safeReasonCode(record.reasonCode)
    )
    || !safeInteger(record.observedAtMs)
    || hasAuthority(record)
  ) {
    return null;
  }

  const kind =
    record.kind as GoalEvidenceKind;
  const stepId = record.stepId as string | null;
  const evidenceRef =
    record.evidenceRef as string | null;
  const reasonCode =
    record.reasonCode as string | null;

  if (
    stepRequired(kind)
      ? stepId === null
      : stepId !== null
  ) {
    return null;
  }

  if (
    requiresEvidence(kind)
      ? evidenceRef === null
      : (
          kind !== 'step_started'
          && kind !== 'execution_started'
          && kind !== 'repair_started'
          && kind !== 'cancelled'
          && kind !== 'blocked'
          && kind !== 'step_failed'
          && kind !== 'verification_failed'
        )
  ) {
    return null;
  }

  if (
    !requiresEvidence(kind)
    && evidenceRef !== null
    && ![
      'step_failed',
      'verification_failed',
      'blocked',
      'cancelled',
    ].includes(kind)
  ) {
    return null;
  }

  if (
    requiresReason(kind)
      ? reasonCode === null
      : (
          reasonCode !== null
          && kind !== 'cancelled'
        )
  ) {
    return null;
  }

  return Object.freeze({
    protocolVersion: '1.0',
    eventId: record.eventId as string,
    goalId: record.goalId as string,
    planId: record.planId as string,
    stepId,
    kind,
    sequence: record.sequence as number,
    previousEventId:
      record.previousEventId as string | null,
    evidenceRef,
    reasonCode,
    observedAtMs: record.observedAtMs as number,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}

export type GoalEvidenceAcceptResult =
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
      | 'chain_mismatch'
      | 'time_rollback'
      | 'lifecycle_closed';
  }>;

function sameEvent(
  left: GoalEvidenceEvent,
  right: GoalEvidenceEvent,
): boolean {
  return (
    left.eventId === right.eventId
    && left.goalId === right.goalId
    && left.planId === right.planId
    && left.stepId === right.stepId
    && left.kind === right.kind
    && left.sequence === right.sequence
    && left.previousEventId === right.previousEventId
    && left.evidenceRef === right.evidenceRef
    && left.reasonCode === right.reasonCode
    && left.observedAtMs === right.observedAtMs
  );
}

function acceptResult(
  accepted: boolean,
  idempotent: boolean,
  reason: GoalEvidenceAcceptResult['reason'],
): GoalEvidenceAcceptResult {
  return Object.freeze({
    accepted,
    idempotent,
    reason,
  });
}

export class GoalEvidenceRegistry {
  private readonly events =
    new Map<number, GoalEvidenceEvent>();

  private nextSequence = 0;
  private lastEventId: string | null = null;
  private lastObservedAtMs: number | null = null;
  private closed = false;

  constructor(
    private readonly goalId: string,
    private readonly planId: string,
  ) {
    if (
      !GOAL_ID.test(goalId)
      || !GOAL_PLAN_ID.test(planId)
    ) {
      throw new TypeError(
        'Invalid goal evidence registry identity.',
      );
    }
  }

  accept(
    input: unknown,
  ): GoalEvidenceAcceptResult {
    const event =
      parseGoalEvidenceEvent(input);

    if (!event) {
      return acceptResult(
        false,
        false,
        'invalid_event',
      );
    }

    if (
      event.goalId !== this.goalId
      || event.planId !== this.planId
    ) {
      return acceptResult(
        false,
        false,
        'identity_mismatch',
      );
    }

    const previous =
      this.events.get(event.sequence);

    if (previous) {
      return sameEvent(previous, event)
        ? acceptResult(
            true,
            true,
            'idempotent',
          )
        : acceptResult(
            false,
            false,
            'sequence_conflict',
          );
    }

    if (this.closed) {
      return acceptResult(
        false,
        false,
        'lifecycle_closed',
      );
    }

    if (event.sequence !== this.nextSequence) {
      return acceptResult(
        false,
        false,
        'sequence_gap',
      );
    }

    if (
      event.sequence === 0
        ? event.previousEventId !== null
        : event.previousEventId !== this.lastEventId
    ) {
      return acceptResult(
        false,
        false,
        'chain_mismatch',
      );
    }

    if (
      this.lastObservedAtMs !== null
      && event.observedAtMs < this.lastObservedAtMs
    ) {
      return acceptResult(
        false,
        false,
        'time_rollback',
      );
    }

    this.events.set(
      event.sequence,
      event,
    );
    this.nextSequence += 1;
    this.lastEventId = event.eventId;
    this.lastObservedAtMs =
      event.observedAtMs;

    if (
      event.kind === 'finalized'
      || event.kind === 'blocked'
      || event.kind === 'cancelled'
    ) {
      this.closed = true;
    }

    return acceptResult(
      true,
      false,
      'accepted',
    );
  }

  getEvents():
    readonly GoalEvidenceEvent[] {
    return Object.freeze(
      [...this.events.values()],
    );
  }

  isClosed(): boolean {
    return this.closed;
  }
}
