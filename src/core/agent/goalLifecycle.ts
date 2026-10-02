import {
  exactObject,
  safeInteger,
  safeReasonCode,
  safeReference,
} from '../brain/brainSecurity';

import {
  parseGoalExecutionSpec,
  type GoalExecutionSpec,
} from './goalContract';

import {
  validateGoalExecutionPlan,
  type GoalExecutionPlan,
  type GoalPlanStep,
} from './goalPlan';

export type GoalExecutionPhase =
  | 'ready'
  | 'running'
  | 'verifying'
  | 'repairing'
  | 'completed'
  | 'blocked'
  | 'cancelled';

export type GoalExecutionState =
  Readonly<{
    phase: GoalExecutionPhase;
    currentStepOrdinal: number | null;
    completedStepIds: readonly string[];
    failedStepId: string | null;
    toolAttempts: number;
    repairCycles: number;
    verificationPasses: number;
    verificationFailures: number;
    lastFailureReason: string | null;
    finalResultRef: string | null;
    updatedAtMs: number;
  }>;

export type GoalExecutionTransition =
  Readonly<{
    accepted: boolean;
    idempotent: boolean;
    reason:
      | 'accepted'
      | 'replanned'
      | 'idempotent'
      | 'invalid_time'
      | 'deadline_exceeded'
      | 'invalid_phase'
      | 'invalid_result'
      | 'tool_budget_exhausted'
      | 'repair_budget_exhausted'
      | 'verification_incomplete'
      | 'lifecycle_closed';
    state: GoalExecutionState;
  }>;

const STATE_KEYS =
  new Set([
    'phase',
    'currentStepOrdinal',
    'completedStepIds',
    'failedStepId',
    'toolAttempts',
    'repairCycles',
    'verificationPasses',
    'verificationFailures',
    'lastFailureReason',
    'finalResultRef',
    'updatedAtMs',
  ]);

const RESUMABLE_PHASES =
  new Set<GoalExecutionPhase>([
    'ready',
    'running',
    'verifying',
    'repairing',
  ]);

function freezeState(
  value: GoalExecutionState,
): GoalExecutionState {
  return Object.freeze({
    ...value,
    completedStepIds:
      Object.freeze([...value.completedStepIds]),
  });
}

function transition(
  accepted: boolean,
  idempotent: boolean,
  reason: GoalExecutionTransition['reason'],
  state: GoalExecutionState,
): GoalExecutionTransition {
  return Object.freeze({
    accepted,
    idempotent,
    reason,
    state,
  });
}

function requiredVerificationPasses(
  goal: GoalExecutionSpec,
): number {
  if (goal.verification === 'none') {
    return 0;
  }
  return goal.verification === 'strict'
    ? 2
    : 1;
}

