import {
  exactObject,
  safeInteger,
  safeReference,
} from '../brain/brainSecurity';

import {
  parseGoalExecutionSpec,
} from './goalContract';

import {
  validateGoalExecutionPlan,
} from './goalPlan';

import {
  GoalWorkQueue,
  type GoalWorkState,
} from './goalWorkQueue';

export type GoalReconciliationMethod =
  | 'state_readback'
  | 'idempotency_lookup'
  | 'deterministic_probe'
  | 'manual_confirmation';

export type GoalReconciliationResolution =
  | 'completed'
  | 'retry_safe'
  | 'rollback_required'
  | 'manual_review';

export type GoalReconciliationObservation =
  Readonly<{
    protocolVersion: '1.0';
    workId: string;
    goalId: string;
    planId: string;
    stepId: string;
    operationRef: string;
    resolution: GoalReconciliationResolution;
    commitState:
      | 'committed'
      | 'not_committed'
      | 'unknown';
    method: GoalReconciliationMethod;
    evidenceRef: string;
    confidenceScore: number;
    observedAtMs: number;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

export type GoalReconciliationPolicy =
  Readonly<{
    minimumConfidenceScore: number;
    maximumEvidenceAgeMs: number;
    allowManualConfirmation: boolean;
  }>;

export type GoalReconciliationCycle =
  Readonly<{
    status:
      | 'no_work'
      | 'completed'
      | 'retry_scheduled'
      | 'rollback_required'
      | 'manual_review'
      | 'failed';
    reason: string;
    workId: string | null;
    evidenceRef: string | null;
  }>;

export interface GoalReconciliationResolver {
  reconcile(
    input: Readonly<{
      workId: string;
      goalId: string;
      planId: string;
      stepId: string;
      operationRef: string;
      idempotencyKey: string;
      attempt: number;
      failureReason: string;
      observedAtMs: number;
    }>,
  ): Promise<unknown>;
}

const OUTPUT_KEYS = new Set([
  'protocolVersion',
  'workId',
  'goalId',
  'planId',
  'stepId',
  'operationRef',
  'resolution',
  'commitState',
  'method',
  'evidenceRef',
  'confidenceScore',
  'observedAtMs',
  'grantsExecutionAuthority',
  'grantsSensorAuthority',
  'grantsApprovalAuthority',
  'grantsCapabilityAuthority',
]);

export function parseGoalReconciliationObservation(
  input: unknown,
): GoalReconciliationObservation | null {
  const record = exactObject(input, OUTPUT_KEYS);

  if (
    !record
    || record.protocolVersion !== '1.0'
    || !safeReference(record.workId, 240)
    || !safeReference(record.goalId, 240)
    || !safeReference(record.planId, 240)
    || !safeReference(record.stepId, 240)
    || !safeReference(record.operationRef, 240)
    || ![
      'completed',
      'retry_safe',
      'rollback_required',
      'manual_review',
    ].includes(record.resolution as string)
    || ![
      'committed',
      'not_committed',
      'unknown',
    ].includes(record.commitState as string)
    || ![
      'state_readback',
      'idempotency_lookup',
      'deterministic_probe',
      'manual_confirmation',
    ].includes(record.method as string)
    || !safeReference(record.evidenceRef, 240)
    || !safeInteger(record.confidenceScore)
    || Number(record.confidenceScore) > 1000
    || !safeInteger(record.observedAtMs)
    || record.grantsExecutionAuthority !== false
    || record.grantsSensorAuthority !== false
    || record.grantsApprovalAuthority !== false
    || record.grantsCapabilityAuthority !== false
  ) {
    return null;
  }

  const resolution =
    record.resolution as GoalReconciliationResolution;
  const commitState =
    record.commitState as
      GoalReconciliationObservation['commitState'];

  if (
    (
      resolution === 'completed'
      && commitState !== 'committed'
    )
    || (
      resolution === 'retry_safe'
      && commitState !== 'not_committed'
    )
  ) {
    return null;
  }

  return Object.freeze({
    protocolVersion: '1.0',
    workId: record.workId as string,
    goalId: record.goalId as string,
    planId: record.planId as string,
    stepId: record.stepId as string,
    operationRef: record.operationRef as string,
    resolution,
    commitState,
    method:
      record.method as GoalReconciliationMethod,
    evidenceRef: record.evidenceRef as string,
    confidenceScore:
      record.confidenceScore as number,
    observedAtMs: record.observedAtMs as number,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}

function validPolicy(
  policy: GoalReconciliationPolicy,
): boolean {
  return (
    safeInteger(policy.minimumConfidenceScore)
    && policy.minimumConfidenceScore <= 1000
    && safeInteger(policy.maximumEvidenceAgeMs)
    && policy.maximumEvidenceAgeMs >= 1000
    && policy.maximumEvidenceAgeMs
      <= 24 * 60 * 60 * 1000
    && typeof policy.allowManualConfirmation
      === 'boolean'
  );
}

function cycle(
  status: GoalReconciliationCycle['status'],
  reason: string,
  workId: string | null,
  evidenceRef: string | null = null,
): GoalReconciliationCycle {
  return Object.freeze({
    status,
    reason,
    workId,
    evidenceRef,
  });
}

function firstReconciliation(
  states: readonly GoalWorkState[],
  goalId: string,
  planId: string,
): GoalWorkState | null {
  return (
    states.find(
      (state) =>
        state.status
          === 'reconciliation_required'
        && state.item.goalId === goalId
        && state.item.planId === planId,
    )
    ?? null
  );
}

export class GoalReconciliationCoordinator {
  constructor(
    private readonly queue: GoalWorkQueue,
    private readonly resolver:
      GoalReconciliationResolver,
    private readonly policy:
      GoalReconciliationPolicy,
    private readonly clock:
      () => number = () => Date.now(),
  ) {
    if (!validPolicy(policy)) {
      throw new TypeError(
        'Invalid goal reconciliation policy.',
      );
    }
  }

  async runNext(
    goalInput: unknown,
    planInput: unknown,
  ): Promise<GoalReconciliationCycle> {
    const goal =
      parseGoalExecutionSpec(goalInput);
    const planValidation =
      validateGoalExecutionPlan(
        goalInput,
        planInput,
      );
    const now = this.clock();

    if (
      !goal
      || !planValidation.accepted
      || !planValidation.value
      || !safeInteger(now)
    ) {
      return cycle(
        'failed',
        'invalid_input',
        null,
      );
    }

    const plan = planValidation.value;
    const state =
      firstReconciliation(
        this.queue.snapshot(now),
        goal.goalId,
        plan.planId,
      );

    if (!state) {
      return cycle(
        'no_work',
        'no_reconciliation_required',
        null,
      );
    }

    const step =
      plan.steps.find(
        (candidate) =>
          candidate.stepId
            === state.item.stepId,
      );

    if (
      !step
      || step.operationRef
        !== state.item.operationRef
      || !state.lastFailureReason
    ) {
      return cycle(
        'failed',
        'binding_mismatch',
        state.item.workId,
      );
    }

    let raw: unknown;

    try {
      raw =
        await this.resolver.reconcile(
          Object.freeze({
            workId: state.item.workId,
            goalId: goal.goalId,
            planId: plan.planId,
            stepId: step.stepId,
            operationRef:
              step.operationRef,
            idempotencyKey:
              state.item.idempotencyKey,
            attempt: state.attempt,
            failureReason:
              state.lastFailureReason,
            observedAtMs: now,
          }),
        );
    } catch {
      return cycle(
        'manual_review',
        'reconciler_exception',
        state.item.workId,
      );
    }

    const observation =
      parseGoalReconciliationObservation(raw);

    if (
      !observation
      || observation.workId
        !== state.item.workId
      || observation.goalId !== goal.goalId
      || observation.planId !== plan.planId
      || observation.stepId !== step.stepId
      || observation.operationRef
        !== step.operationRef
      || observation.observedAtMs > now
      || now - observation.observedAtMs
        > this.policy.maximumEvidenceAgeMs
    ) {
      return cycle(
        'manual_review',
        'invalid_reconciliation_evidence',
        state.item.workId,
      );
    }

    if (
      observation.method
        === 'manual_confirmation'
      && !this.policy.allowManualConfirmation
    ) {
      return cycle(
        'manual_review',
        'manual_confirmation_forbidden',
        state.item.workId,
        observation.evidenceRef,
      );
    }

    if (
      observation.confidenceScore
        < this.policy.minimumConfidenceScore
    ) {
      return cycle(
        'manual_review',
        'insufficient_reconciliation_confidence',
        state.item.workId,
        observation.evidenceRef,
      );
    }

    if (
      observation.resolution
        === 'rollback_required'
    ) {
      return cycle(
        'rollback_required',
        'rollback_required',
        state.item.workId,
        observation.evidenceRef,
      );
    }

    if (
      observation.resolution
        === 'manual_review'
    ) {
      return cycle(
        'manual_review',
        'manual_review_required',
        state.item.workId,
        observation.evidenceRef,
      );
    }

    const resolution =
      this.queue.resolveReconciliation(
        state.item.workId,
        observation.resolution === 'completed'
          ? 'completed'
          : 'retry',
        observation.evidenceRef,
        now,
      );

    if (!resolution.accepted) {
      return cycle(
        'failed',
        resolution.reason,
        state.item.workId,
        observation.evidenceRef,
      );
    }

    return cycle(
      observation.resolution === 'completed'
        ? 'completed'
        : 'retry_scheduled',
      observation.resolution,
      state.item.workId,
      observation.evidenceRef,
    );
  }
}
