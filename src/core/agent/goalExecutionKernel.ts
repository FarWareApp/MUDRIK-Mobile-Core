import type {
  CapabilityGrant,
} from '../security/capabilityPolicy';

import {
  parseGoalExecutionSpec,
  type GoalExecutionSpec,
} from './goalContract';

import {
  validateGoalExecutionPlan,
  type GoalExecutionPlan,
  type GoalPlanStep,
} from './goalPlan';

import {
  GoalExecutionTracker,
  type GoalExecutionState,
  type GoalExecutionTransition,
} from './goalLifecycle';

import {
  authorizeGoalStepExecution,
  type GoalApprovalAuthority,
  type GoalCapabilityContextMap,
} from './goalCapabilityAdmission';

import {
  parseGoalExecutionLease,
  type GoalExecutionLease,
} from './goalExecutionLease';

import {
  GoalExecutionReceiptRegistry,
  parseGoalExecutionReceipt,
} from './goalExecutionReceipt';

import {
  GoalRollbackRegistry,
} from './goalRollback';

import {
  GoalResourceBudgetLedger,
  validateGoalResourceBudgetPolicy,
  type GoalResourceBudgetPolicy,
  type GoalResourceUsage,
} from './goalResourceBudget';

import {
  validateGoalReplanTransition,
  type GoalReplanDecision,
} from './goalReplanner';

export interface GoalExecutionKernelIdFactory {
  nextLeaseId(): string;
  nextRollbackId(): string;
  nextReservationId(): string;
}

export type GoalExecutionKernelPolicy =
  Readonly<{
    leaseTtlMs: number;
    allowIrreversibleSideEffects: boolean;
    resourceBudget: GoalResourceBudgetPolicy;
  }>;

export type GoalStepPreparation =
  Readonly<{
    accepted: boolean;
    reason: string;
    step: GoalPlanStep | null;
    lease: GoalExecutionLease | null;
    reservationId: string | null;
  }>;

export type GoalStepSettlement =
  Readonly<{
    accepted: boolean;
    reason: string;
    transition: GoalExecutionTransition | null;
  }>;

export type GoalKernelReplanResult =
  Readonly<{
    accepted: boolean;
    reason: string;
    decision: GoalReplanDecision | null;
    transition: GoalExecutionTransition | null;
  }>;

type ActivePreparation =
  Readonly<{
    step: GoalPlanStep;
    lease: GoalExecutionLease;
    reservationId: string;
    reservedUsage: GoalResourceUsage;
    rollbackId: string | null;
  }>;