export function parseResumableGoalExecutionState(
  goalInput: unknown,
  planInput: unknown,
  stateInput: unknown,
  trustedNowMs: number,
): GoalExecutionState | null {
  const goal =
    parseGoalExecutionSpec(goalInput);
  const validation =
    validateGoalExecutionPlan(
      goalInput,
      planInput,
    );
  const record =
    exactObject(stateInput, STATE_KEYS);

  if (
    !goal
    || !validation.accepted
    || !validation.value
    || !record
    || typeof record.phase !== 'string'
    || !RESUMABLE_PHASES.has(
      record.phase as GoalExecutionPhase,
    )
    || !Array.isArray(record.completedStepIds)
    || record.completedStepIds.length
      > validation.value.steps.length
    || !safeInteger(record.toolAttempts)
    || Number(record.toolAttempts)
      > goal.maxToolAttempts
    || !safeInteger(record.repairCycles)
    || Number(record.repairCycles)
      > goal.maxRepairCycles
    || !safeInteger(record.verificationPasses)
    || !safeInteger(record.verificationFailures)
    || Number(record.verificationFailures)
      > Number(record.repairCycles)
    || record.finalResultRef !== null
    || !safeInteger(record.updatedAtMs)
    || !safeInteger(trustedNowMs)
    || Number(record.updatedAtMs)
      < goal.createdAtMs
    || Number(record.updatedAtMs)
      > trustedNowMs
    || (
      goal.deadlineAtMs !== null
      && trustedNowMs > goal.deadlineAtMs
    )
  ) {
    return null;
  }

  const plan = validation.value;
  const completed: string[] = [];
  const seen = new Set<string>();

  for (
    let index = 0;
    index < record.completedStepIds.length;
    index += 1
  ) {
    const stepId =
      record.completedStepIds[index];

    if (
      typeof stepId !== 'string'
      || seen.has(stepId)
      || plan.steps[index]?.stepId !== stepId
    ) {
      return null;
    }

    seen.add(stepId);
    completed.push(stepId);
  }

  const phase =
    record.phase as GoalExecutionPhase;
  const completedVerificationCount =
    plan.steps
      .slice(0, completed.length)
      .filter((step) => step.kind === 'verify')
      .length;

  if (
    Number(record.verificationPasses)
      !== completedVerificationCount
  ) {
    return null;
  }

  if (phase === 'ready') {
    if (
      record.currentStepOrdinal !== null
      || completed.length !== 0
      || record.failedStepId !== null
      || record.lastFailureReason !== null
      || Number(record.toolAttempts) !== 0
      || Number(record.repairCycles) !== 0
      || Number(record.verificationPasses) !== 0
      || Number(record.verificationFailures) !== 0
    ) {
      return null;
    }
  } else {
    if (
      !safeInteger(record.currentStepOrdinal)
      || Number(record.currentStepOrdinal)
        !== completed.length + 1
    ) {
      return null;
    }

    const currentStep =
      plan.steps[
        Number(record.currentStepOrdinal) - 1
      ];

    if (!currentStep) {
      return null;
    }

    if (
      phase === 'verifying'
        ? currentStep.kind !== 'verify'
        : phase === 'running'
          ? currentStep.kind === 'verify'
          : false
    ) {
      return null;
    }

    if (phase === 'repairing') {
      if (
        record.failedStepId !== currentStep.stepId
        || typeof record.lastFailureReason !== 'string'
        || !safeReasonCode(record.lastFailureReason)
        || Number(record.repairCycles) < 1
      ) {
        return null;
      }
    } else if (
      record.failedStepId !== null
      || record.lastFailureReason !== null
    ) {
      return null;
    }
  }

  return freezeState({
    phase,
    currentStepOrdinal:
      record.currentStepOrdinal as number | null,
    completedStepIds: completed,
    failedStepId:
      record.failedStepId as string | null,
    toolAttempts: record.toolAttempts as number,
    repairCycles: record.repairCycles as number,
    verificationPasses:
      record.verificationPasses as number,
    verificationFailures:
      record.verificationFailures as number,
    lastFailureReason:
      record.lastFailureReason as string | null,
    finalResultRef: null,
    updatedAtMs: record.updatedAtMs as number,
  });
}

export class GoalExecutionTracker {
  private readonly goal: GoalExecutionSpec;
  private plan: GoalExecutionPlan;

  private current: GoalExecutionState;

  constructor(
    goalInput: unknown,
    planInput: unknown,
  ) {
    const goal =
      parseGoalExecutionSpec(goalInput);
    const validation =
      validateGoalExecutionPlan(
        goalInput,
        planInput,
      );

    if (!goal || !validation.accepted || !validation.value) {
      throw new TypeError(
        'Invalid goal execution binding.',
      );
    }

    this.goal = goal;
    this.plan = validation.value;
    this.current =
      freezeState({
        phase: 'ready',
        currentStepOrdinal: null,
        completedStepIds: [],
        failedStepId: null,
        toolAttempts: 0,
        repairCycles: 0,
        verificationPasses: 0,
        verificationFailures: 0,
        lastFailureReason: null,
        finalResultRef: null,
        updatedAtMs: goal.createdAtMs,
      });
  }

