import {
  safeInteger,
} from '../brain/brainSecurity';

import {
  GOAL_ID,
  GOAL_PLAN_ID,
  parseGoalExecutionSpec,
} from './goalContract';

import type {
  GoalExecutionState,
} from './goalLifecycle';

export type GoalWatchdogPolicy =
  Readonly<{
    runningStallMs: number;
    verificationStallMs: number;
    repairStallMs: number;
    readyStallMs: number;
    checkpointIntervalMs: number;
  }>;

export type GoalWatchdogObservation =
  Readonly<{
    goalId: string;
    planId: string;
    state: GoalExecutionState;
    activePreparation: boolean;
    activeSideEffect: boolean;
    activeLeaseExpiresAtMs: number | null;
    openRollbackCount: number;
    budgetHealthy: boolean;
    runtimeTrusted: boolean;
    lastCheckpointAtMs: number | null;
    observedAtMs: number;
  }>;

export type GoalWatchdogAction =
  | 'none'
  | 'start'
  | 'checkpoint'
  | 'gather_evidence'
  | 'replan'
  | 'rollback'
  | 'reconcile'
  | 'recover_runtime'
  | 'block';

export type GoalWatchdogDecision =
  Readonly<{
    action: GoalWatchdogAction;
    reason:
      | 'healthy'
      | 'terminal'
      | 'invalid_observation'
      | 'runtime_untrusted'
      | 'budget_exhausted'
      | 'deadline_exhausted'
      | 'lifecycle_blocked'
      | 'active_lease_expired'
      | 'rollback_pending'
      | 'ready_stalled'
      | 'execution_stalled'
      | 'verification_stalled'
      | 'repair_stalled'
      | 'checkpoint_due';
    stalledForMs: number;
  }>;

function boundedDuration(
  value: unknown,
): value is number {
  return (
    safeInteger(value)
    && Number(value) >= 1_000
    && Number(value)
      <= 24 * 60 * 60 * 1000
  );
}

export function validateGoalWatchdogPolicy(
  policy: GoalWatchdogPolicy,
): boolean {
  return (
    boundedDuration(policy.runningStallMs)
    && boundedDuration(
      policy.verificationStallMs,
    )
    && boundedDuration(policy.repairStallMs)
    && boundedDuration(policy.readyStallMs)
    && boundedDuration(
      policy.checkpointIntervalMs,
    )
  );
}

function decision(
  action: GoalWatchdogAction,
  reason: GoalWatchdogDecision['reason'],
  stalledForMs = 0,
): GoalWatchdogDecision {
  return Object.freeze({
    action,
    reason,
    stalledForMs,
  });
}

function validState(
  state: GoalExecutionState,
  observedAtMs: number,
): boolean {
  return (
    typeof state === 'object'
    && state !== null
    && [
      'ready',
      'running',
      'verifying',
      'repairing',
      'completed',
      'blocked',
      'cancelled',
    ].includes(state.phase)
    && (
      state.currentStepOrdinal === null
      || safeInteger(
        state.currentStepOrdinal,
      )
    )
    && Array.isArray(
      state.completedStepIds,
    )
    && safeInteger(state.toolAttempts)
    && safeInteger(state.repairCycles)
    && safeInteger(
      state.verificationPasses,
    )
    && safeInteger(
      state.verificationFailures,
    )
    && (
      state.failedStepId === null
      || typeof state.failedStepId
        === 'string'
    )
    && (
      state.lastFailureReason === null
      || typeof state.lastFailureReason
        === 'string'
    )
    && (
      state.finalResultRef === null
      || typeof state.finalResultRef
        === 'string'
    )
    && safeInteger(state.updatedAtMs)
    && state.updatedAtMs <= observedAtMs
  );
}

function validObservation(
  goalInput: unknown,
  observation: GoalWatchdogObservation,
  policy: GoalWatchdogPolicy,
): boolean {
  const goal =
    parseGoalExecutionSpec(goalInput);

  return Boolean(
    goal
    && validateGoalWatchdogPolicy(policy)
    && GOAL_ID.test(observation.goalId)
    && observation.goalId === goal.goalId
    && GOAL_PLAN_ID.test(observation.planId)
    && safeInteger(observation.observedAtMs)
    && validState(
      observation.state,
      observation.observedAtMs,
    )
    && typeof observation.activePreparation
      === 'boolean'
    && typeof observation.activeSideEffect
      === 'boolean'
    && (
      observation.activeLeaseExpiresAtMs
        === null
      || safeInteger(
        observation.activeLeaseExpiresAtMs,
      )
    )
    && safeInteger(
      observation.openRollbackCount,
    )
    && observation.openRollbackCount
      <= 10_000
    && typeof observation.budgetHealthy
      === 'boolean'
    && typeof observation.runtimeTrusted
      === 'boolean'
    && (
      observation.lastCheckpointAtMs === null
      || (
        safeInteger(
          observation.lastCheckpointAtMs,
        )
        && observation.lastCheckpointAtMs
          <= observation.observedAtMs
      )
    )
    && (
      observation.activePreparation
        ? observation.activeLeaseExpiresAtMs
          !== null
        : (
            observation.activeLeaseExpiresAtMs
              === null
            && !observation.activeSideEffect
          )
    ),
  );
}

