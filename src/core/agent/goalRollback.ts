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

const ROLLBACK_ID =
  new RegExp('^goal_rollback_' + BODY + '$');

const LEASE_ID =
  new RegExp('^goal_lease_' + BODY + '$');

export type GoalRollbackRegistration =
  Readonly<{
    protocolVersion: '1.0';
    rollbackId: string;
    goalId: string;
    planId: string;
    stepId: string;
    sourceLeaseId: string;
    rollbackRef: string;
    generation: number;
    registeredAtMs: number;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

export type GoalRollbackStatus =
  | 'armed'
  | 'required'
  | 'executing'
  | 'failed'
  | 'resolved';

export type GoalRollbackState =
  Readonly<{
    registration: GoalRollbackRegistration;
    status: GoalRollbackStatus;
    reasonCode: string | null;
    attempt: number;
    evidenceRef: string | null;
    updatedAtMs: number;
  }>;

const REGISTRATION_KEYS =
  new Set([
    'protocolVersion',
    'rollbackId',
    'goalId',
    'planId',
    'stepId',
    'sourceLeaseId',
    'rollbackRef',
    'generation',
    'registeredAtMs',
    'grantsExecutionAuthority',
    'grantsSensorAuthority',
    'grantsApprovalAuthority',
    'grantsCapabilityAuthority',
  ]);

export function parseGoalRollbackRegistration(
  input: unknown,
): GoalRollbackRegistration | null {
  const record =
    exactObject(input, REGISTRATION_KEYS);

  if (
    !record
    || record.protocolVersion !== '1.0'
    || typeof record.rollbackId !== 'string'
    || !ROLLBACK_ID.test(record.rollbackId)
    || typeof record.goalId !== 'string'
    || !GOAL_ID.test(record.goalId)
    || typeof record.planId !== 'string'
    || !GOAL_PLAN_ID.test(record.planId)
    || typeof record.stepId !== 'string'
    || !GOAL_STEP_ID.test(record.stepId)
    || typeof record.sourceLeaseId !== 'string'
    || !LEASE_ID.test(record.sourceLeaseId)
    || !safeReference(record.rollbackRef, 240)
    || !safeInteger(record.generation)
    || !safeInteger(record.registeredAtMs)
    || record.grantsExecutionAuthority !== false
    || record.grantsSensorAuthority !== false
    || record.grantsApprovalAuthority !== false
    || record.grantsCapabilityAuthority !== false
  ) {
    return null;
  }

  return Object.freeze({
    protocolVersion: '1.0',
    rollbackId: record.rollbackId as string,
    goalId: record.goalId as string,
    planId: record.planId as string,
    stepId: record.stepId as string,
    sourceLeaseId:
      record.sourceLeaseId as string,
    rollbackRef: record.rollbackRef as string,
    generation: record.generation as number,
    registeredAtMs:
      record.registeredAtMs as number,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}

export type GoalRollbackMutationResult =
  Readonly<{
    accepted: boolean;
    idempotent: boolean;
    reason:
      | 'accepted'
      | 'idempotent'
      | 'invalid_input'
      | 'duplicate_conflict'
      | 'time_invalid'
      | 'invalid_state'
      | 'attempt_mismatch'
      | 'not_found';
    state: GoalRollbackState | null;
  }>;

function frozenState(
  registration: GoalRollbackRegistration,
  status: GoalRollbackStatus,
  reasonCode: string | null,
  attempt: number,
  evidenceRef: string | null,
  updatedAtMs: number,
): GoalRollbackState {
  return Object.freeze({
    registration,
    status,
    reasonCode,
    attempt,
    evidenceRef,
    updatedAtMs,
  });
}

function result(
  accepted: boolean,
  idempotent: boolean,
  reason: GoalRollbackMutationResult['reason'],
  state: GoalRollbackState | null,
): GoalRollbackMutationResult {
  return Object.freeze({
    accepted,
    idempotent,
    reason,
    state,
  });
}

function sameRegistration(
  left: GoalRollbackRegistration,
  right: GoalRollbackRegistration,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export class GoalRollbackRegistry {
  private readonly byId =
    new Map<string, GoalRollbackState>();
  private readonly bySourceLease =
    new Map<string, string>();

  register(
    input: unknown,
    trustedNowMs: number,
  ): GoalRollbackMutationResult {
    const registration =
      parseGoalRollbackRegistration(input);

    if (
      !registration
      || !safeInteger(trustedNowMs)
      || registration.registeredAtMs > trustedNowMs
    ) {
      return result(
        false,
        false,
        'invalid_input',
        null,
      );
    }

    const existing =
      this.byId.get(registration.rollbackId);

    if (existing) {
      return sameRegistration(
        existing.registration,
        registration,
      )
        ? result(
            true,
            true,
            'idempotent',
            existing,
          )
        : result(
            false,
            false,
            'duplicate_conflict',
            existing,
          );
    }

    const boundId =
      this.bySourceLease.get(
        registration.sourceLeaseId,
      );

    if (boundId && boundId !== registration.rollbackId) {
      return result(
        false,
        false,
        'duplicate_conflict',
        this.byId.get(boundId) ?? null,
      );
    }

    const state =
      frozenState(
        registration,
        'armed',
        null,
        0,
        null,
        registration.registeredAtMs,
      );

    this.byId.set(
      registration.rollbackId,
      state,
    );
    this.bySourceLease.set(
      registration.sourceLeaseId,
      registration.rollbackId,
    );

    return result(
      true,
      false,
      'accepted',
      state,
    );
  }

  require(
    rollbackId: string,
    reasonCode: string,
    trustedNowMs: number,
  ): GoalRollbackMutationResult {
    const current = this.byId.get(rollbackId);

    if (!current) {
      return result(
        false,
        false,
        'not_found',
        null,
      );
    }

    if (
      !safeReasonCode(reasonCode)
      || !safeInteger(trustedNowMs)
      || trustedNowMs < current.updatedAtMs
    ) {
      return result(
        false,
        false,
        'time_invalid',
        current,
      );
    }

    if (current.status === 'required') {
      return current.reasonCode === reasonCode
        ? result(
            true,
            true,
            'idempotent',
            current,
          )
        : result(
            false,
            false,
            'duplicate_conflict',
            current,
          );
    }

    if (current.status !== 'armed') {
      return result(
        false,
        false,
        'invalid_state',
        current,
      );
    }

    const next =
      frozenState(
        current.registration,
        'required',
        reasonCode,
        current.attempt,
        null,
        trustedNowMs,
      );

    this.byId.set(rollbackId, next);

    return result(
      true,
      false,
      'accepted',
      next,
    );
  }

  start(
    rollbackId: string,
    attempt: number,
    trustedNowMs: number,
  ): GoalRollbackMutationResult {
    const current = this.byId.get(rollbackId);

    if (!current) {
      return result(
        false,
        false,
        'not_found',
        null,
      );
    }

    if (
      !safeInteger(attempt)
      || attempt < 1
      || attempt > 32
      || !safeInteger(trustedNowMs)
      || trustedNowMs < current.updatedAtMs
    ) {
      return result(
        false,
        false,
        'time_invalid',
        current,
      );
    }

    if (
      current.status !== 'required'
      && current.status !== 'failed'
    ) {
      return result(
        false,
        false,
        'invalid_state',
        current,
      );
    }

    if (attempt !== current.attempt + 1) {
      return result(
        false,
        false,
        'attempt_mismatch',
        current,
      );
    }

    const next =
      frozenState(
        current.registration,
        'executing',
        current.reasonCode,
        attempt,
        null,
        trustedNowMs,
      );

    this.byId.set(rollbackId, next);

    return result(
      true,
      false,
      'accepted',
      next,
    );
  }

  succeed(
    rollbackId: string,
    attempt: number,
    evidenceRef: string,
    trustedNowMs: number,
  ): GoalRollbackMutationResult {
    const current = this.byId.get(rollbackId);

    if (!current) {
      return result(
        false,
        false,
        'not_found',
        null,
      );
    }

    if (
      !safeReference(evidenceRef, 240)
      || !safeInteger(trustedNowMs)
      || trustedNowMs < current.updatedAtMs
    ) {
      return result(
        false,
        false,
        'time_invalid',
        current,
      );
    }

    if (
      current.status === 'resolved'
      && current.attempt === attempt
      && current.evidenceRef === evidenceRef
    ) {
      return result(
        true,
        true,
        'idempotent',
        current,
      );
    }

    if (
      current.status !== 'executing'
      || current.attempt !== attempt
    ) {
      return result(
        false,
        false,
        'attempt_mismatch',
        current,
      );
    }

    const next =
      frozenState(
        current.registration,
        'resolved',
        current.reasonCode,
        attempt,
        evidenceRef,
        trustedNowMs,
      );

    this.byId.set(rollbackId, next);

    return result(
      true,
      false,
      'accepted',
      next,
    );
  }

  fail(
    rollbackId: string,
    attempt: number,
    reasonCode: string,
    trustedNowMs: number,
  ): GoalRollbackMutationResult {
    const current = this.byId.get(rollbackId);

    if (!current) {
      return result(
        false,
        false,
        'not_found',
        null,
      );
    }

    if (
      !safeReasonCode(reasonCode)
      || !safeInteger(trustedNowMs)
      || trustedNowMs < current.updatedAtMs
    ) {
      return result(
        false,
        false,
        'time_invalid',
        current,
      );
    }

    if (
      current.status !== 'executing'
      || current.attempt !== attempt
    ) {
      return result(
        false,
        false,
        'attempt_mismatch',
        current,
      );
    }

    const next =
      frozenState(
        current.registration,
        'failed',
        reasonCode,
        attempt,
        null,
        trustedNowMs,
      );

    this.byId.set(rollbackId, next);

    return result(
      true,
      false,
      'accepted',
      next,
    );
  }

  canFinalize(): boolean {
    return [...this.byId.values()].every(
      (state) =>
        state.status === 'armed'
        || state.status === 'resolved',
    );
  }

  getOpenRollbacks():
    readonly GoalRollbackState[] {
    return Object.freeze(
      [...this.byId.values()]
        .filter(
          (state) =>
            state.status !== 'armed'
            && state.status !== 'resolved',
        ),
    );
  }

  getState(
    rollbackId: string,
  ): GoalRollbackState | null {
    return this.byId.get(rollbackId) ?? null;
  }

  getStates(): readonly GoalRollbackState[] {
    return Object.freeze(
      [...this.byId.values()],
    );
  }

  requireAllArmed(
    reasonCode: string,
    trustedNowMs: number,
  ): readonly GoalRollbackMutationResult[] {
    return Object.freeze(
      [...this.byId.values()]
        .filter(
          (state) => state.status === 'armed',
        )
        .map(
          (state) =>
            this.require(
              state.registration.rollbackId,
              reasonCode,
              trustedNowMs,
            ),
        ),
    );
  }
}