function validKernelPolicy(
  policy: GoalExecutionKernelPolicy,
): boolean {
  return (
    Number.isSafeInteger(policy.leaseTtlMs)
    && policy.leaseTtlMs >= 1000
    && policy.leaseTtlMs <= 5 * 60 * 1000
    && typeof policy.allowIrreversibleSideEffects
      === 'boolean'
    && validateGoalResourceBudgetPolicy(
      policy.resourceBudget,
    )
  );
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

function validUsage(
  usage: GoalResourceUsage,
): boolean {
  return (
    Number.isSafeInteger(usage.modelCalls)
    && usage.modelCalls >= 0
    && Number.isSafeInteger(
      usage.providerCostMicros,
    )
    && usage.providerCostMicros >= 0
    && Number.isSafeInteger(
      usage.networkRequests,
    )
    && usage.networkRequests >= 0
    && Number.isSafeInteger(usage.outputBytes)
    && usage.outputBytes >= 0
    && Number.isSafeInteger(
      usage.concurrentOperations,
    )
    && usage.concurrentOperations >= 0
  );
}

function usageWithin(
  actual: GoalResourceUsage,
  reserved: GoalResourceUsage,
): boolean {
  return (
    validUsage(actual)
    && actual.modelCalls <= reserved.modelCalls
    && actual.providerCostMicros
      <= reserved.providerCostMicros
    && actual.networkRequests
      <= reserved.networkRequests
    && actual.outputBytes
      <= reserved.outputBytes
    && actual.concurrentOperations
      <= reserved.concurrentOperations
  );
}

export class GoalExecutionKernel {
  private readonly goal:
    GoalExecutionSpec;
  private plan:
    GoalExecutionPlan;
  private readonly tracker:
    GoalExecutionTracker;
  private readonly budget:
    GoalResourceBudgetLedger;
  private readonly receipts =
    new GoalExecutionReceiptRegistry();
  private readonly rollbacks =
    new GoalRollbackRegistry();

  private active:
    ActivePreparation | null = null;

  private readonly lastGeneration =
    new Map<string, number>();

  private replanGeneration = 0;

  constructor(
    goalInput: unknown,
    planInput: unknown,
    private readonly grants:
      readonly CapabilityGrant[],
    private readonly subjectId: string,
    private readonly contexts:
      GoalCapabilityContextMap,
    private readonly approvalAuthority:
      GoalApprovalAuthority | null,
    private readonly policy:
      GoalExecutionKernelPolicy,
    private readonly ids:
      GoalExecutionKernelIdFactory,
  ) {

    const goal =
      parseGoalExecutionSpec(goalInput);
    const validation =
      validateGoalExecutionPlan(
        goalInput,
        planInput,
      );

    if (
      !goal
      || !validation.accepted
      || !validation.value
      || !Array.isArray(grants)
      || typeof subjectId !== 'string'
      || subjectId.trim().length < 1
      || subjectId.length > 256
      || !validKernelPolicy(policy)
      || typeof ids.nextLeaseId !== 'function'
      || typeof ids.nextRollbackId !== 'function'
      || typeof ids.nextReservationId !== 'function'
    ) {
      throw new TypeError(
        'Invalid goal execution kernel binding.',
      );
    }

    this.goal = goal;
    this.plan = validation.value;
    this.tracker =
      new GoalExecutionTracker(
        goal,
        validation.value,
      );
    this.budget =
      new GoalResourceBudgetLedger(
        policy.resourceBudget,
        goal.createdAtMs,
      );
  }

  getState(): GoalExecutionState {
    return this.tracker.getState();
  }

  getCurrentStep(): GoalPlanStep | null {
    return this.tracker.getCurrentStep();
  }

  getCommittedUsage(): GoalResourceUsage {
    return this.budget.getCommittedUsage();
  }

  getReservedUsage(): GoalResourceUsage {
    return this.budget.getReservedUsage();
  }

  getRollbackStates() {
    return this.rollbacks.getStates();
  }

  start(
    trustedNowMs: number,
  ): GoalExecutionTransition {
    return this.tracker.start(trustedNowMs);
  }

  completeRepair(
    evidenceRef: string,
    trustedNowMs: number,
  ): GoalExecutionTransition {
    if (!this.rollbacks.canFinalize()) {
      return Object.freeze({
        accepted: false,
        idempotent: false,
        reason: 'invalid_phase',
        state: this.tracker.getState(),
      });
    }

    return this.tracker.completeRepair(
      evidenceRef,
      trustedNowMs,
    );
  }

  replan(
    nextPlanInput: unknown,
    amendmentInput: unknown,
    trustedNowMs: number,
  ): GoalKernelReplanResult {
    if (this.active) {
      return Object.freeze({
        accepted: false,
        reason: 'active_preparation',
        decision: null,
        transition: null,
      });
    }

    if (!this.rollbacks.canFinalize()) {
      return Object.freeze({
        accepted: false,
        reason: 'rollback_pending',
        decision: null,
        transition: null,
      });
    }

    const state = this.tracker.getState();
    const decision =
      validateGoalReplanTransition(
        this.goal,
        this.plan,
        nextPlanInput,
        amendmentInput,
        state.completedStepIds,
        this.replanGeneration,
        trustedNowMs,
      );

    if (!decision.accepted || !decision.nextPlan) {
      return Object.freeze({
        accepted: false,
        reason: 'replan_denied:' + decision.reason,
        decision,
        transition: null,
      });
    }

    const transition =
      this.tracker.applyValidatedReplan(
        decision.nextPlan,
        trustedNowMs,
      );

    if (!transition.accepted) {
      return Object.freeze({
        accepted: false,
        reason: 'lifecycle_replan_denied:'
          + transition.reason,
        decision,
        transition,
      });
    }

    this.plan = decision.nextPlan;
    this.replanGeneration += 1;

    return Object.freeze({
      accepted: true,
      reason: 'replanned',
      decision,
      transition,
    });
  }

  prepareCurrentStep(
    generation: number,
    estimatedUsage: GoalResourceUsage,
    trustedNowMs: number,
  ): GoalStepPreparation {
    const state = this.tracker.getState();
    const step = this.tracker.getCurrentStep();

    if (
      !Number.isSafeInteger(trustedNowMs)
      || trustedNowMs < state.updatedAtMs
    ) {
      return Object.freeze({
        accepted: false,
        reason: 'invalid_time',
        step,
        lease: null,
        reservationId: null,
      });
    }

    if (
      !step
      || !['running', 'verifying']
        .includes(state.phase)
    ) {
      return Object.freeze({
        accepted: false,
        reason: 'invalid_state',
        step,
        lease: null,
        reservationId: null,
      });
    }

    if (this.active) {
      return Object.freeze({
        accepted: false,
        reason: 'already_prepared',
        step,
        lease: null,
        reservationId: null,
      });
    }

    if (
      !Number.isSafeInteger(generation)
      || generation < 0
      || generation > 1_000_000
    ) {
      return Object.freeze({
        accepted: false,
        reason: 'generation_invalid',
        step,
        lease: null,
        reservationId: null,
      });
    }

    const previousGeneration =
      this.lastGeneration.get(step.stepId);

    if (
      previousGeneration === undefined
        ? generation !== 0
        : generation !== previousGeneration + 1
    ) {
      return Object.freeze({
        accepted: false,
        reason: 'generation_invalid',
        step,
        lease: null,
        reservationId: null,
      });
    }

    if (
      step.kind === 'finalize'
      && (
        state.verificationPasses
          < requiredVerificationPasses(
            this.goal,
          )
        || !this.rollbacks.canFinalize()
      )
    ) {
      return Object.freeze({
        accepted: false,
        reason: 'rollback_pending',
        step,
        lease: null,
        reservationId: null,
      });
    }

    if (
      step.sideEffect
      && step.rollbackRef === null
      && !this.policy
        .allowIrreversibleSideEffects
    ) {
      return Object.freeze({
        accepted: false,
        reason:
          'irreversible_side_effect_denied',
        step,
        lease: null,
        reservationId: null,
      });
    }

    const reservationId =
      this.ids.nextReservationId();

    const reserved =
      this.budget.reserve(
        reservationId,
        estimatedUsage,
        trustedNowMs,
      );

    if (!reserved.accepted) {
      return Object.freeze({
        accepted: false,
        reason:
          'budget_denied:' + reserved.reason,
        step,
        lease: null,
        reservationId: null,
      });
    }

    const admission =
      authorizeGoalStepExecution(
        this.goal,
        step,
        this.grants,
        this.subjectId,
        trustedNowMs,
        this.contexts,
        this.approvalAuthority,
      );

    if (!admission.allowed) {
      this.budget.release(reservationId);

      return Object.freeze({
        accepted: false,
        reason:
          'authorization_denied:'
          + admission.reason,
        step,
        lease: null,
        reservationId: null,
      });
    }

    const deadline =
      this.goal.deadlineAtMs;
    const expiresAtMs =
      Math.min(
        trustedNowMs
          + this.policy.leaseTtlMs,
        deadline ?? Number.MAX_SAFE_INTEGER,
      );

    if (expiresAtMs <= trustedNowMs) {
      this.budget.release(reservationId);

      return Object.freeze({
        accepted: false,
        reason: 'lease_invalid',
        step,
        lease: null,
        reservationId: null,
      });
    }

    const lease =
      parseGoalExecutionLease({
        protocolVersion: '1.0',
        leaseId: this.ids.nextLeaseId(),
        goalId: this.goal.goalId,
        planId: this.plan.planId,
        stepId: step.stepId,
        operationRef: step.operationRef,
        issuedAtMs: trustedNowMs,
        expiresAtMs,
        generation,
        approvalRef:
          admission.approvalRef,
        grantIds:
          admission.grantIds,
        grantsExecutionAuthority: false,
        grantsSensorAuthority: false,
        grantsApprovalAuthority: false,
        grantsCapabilityAuthority: false,
      });

    if (!lease) {
      this.budget.release(reservationId);

      return Object.freeze({
        accepted: false,
        reason: 'lease_invalid',
        step,
        lease: null,
        reservationId: null,
      });
    }

    let rollbackId: string | null = null;

    if (
      step.sideEffect
      && step.rollbackRef !== null
    ) {
      rollbackId =
        this.ids.nextRollbackId();

      const rollback =
        this.rollbacks.register(
          {
            protocolVersion: '1.0',
            rollbackId,
            goalId: this.goal.goalId,
            planId: this.plan.planId,
            stepId: step.stepId,
            sourceLeaseId: lease.leaseId,
            rollbackRef: step.rollbackRef,
            generation,
            registeredAtMs: trustedNowMs,
            grantsExecutionAuthority: false,
            grantsSensorAuthority: false,
            grantsApprovalAuthority: false,
            grantsCapabilityAuthority: false,
          },
          trustedNowMs,
        );

      if (!rollback.accepted) {
        this.budget.release(reservationId);

        return Object.freeze({
          accepted: false,
          reason:
            'rollback_registration_failed',
          step,
          lease: null,
          reservationId: null,
        });
      }
    }

    this.active =
      Object.freeze({
        step,
        lease,
        reservationId,
        reservedUsage:
          Object.freeze({
            ...estimatedUsage,
          }),
        rollbackId,
      });

    this.lastGeneration.set(
      step.stepId,
      generation,
    );

    return Object.freeze({
      accepted: true,
      reason: 'prepared',
      step,
      lease,
      reservationId,
    });
  }

  settleCurrentStep(
    receiptInput: unknown,
    actualUsage: GoalResourceUsage,
    trustedNowMs: number,
  ): GoalStepSettlement {
    const active = this.active;

    if (!active) {
      return Object.freeze({
        accepted: false,
        reason: 'no_active_preparation',
        transition: null,
      });
    }

    const receipt =
      parseGoalExecutionReceipt(
        receiptInput,
      );

    if (!receipt) {
      return Object.freeze({
        accepted: false,
        reason: 'receipt_invalid',
        transition: null,
      });
    }

    if (
      receipt.leaseId
        !== active.lease.leaseId
      || receipt.goalId
        !== this.goal.goalId
      || receipt.planId
        !== this.plan.planId
      || receipt.stepId
        !== active.step.stepId
      || receipt.operationRef
        !== active.step.operationRef
      || receipt.generation
        !== active.lease.generation
      || receipt.startedAtMs
        < active.lease.issuedAtMs
      || receipt.completedAtMs
        > active.lease.expiresAtMs
    ) {
      return Object.freeze({
        accepted: false,
        reason: 'receipt_mismatch',
        transition: null,
      });
    }

    if (
      !usageWithin(
        actualUsage,
        active.reservedUsage,
      )
      || !this.budget
        .canContinue(trustedNowMs)
    ) {
      return Object.freeze({
        accepted: false,
        reason: 'budget_commit_denied',
        transition: null,
      });
    }

    const receiptDecision =
      this.receipts.accept(
        receipt,
        trustedNowMs,
      );

    if (!receiptDecision.accepted) {
      return Object.freeze({
        accepted: false,
        reason:
          'receipt_rejected:'
          + receiptDecision.reason,
        transition: null,
      });
    }

    const budgetDecision =
      this.budget.commit(
        active.reservationId,
        actualUsage,
        trustedNowMs,
      );

    if (!budgetDecision.accepted) {
      return Object.freeze({
        accepted: false,
        reason:
          'budget_commit_denied:'
          + budgetDecision.reason,
        transition: null,
      });
    }

    let transition:
      GoalExecutionTransition;

    if (receipt.outcome === 'succeeded') {
      transition =
        this.tracker.succeedCurrentStep(
          receipt.resultRef as string,
          trustedNowMs,
        );
    } else {
      transition =
        this.tracker.failCurrentStep(
          receipt.failureReason as string,
          trustedNowMs,
        );
    }

    this.active = null;

    if (
      receipt.outcome === 'failed'
      && active.rollbackId !== null
    ) {
      this.rollbacks.require(
        active.rollbackId,
        'side_effect_failed',
        trustedNowMs,
      );
    }

    if (
      transition.state.phase === 'blocked'
      || transition.state.phase === 'cancelled'
    ) {
      this.rollbacks.requireAllArmed(
        'goal_execution_blocked',
        trustedNowMs,
      );
    }

    return Object.freeze({
      accepted:
        receiptDecision.accepted,
      reason: transition.accepted
        ? 'settled'
        : 'lifecycle_rejected:'
          + transition.reason,
      transition,
    });
  }

  startRollback(
    rollbackId: string,
    attempt: number,
    trustedNowMs: number,
  ) {
    return this.rollbacks.start(
      rollbackId,
      attempt,
      trustedNowMs,
    );
  }

  succeedRollback(
    rollbackId: string,
    attempt: number,
    evidenceRef: string,
    trustedNowMs: number,
  ) {
    return this.rollbacks.succeed(
      rollbackId,
      attempt,
      evidenceRef,
      trustedNowMs,
    );
  }

  failRollback(
    rollbackId: string,
    attempt: number,
    reasonCode: string,
    trustedNowMs: number,
  ) {
    return this.rollbacks.fail(
      rollbackId,
      attempt,
      reasonCode,
      trustedNowMs,
    );
  }

  cancel(
    trustedNowMs: number,
  ): GoalExecutionTransition {
    const transition =
      this.tracker.cancel(trustedNowMs);

    if (transition.accepted) {
      this.rollbacks.requireAllArmed(
        'goal_cancelled',
        trustedNowMs,
      );
    }

    return transition;
  }

  hasActivePreparation(): boolean {
    return this.active !== null;
  }
}