  getState(): GoalExecutionState {
    return this.current;
  }

  getCurrentStep(): GoalPlanStep | null {
    const ordinal =
      this.current.currentStepOrdinal;

    if (ordinal === null) {
      return null;
    }

    return this.plan.steps[ordinal - 1] ?? null;
  }

  restoreCheckpointState(
    stateInput: unknown,
    trustedNowMs: number,
  ): boolean {
    if (
      this.current.phase !== 'ready'
      || this.current.completedStepIds.length !== 0
      || this.current.updatedAtMs
        !== this.goal.createdAtMs
    ) {
      return false;
    }

    const state =
      parseResumableGoalExecutionState(
        this.goal,
        this.plan,
        stateInput,
        trustedNowMs,
      );

    if (!state) {
      return false;
    }

    this.current = state;
    return true;
  }

  applyValidatedReplan(
    nextPlanInput: unknown,
    trustedNowMs: number,
  ): GoalExecutionTransition {
    const time =
      this.validateTime(trustedNowMs);

    if (time) {
      return time;
    }

    const closed = this.terminal();
    if (closed) {
      return closed;
    }

    if (
      this.current.phase !== 'running'
      && this.current.phase !== 'verifying'
      && this.current.phase !== 'repairing'
    ) {
      return transition(
        false,
        false,
        'invalid_phase',
        this.current,
      );
    }

    const validation =
      validateGoalExecutionPlan(
        this.goal,
        nextPlanInput,
      );

    if (!validation.accepted || !validation.value) {
      return transition(
        false,
        false,
        'invalid_result',
        this.current,
      );
    }

    const nextPlan = validation.value;
    const completedCount =
      this.current.completedStepIds.length;

    for (let index = 0; index < completedCount; index += 1) {
      const previous = this.plan.steps[index];
      const replacement = nextPlan.steps[index];

      if (
        !previous
        || !replacement
        || this.current.completedStepIds[index]
          !== previous.stepId
        || JSON.stringify(previous)
          !== JSON.stringify(replacement)
      ) {
        return transition(
          false,
          false,
          'invalid_result',
          this.current,
        );
      }
    }

    const nextOrdinal = completedCount + 1;
    const nextStep =
      nextPlan.steps[nextOrdinal - 1];

    if (!nextStep) {
      return transition(
        false,
        false,
        'invalid_result',
        this.current,
      );
    }

    this.plan = nextPlan;
    this.current =
      freezeState({
        ...this.current,
        phase:
          nextStep.kind === 'verify'
            ? 'verifying'
            : 'running',
        currentStepOrdinal: nextOrdinal,
        failedStepId: null,
        lastFailureReason: null,
        finalResultRef: null,
        updatedAtMs: trustedNowMs,
      });

    return transition(
      true,
      false,
      'replanned',
      this.current,
    );
  }

  private validateTime(
    trustedNowMs: number,
  ): GoalExecutionTransition | null {
    if (
      !Number.isSafeInteger(trustedNowMs)
      || trustedNowMs < this.current.updatedAtMs
    ) {
      return transition(
        false,
        false,
        'invalid_time',
        this.current,
      );
    }

    if (
      this.goal.deadlineAtMs !== null
      && trustedNowMs > this.goal.deadlineAtMs
    ) {
      this.current =
        freezeState({
          ...this.current,
          phase: 'blocked',
          lastFailureReason:
            'goal_deadline_exceeded',
          updatedAtMs: trustedNowMs,
        });

      return transition(
        false,
        false,
        'deadline_exceeded',
        this.current,
      );
    }

    return null;
  }

  private terminal():
    GoalExecutionTransition | null {
    if (
      this.current.phase === 'completed'
      || this.current.phase === 'blocked'
      || this.current.phase === 'cancelled'
    ) {
      return transition(
        false,
        false,
        'lifecycle_closed',
        this.current,
      );
    }

    return null;
  }