function stallThreshold(
  phase: GoalExecutionState['phase'],
  policy: GoalWatchdogPolicy,
): number | null {
  if (phase === 'ready') {
    return policy.readyStallMs;
  }
  if (phase === 'running') {
    return policy.runningStallMs;
  }
  if (phase === 'verifying') {
    return policy.verificationStallMs;
  }
  if (phase === 'repairing') {
    return policy.repairStallMs;
  }
  return null;
}

export function evaluateGoalWatchdog(
  goalInput: unknown,
  observation: GoalWatchdogObservation,
  policy: GoalWatchdogPolicy,
): GoalWatchdogDecision {
  if (
    !validObservation(
      goalInput,
      observation,
      policy,
    )
  ) {
    return decision(
      'block',
      'invalid_observation',
    );
  }

  const goal =
    parseGoalExecutionSpec(goalInput);

  if (!goal) {
    return decision(
      'block',
      'invalid_observation',
    );
  }

  if (!observation.runtimeTrusted) {
    return decision(
      'recover_runtime',
      'runtime_untrusted',
    );
  }

  if (!observation.budgetHealthy) {
    return decision(
      'block',
      'budget_exhausted',
    );
  }

  if (
    goal.deadlineAtMs !== null
    && observation.observedAtMs
      >= goal.deadlineAtMs
  ) {
    return decision(
      'block',
      'deadline_exhausted',
    );
  }

  if (
    observation.state.phase === 'completed'
    || observation.state.phase
      === 'cancelled'
  ) {
    return decision(
      'none',
      'terminal',
    );
  }

  if (observation.state.phase === 'blocked') {
    return decision(
      'block',
      'lifecycle_blocked',
    );
  }

  if (
    observation.activePreparation
    && observation.activeLeaseExpiresAtMs
      !== null
    && observation.observedAtMs
      >= observation.activeLeaseExpiresAtMs
  ) {
    return observation.activeSideEffect
      ? decision(
          'reconcile',
          'active_lease_expired',
          observation.observedAtMs
            - observation.state.updatedAtMs,
        )
      : decision(
          'replan',
          'active_lease_expired',
          observation.observedAtMs
            - observation.state.updatedAtMs,
        );
  }

  if (observation.openRollbackCount > 0) {
    return decision(
      'rollback',
      'rollback_pending',
      observation.observedAtMs
        - observation.state.updatedAtMs,
    );
  }

  const threshold =
    stallThreshold(
      observation.state.phase,
      policy,
    );
  const stalledForMs =
    observation.observedAtMs
    - observation.state.updatedAtMs;

  if (
    threshold !== null
    && stalledForMs >= threshold
  ) {
    if (observation.activePreparation) {
      return decision(
        'none',
        'healthy',
        stalledForMs,
      );
    }

    if (observation.state.phase === 'ready') {
      return decision(
        'start',
        'ready_stalled',
        stalledForMs,
      );
    }

    if (
      observation.state.phase
        === 'verifying'
    ) {
      return decision(
        'gather_evidence',
        'verification_stalled',
        stalledForMs,
      );
    }

    if (
      observation.state.phase
        === 'repairing'
    ) {
      return decision(
        'replan',
        'repair_stalled',
        stalledForMs,
      );
    }

    return decision(
      'replan',
      'execution_stalled',
      stalledForMs,
    );
  }

  if (
    !observation.activePreparation
    && observation.openRollbackCount === 0
    && (
      observation.lastCheckpointAtMs === null
      || observation.observedAtMs
        - observation.lastCheckpointAtMs
        >= policy.checkpointIntervalMs
    )
  ) {
    return decision(
      'checkpoint',
      'checkpoint_due',
      stalledForMs,
    );
  }

  return decision(
    'none',
    'healthy',
    stalledForMs,
  );
}

export const DEFAULT_GOAL_WATCHDOG_POLICY =
  Object.freeze({
    runningStallMs: 30_000,
    verificationStallMs: 45_000,
    repairStallMs: 60_000,
    readyStallMs: 15_000,
    checkpointIntervalMs: 60_000,
  } satisfies GoalWatchdogPolicy);
