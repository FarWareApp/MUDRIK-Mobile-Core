import {
  exactObject,
  safeInteger,
  safeReasonCode,
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

import {
  evaluateResultVerification,
  type ResultVerificationDecision,
  type ResultVerificationPolicy,
} from '../verification/resultVerifier';

export type GoalWorkCommitState =
  | 'not_committed'
  | 'committed'
  | 'unknown';

export type GoalWorkRunnerInvocation =
  Readonly<{
    protocolVersion: '1.0';
    workId: string;
    goalId: string;
    planId: string;
    stepId: string;
    operationRef: string;
    attempt: number;
    idempotencyKey: string;
    sideEffect: boolean;
    startedAtMs: number;
    deadlineAtMs: number | null;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

export type GoalWorkRunnerOutput =
  Readonly<{
    protocolVersion: '1.0';
    status: 'succeeded' | 'failed';
    resultRef: string | null;
    evidenceRef: string | null;
    failureReason: string | null;
    retryable: boolean;
    commitState: GoalWorkCommitState;
    completedAtMs: number;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

export interface GoalWorkRunner {
  run(
    invocation: GoalWorkRunnerInvocation,
  ): Promise<unknown>;
}

export interface GoalWorkRunnerResolver {
  resolve(
    state: GoalWorkState,
  ): GoalWorkRunner | null;
}

export interface GoalWorkEvidenceCollector {
  collect(
    input: Readonly<{
      goalId: string;
      planId: string;
      stepId: string;
      resultRef: string;
      executionEvidenceRef: string;
      observedAtMs: number;
    }>,
  ): Promise<readonly unknown[]>;
}

export type GoalWorkExecutionCoordinatorPolicy =
  Readonly<{
    workerLeaseMs: number;
    resultVerification:
      ResultVerificationPolicy;
  }>;

export type GoalWorkExecutionCycle =
  Readonly<{
    status:
      | 'idle'
      | 'completed'
      | 'retry_scheduled'
      | 'reconciliation_required'
      | 'dead_letter'
      | 'failed';
    reason: string;
    workId: string | null;
    verification:
      ResultVerificationDecision | null;
  }>;

const OUTPUT_KEYS =
  new Set([
    'protocolVersion',
    'status',
    'resultRef',
    'evidenceRef',
    'failureReason',
    'retryable',
    'commitState',
    'completedAtMs',
    'grantsExecutionAuthority',
    'grantsSensorAuthority',
    'grantsApprovalAuthority',
    'grantsCapabilityAuthority',
  ]);

export function parseGoalWorkRunnerOutput(
  input: unknown,
): GoalWorkRunnerOutput | null {
  const record =
    exactObject(input, OUTPUT_KEYS);

  if (
    !record
    || record.protocolVersion !== '1.0'
    || !['succeeded', 'failed']
      .includes(record.status as string)
    || typeof record.retryable !== 'boolean'
    || ![
      'not_committed',
      'committed',
      'unknown',
    ].includes(record.commitState as string)
    || !safeInteger(record.completedAtMs)
    || record.grantsExecutionAuthority !== false
    || record.grantsSensorAuthority !== false
    || record.grantsApprovalAuthority !== false
    || record.grantsCapabilityAuthority !== false
  ) {
    return null;
  }

  if (
    record.resultRef !== null
    && !safeReference(
      record.resultRef,
      240,
    )
  ) {
    return null;
  }

  if (
    record.evidenceRef !== null
    && !safeReference(
      record.evidenceRef,
      240,
    )
  ) {
    return null;
  }

  if (
    record.failureReason !== null
    && !safeReasonCode(
      record.failureReason,
    )
  ) {
    return null;
  }

  const status =
    record.status as GoalWorkRunnerOutput['status'];
  const commitState =
    record.commitState as GoalWorkCommitState;

  if (
    status === 'succeeded'
      ? (
          record.resultRef === null
          || record.evidenceRef === null
          || record.failureReason !== null
          || record.retryable !== false
        )
      : (
          record.resultRef !== null
          || record.failureReason === null
        )
  ) {
    return null;
  }

  return Object.freeze({
    protocolVersion: '1.0',
    status,
    resultRef:
      record.resultRef as string | null,
    evidenceRef:
      record.evidenceRef as string | null,
    failureReason:
      record.failureReason as string | null,
    retryable:
      record.retryable as boolean,
    commitState,
    completedAtMs:
      record.completedAtMs as number,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}

function cycle(
  status: GoalWorkExecutionCycle['status'],
  reason: string,
  workId: string | null,
  verification:
    ResultVerificationDecision | null = null,
): GoalWorkExecutionCycle {
  return Object.freeze({
    status,
    reason,
    workId,
    verification,
  });
}

function validPolicy(
  policy:
    GoalWorkExecutionCoordinatorPolicy,
): boolean {
  return (
    safeInteger(policy.workerLeaseMs)
    && policy.workerLeaseMs >= 1_000
    && policy.workerLeaseMs
      <= 60 * 60 * 1000
    && typeof policy.resultVerification
      === 'object'
    && policy.resultVerification !== null
  );
}

function stateOutcome(
  state: GoalWorkState | null,
  fallbackReason: string,
  verification:
    ResultVerificationDecision | null = null,
): GoalWorkExecutionCycle {
  if (!state) {
    return cycle(
      'failed',
      fallbackReason,
      null,
      verification,
    );
  }

  if (
    state.status
      === 'reconciliation_required'
  ) {
    return cycle(
      'reconciliation_required',
      state.lastFailureReason
        ?? fallbackReason,
      state.item.workId,
      verification,
    );
  }

  if (state.status === 'dead_letter') {
    return cycle(
      'dead_letter',
      state.lastFailureReason
        ?? fallbackReason,
      state.item.workId,
      verification,
    );
  }

  if (state.status === 'queued') {
    return cycle(
      'retry_scheduled',
      state.lastFailureReason
        ?? fallbackReason,
      state.item.workId,
      verification,
    );
  }

  return cycle(
    'failed',
    fallbackReason,
    state.item.workId,
    verification,
  );
}

export class GoalWorkExecutionCoordinator {
  constructor(
    private readonly queue: GoalWorkQueue,
    private readonly resolver:
      GoalWorkRunnerResolver,
    private readonly evidenceCollector:
      GoalWorkEvidenceCollector,
    private readonly policy:
      GoalWorkExecutionCoordinatorPolicy,
    private readonly clock:
      () => number = () => Date.now(),
  ) {
    if (!validPolicy(policy)) {
      throw new TypeError(
        'Invalid goal work execution coordinator policy.',
      );
    }
  }

  async runNext(
    goalInput: unknown,
    planInput: unknown,
    workerRef: string,
  ): Promise<GoalWorkExecutionCycle> {
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
      || !safeReference(
        workerRef,
        240,
      )
      || !safeInteger(now)
    ) {
      return cycle(
        'failed',
        'invalid_input',
        null,
      );
    }

    const claim =
      this.queue.claimNext(
        workerRef,
        now,
        this.policy.workerLeaseMs,
      );

    if (
      claim.accepted
      && claim.reason === 'no_work'
    ) {
      return cycle(
        'idle',
        'no_work',
        null,
      );
    }

    if (
      !claim.accepted
      || !claim.state
      || claim.state.status !== 'leased'
    ) {
      return stateOutcome(
        claim.state,
        claim.reason,
      );
    }

    const state = claim.state;
    const work = state.item;
    const plan = planValidation.value;
    const step =
      plan.steps.find(
        (candidate) =>
          candidate.stepId
            === work.stepId,
      );

    if (
      !step
      || work.goalId !== goal.goalId
      || work.planId !== plan.planId
      || work.operationRef
        !== step.operationRef
      || work.sideEffect
        !== step.sideEffect
    ) {
      const failed =
        this.queue.fail(
          work.workId,
          workerRef,
          'work_plan_binding_mismatch',
          false,
          'not_committed',
          null,
          now,
        );

      return stateOutcome(
        failed.state,
        'work_plan_binding_mismatch',
      );
    }

    const runner =
      this.resolver.resolve(state);

    if (!runner) {
      const failed =
        this.queue.fail(
          work.workId,
          workerRef,
          'runner_unavailable',
          true,
          'not_committed',
          null,
          now,
        );

      return stateOutcome(
        failed.state,
        'runner_unavailable',
      );
    }

    const invocation =
      Object.freeze({
        protocolVersion: '1.0' as const,
        workId: work.workId,
        goalId: work.goalId,
        planId: work.planId,
        stepId: work.stepId,
        operationRef:
          work.operationRef,
        attempt: state.attempt,
        idempotencyKey:
          work.idempotencyKey,
        sideEffect:
          work.sideEffect,
        startedAtMs: now,
        deadlineAtMs:
          work.deadlineAtMs,
        grantsExecutionAuthority:
          false as const,
        grantsSensorAuthority:
          false as const,
        grantsApprovalAuthority:
          false as const,
        grantsCapabilityAuthority:
          false as const,
      });

    let raw: unknown;

    try {
      raw =
        await runner.run(invocation);
    } catch {
      const failureAt =
        this.clock();
      const trustedFailureAt =
        safeInteger(failureAt)
          ? failureAt
          : now;

      const failed =
        this.queue.fail(
          work.workId,
          workerRef,
          'runner_exception',
          true,
          work.sideEffect
            ? 'unknown'
            : 'not_committed',
          null,
          trustedFailureAt,
        );

      return stateOutcome(
        failed.state,
        'runner_exception',
      );
    }

    const output =
      parseGoalWorkRunnerOutput(raw);
    const observedAt =
      output?.completedAtMs
      ?? now;

    if (
      !output
      || output.completedAtMs < now
      || (
        state.leaseExpiresAtMs !== null
        && output.completedAtMs
          > state.leaseExpiresAtMs
      )
      || (
        work.deadlineAtMs !== null
        && output.completedAtMs
          > work.deadlineAtMs
      )
    ) {
      const failed =
        this.queue.fail(
          work.workId,
          workerRef,
          'invalid_runner_output',
          true,
          work.sideEffect
            ? 'unknown'
            : 'not_committed',
          null,
          observedAt,
        );

      return stateOutcome(
        failed.state,
        'invalid_runner_output',
      );
    }

    if (output.status === 'failed') {
      const failed =
        this.queue.fail(
          work.workId,
          workerRef,
          output.failureReason as string,
          output.retryable,
          output.commitState,
          output.evidenceRef,
          output.completedAtMs,
        );

      return stateOutcome(
        failed.state,
        output.failureReason as string,
      );
    }

    if (
      work.sideEffect
        ? output.commitState
            !== 'committed'
        : output.commitState
            !== 'not_committed'
    ) {
      const failed =
        this.queue.fail(
          work.workId,
          workerRef,
          'commit_state_mismatch',
          false,
          work.sideEffect
            ? 'unknown'
            : 'not_committed',
          output.evidenceRef,
          output.completedAtMs,
        );

      return stateOutcome(
        failed.state,
        'commit_state_mismatch',
      );
    }

    const preVerifyAt =
      this.clock();

    if (!safeInteger(preVerifyAt)) {
      const failed =
        this.queue.fail(
          work.workId,
          workerRef,
          'verification_clock_invalid',
          false,
          work.sideEffect
            ? 'committed'
            : 'not_committed',
          output.evidenceRef,
          output.completedAtMs,
        );

      return stateOutcome(
        failed.state,
        'verification_clock_invalid',
      );
    }

    const renewedBeforeVerification =
      this.queue.renewLease(
        work.workId,
        workerRef,
        preVerifyAt,
        this.policy.workerLeaseMs,
      );

    if (
      !renewedBeforeVerification.accepted
    ) {
      return stateOutcome(
        renewedBeforeVerification.state,
        renewedBeforeVerification.reason,
      );
    }

    let evidenceInputs:
      readonly unknown[];

    try {
      evidenceInputs =
        await this.evidenceCollector.collect(
          Object.freeze({
            goalId: goal.goalId,
            planId: plan.planId,
            stepId: step.stepId,
            resultRef:
              output.resultRef as string,
            executionEvidenceRef:
              output.evidenceRef as string,
            observedAtMs:
              output.completedAtMs,
          }),
        );
    } catch {
      evidenceInputs =
        Object.freeze([]);
    }

    const verifyAt =
      this.clock();

    if (!safeInteger(verifyAt)) {
      const failed =
        this.queue.fail(
          work.workId,
          workerRef,
          'verification_clock_invalid',
          false,
          work.sideEffect
            ? 'committed'
            : 'not_committed',
          output.evidenceRef,
          output.completedAtMs,
        );

      return stateOutcome(
        failed.state,
        'verification_clock_invalid',
      );
    }

    const renewedAfterCollection =
      this.queue.renewLease(
        work.workId,
        workerRef,
        verifyAt,
        this.policy.workerLeaseMs,
      );

    if (
      !renewedAfterCollection.accepted
    ) {
      return stateOutcome(
        renewedAfterCollection.state,
        renewedAfterCollection.reason,
      );
    }

    const verification =
      evaluateResultVerification(
        {
          goalId: goal.goalId,
          planId: plan.planId,
          stepId: step.stepId,
          resultRef:
            output.resultRef as string,
          risk: goal.risk,
          sideEffect:
            step.sideEffect,
          verification:
            goal.verification,
        },
        evidenceInputs,
        this.policy.resultVerification,
        verifyAt,
      );

    if (!verification.accepted) {
      const reason =
        'verification_'
        + verification.reason;

      const failed =
        this.queue.fail(
          work.workId,
          workerRef,
          reason,
          true,
          work.sideEffect
            ? 'committed'
            : 'not_committed',
          output.evidenceRef,
          verifyAt,
        );

      return stateOutcome(
        failed.state,
        reason,
        verification,
      );
    }

    const completionEvidenceRef =
      verification.acceptedEvidenceIds[0]
      ?? output.evidenceRef;

    const completed =
      this.queue.complete(
        work.workId,
        workerRef,
        completionEvidenceRef,
        verifyAt,
      );

    if (
      completed.accepted
      && completed.state?.status
        === 'completed'
    ) {
      return cycle(
        'completed',
        'verified_completion',
        work.workId,
        verification,
      );
    }

    return stateOutcome(
      completed.state,
      completed.reason,
      verification,
    );
  }
}