  start(
    trustedNowMs: number,
  ): GoalExecutionTransition {
    const time =
      this.validateTime(trustedNowMs);

    if (time) {
      return time;
    }

    if (this.current.phase === 'running') {
      return transition(
        true,
        true,
        'idempotent',
        this.current,
      );
    }

    const closed = this.terminal();
    if (closed) {
      return closed;
    }

    if (this.current.phase !== 'ready') {
      return transition(
        false,
        false,
        'invalid_phase',
        this.current,
      );
    }

    const first = this.plan.steps[0];

    this.current =
      freezeState({
        ...this.current,
        phase:
          first.kind === 'verify'
            ? 'verifying'
            : 'running',
        currentStepOrdinal: 1,
        updatedAtMs: trustedNowMs,
      });

    return transition(
      true,
      false,
      'accepted',
      this.current,
    );
  }

  succeedCurrentStep(
    resultRef: string,
    trustedNowMs: number,
  ): GoalExecutionTransition {
    const time =
      this.validateTime(trustedNowMs);
    if (time) {
      return time;
    }

    const closed = this.terminal();
    if (closed) {
      return closed;
    }

    if (
      this.current.phase !== 'running'
      && this.current.phase !== 'verifying'
    ) {
      return transition(
        false,
        false,
        'invalid_phase',
        this.current,
      );
    }

    if (!safeReference(resultRef, 240)) {
      return transition(
        false,
        false,
        'invalid_result',
        this.current,
      );
    }

    const step = this.getCurrentStep();
    if (!step) {
      return transition(
        false,
        false,
        'invalid_phase',
        this.current,
      );
    }

    let toolAttempts = this.current.toolAttempts;

    if (step.kind === 'tool') {
      toolAttempts += 1;

      if (toolAttempts > this.goal.maxToolAttempts) {
        this.current =
          freezeState({
            ...this.current,
            phase: 'blocked',
            toolAttempts,
            lastFailureReason:
              'tool_budget_exhausted',
            updatedAtMs: trustedNowMs,
          });

        return transition(
          false,
          false,
          'tool_budget_exhausted',
          this.current,
        );
      }
    }

    const verificationPasses =
      this.current.verificationPasses
      + Number(step.kind === 'verify');

    if (
      step.kind === 'finalize'
      && verificationPasses
        < requiredVerificationPasses(this.goal)
    ) {
      return transition(
        false,
        false,
        'verification_incomplete',
        this.current,
      );
    }

    const completedStepIds = [
      ...this.current.completedStepIds,
      step.stepId,
    ];

    if (step.kind === 'finalize') {
      this.current =
        freezeState({
          ...this.current,
          phase: 'completed',
          currentStepOrdinal: null,
          completedStepIds,
          failedStepId: null,
          toolAttempts,
          verificationPasses,
          lastFailureReason: null,
          finalResultRef: resultRef,
          updatedAtMs: trustedNowMs,
        });

      return transition(
        true,
        false,
        'accepted',
        this.current,
      );
    }

    const nextOrdinal =
      (this.current.currentStepOrdinal ?? 0) + 1;
    const next =
      this.plan.steps[nextOrdinal - 1];

    if (!next) {
      return transition(
        false,
        false,
        'invalid_phase',
        this.current,
      );
    }

    this.current =
      freezeState({
        ...this.current,
        phase:
          next.kind === 'verify'
            ? 'verifying'
            : 'running',
        currentStepOrdinal: nextOrdinal,
        completedStepIds,
        failedStepId: null,
        toolAttempts,
        verificationPasses,
        lastFailureReason: null,
        updatedAtMs: trustedNowMs,
      });

    return transition(
      true,
      false,
      'accepted',
      this.current,
    );
  }

  failCurrentStep(
    reasonCode: string,
    trustedNowMs: number,
  ): GoalExecutionTransition {
    const time =
      this.validateTime(trustedNowMs);
    if (time) {
      return time;
    }

    const closed = this.terminal();
    if (closed) {
      return closed;
    }

    if (
      this.current.phase !== 'running'
      && this.current.phase !== 'verifying'
    ) {
      return transition(
        false,
        false,
        'invalid_phase',
        this.current,
      );
    }

    if (!safeReasonCode(reasonCode)) {
      return transition(
        false,
        false,
        'invalid_result',
        this.current,
      );
    }

    const step = this.getCurrentStep();
    if (!step) {
      return transition(
        false,
        false,
        'invalid_phase',
        this.current,
      );
    }

    let toolAttempts = this.current.toolAttempts;

    if (step.kind === 'tool') {
      toolAttempts += 1;

      if (toolAttempts > this.goal.maxToolAttempts) {
        this.current =
          freezeState({
            ...this.current,
            phase: 'blocked',
            toolAttempts,
            failedStepId: step.stepId,
            lastFailureReason:
              'tool_budget_exhausted',
            updatedAtMs: trustedNowMs,
          });

        return transition(
          false,
          false,
          'tool_budget_exhausted',
          this.current,
        );
      }
    }

    const verificationFailures =
      this.current.verificationFailures
      + Number(step.kind === 'verify');

    if (
      this.current.repairCycles
      >= this.goal.maxRepairCycles
    ) {
      this.current =
        freezeState({
          ...this.current,
          phase: 'blocked',
          failedStepId: step.stepId,
          toolAttempts,
          verificationFailures,
          lastFailureReason:
            'repair_budget_exhausted',
          updatedAtMs: trustedNowMs,
        });

      return transition(
        false,
        false,
        'repair_budget_exhausted',
        this.current,
      );
    }

    this.current =
      freezeState({
        ...this.current,
        phase: 'repairing',
        failedStepId: step.stepId,
        toolAttempts,
        repairCycles:
          this.current.repairCycles + 1,
        verificationFailures,
        lastFailureReason: reasonCode,
        updatedAtMs: trustedNowMs,
      });

    return transition(
      true,
      false,
      'accepted',
      this.current,
    );
  }

  completeRepair(
    evidenceRef: string,
    trustedNowMs: number,
  ): GoalExecutionTransition {
    const time =
      this.validateTime(trustedNowMs);
    if (time) {
      return time;
    }

    const closed = this.terminal();
    if (closed) {
      return closed;
    }

    if (this.current.phase !== 'repairing') {
      return transition(
        false,
        false,
        'invalid_phase',
        this.current,
      );
    }

    if (!safeReference(evidenceRef, 240)) {
      return transition(
        false,
        false,
        'invalid_result',
        this.current,
      );
    }

    const step = this.getCurrentStep();

    if (!step) {
      return transition(
        false,
        false,
        'invalid_phase',
        this.current,
      );
    }

    this.current =
      freezeState({
        ...this.current,
        phase:
          step.kind === 'verify'
            ? 'verifying'
            : 'running',
        failedStepId: null,
        lastFailureReason: null,
        updatedAtMs: trustedNowMs,
      });

    return transition(
      true,
      false,
      'accepted',
      this.current,
    );
  }

  cancel(
    trustedNowMs: number,
  ): GoalExecutionTransition {
    if (
      this.current.phase === 'cancelled'
    ) {
      return transition(
        true,
        true,
        'idempotent',
        this.current,
      );
    }

    const time =
      this.validateTime(trustedNowMs);
    if (time) {
      return time;
    }

    if (
      this.current.phase === 'completed'
      || this.current.phase === 'blocked'
    ) {
      return transition(
        false,
        false,
        'lifecycle_closed',
        this.current,
      );
    }

    this.current =
      freezeState({
        ...this.current,
        phase: 'cancelled',
        updatedAtMs: trustedNowMs,
      });

    return transition(
      true,
      false,
      'accepted',
      this.current,
    );
  }
}
