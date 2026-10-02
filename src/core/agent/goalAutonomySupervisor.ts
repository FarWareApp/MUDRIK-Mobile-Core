import {
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
  dispatchReadyGoalWork,
} from './goalDispatchCoordinator';

import {
  GoalWorkQueue,
  type GoalWorkState,
} from './goalWorkQueue';

import {
  GoalWorkExecutionCoordinator,
  type GoalWorkExecutionCycle,
} from './goalWorkExecutionCoordinator';

import type {
  GoalReconciliationCoordinator,
} from './goalReconciliationCoordinator';

import type {
  GoalTaskGraphPolicy,
} from './goalTaskGraphScheduler';

export type GoalAutonomySupervisorPolicy =
  Readonly<{
    maxRoundsPerTick: number;
    maxExecutionsPerTick: number;
    scheduler: GoalTaskGraphPolicy;
  }>;

export type GoalAutonomySupervisorStatus =
  | 'complete'
  | 'progressed'
  | 'idle'
  | 'blocked'
  | 'reconciliation_required'
  | 'dead_letter'
  | 'invalid_input';

export type GoalAutonomySupervisorResult =
  Readonly<{
    status: GoalAutonomySupervisorStatus;
    reason: string;
    rounds: number;
    executions: number;
    completedStepIds: readonly string[];
    reconciliationWorkIds: readonly string[];
    deadLetterWorkIds: readonly string[];
    cycles: readonly GoalWorkExecutionCycle[];
  }>;

function validPolicy(
  policy: GoalAutonomySupervisorPolicy,
): boolean {
  return (
    safeInteger(policy.maxRoundsPerTick)
    && policy.maxRoundsPerTick >= 1
    && policy.maxRoundsPerTick <= 64
    && safeInteger(policy.maxExecutionsPerTick)
    && policy.maxExecutionsPerTick >= 1
    && policy.maxExecutionsPerTick <= 256
    && typeof policy.scheduler === 'object'
    && policy.scheduler !== null
  );
}

function uniqueWorkers(
  workers: readonly string[],
): readonly string[] | null {
  if (
    !Array.isArray(workers)
    || workers.length < 1
    || workers.length > 64
  ) {
    return null;
  }

  const output: string[] = [];
  const seen = new Set<string>();

  for (const worker of workers) {
    if (
      !safeReference(worker, 240)
      || seen.has(worker)
    ) {
      return null;
    }

    seen.add(worker);
    output.push(worker);
  }

  return Object.freeze(output);
}

function relevantStates(
  queue: GoalWorkQueue,
  goalId: string,
  planId: string,
  trustedNowMs: number,
): readonly GoalWorkState[] {
  return Object.freeze(
    queue.snapshot(trustedNowMs)
      .filter(
        (state) =>
          state.item.goalId === goalId
          && state.item.planId === planId,
      ),
  );
}

function summarize(
  queue: GoalWorkQueue,
  goalId: string,
  planId: string,
  trustedNowMs: number,
): Readonly<{
  completedStepIds: readonly string[];
  reconciliationWorkIds: readonly string[];
  deadLetterWorkIds: readonly string[];
}> {
  const states =
    relevantStates(
      queue,
      goalId,
      planId,
      trustedNowMs,
    );

  return Object.freeze({
    completedStepIds: Object.freeze(
      states
        .filter(
          (state) =>
            state.status === 'completed',
        )
        .map((state) => state.item.stepId),
    ),
    reconciliationWorkIds: Object.freeze(
      states
        .filter(
          (state) =>
            state.status
              === 'reconciliation_required',
        )
        .map((state) => state.item.workId),
    ),
    deadLetterWorkIds: Object.freeze(
      states
        .filter(
          (state) =>
            state.status === 'dead_letter',
        )
        .map((state) => state.item.workId),
    ),
  });
}

function finish(
  status: GoalAutonomySupervisorStatus,
  reason: string,
  rounds: number,
  executions: number,
  summary: Readonly<{
    completedStepIds: readonly string[];
    reconciliationWorkIds: readonly string[];
    deadLetterWorkIds: readonly string[];
  }>,
  cycles: readonly GoalWorkExecutionCycle[],
): GoalAutonomySupervisorResult {
  return Object.freeze({
    status,
    reason,
    rounds,
    executions,
    completedStepIds:
      Object.freeze([...summary.completedStepIds]),
    reconciliationWorkIds:
      Object.freeze([...summary.reconciliationWorkIds]),
    deadLetterWorkIds:
      Object.freeze([...summary.deadLetterWorkIds]),
    cycles: Object.freeze([...cycles]),
  });
}

export class GoalAutonomySupervisor {
  constructor(
    private readonly queue: GoalWorkQueue,
    private readonly execution:
      GoalWorkExecutionCoordinator,
    private readonly clock:
      () => number = () => Date.now(),
    private readonly reconciliation:
      GoalReconciliationCoordinator | null = null,
  ) {}

  async runTick(
    goalInput: unknown,
    planInput: unknown,
    workerRefs: readonly string[],
    policy: GoalAutonomySupervisorPolicy,
  ): Promise<GoalAutonomySupervisorResult> {
    const goal =
      parseGoalExecutionSpec(goalInput);
    const plan =
      validateGoalExecutionPlan(
        goalInput,
        planInput,
      );
    const workers =
      uniqueWorkers(workerRefs);
    const initialNow =
      this.clock();

    if (
      !goal
      || !plan.accepted
      || !plan.value
      || !workers
      || !validPolicy(policy)
      || !safeInteger(initialNow)
      || initialNow < goal.createdAtMs
    ) {
      return finish(
        'invalid_input',
        'invalid_input',
        0,
        0,
        Object.freeze({
          completedStepIds: Object.freeze([]),
          reconciliationWorkIds: Object.freeze([]),
          deadLetterWorkIds: Object.freeze([]),
        }),
        [],
      );
    }

    const cycles: GoalWorkExecutionCycle[] = [];
    let executions = 0;
    let rounds = 0;

    for (
      let round = 0;
      round < policy.maxRoundsPerTick;
      round += 1
    ) {
      rounds += 1;
      const now = this.clock();

      if (!safeInteger(now)) {
        return finish(
          'invalid_input',
          'clock_invalid',
          rounds,
          executions,
          summarize(
            this.queue,
            goal.goalId,
            plan.value.planId,
            initialNow,
          ),
          cycles,
        );
      }

      const before =
        summarize(
          this.queue,
          goal.goalId,
          plan.value.planId,
          now,
        );

      if (
        before.reconciliationWorkIds.length > 0
      ) {
        if (!this.reconciliation) {
          return finish(
            'reconciliation_required',
            'reconciliation_required',
            rounds,
            executions,
            before,
            cycles,
          );
        }

        const reconciliation =
          await this.reconciliation.runNext(
            goal,
            plan.value,
          );

        if (
          reconciliation.status === 'completed'
          || reconciliation.status
            === 'retry_scheduled'
        ) {
          continue;
        }

        return finish(
          'reconciliation_required',
          reconciliation.reason,
          rounds,
          executions,
          summarize(
            this.queue,
            goal.goalId,
            plan.value.planId,
            now,
          ),
          cycles,
        );
      }

      if (before.deadLetterWorkIds.length > 0) {
        return finish(
          'dead_letter',
          'dead_letter_present',
          rounds,
          executions,
          before,
          cycles,
        );
      }

      const dispatch =
        dispatchReadyGoalWork(
          this.queue,
          goal,
          plan.value,
          policy.scheduler,
          now,
        );

      if (!dispatch.accepted) {
        return finish(
          'blocked',
          dispatch.reason,
          rounds,
          executions,
          summarize(
            this.queue,
            goal.goalId,
            plan.value.planId,
            now,
          ),
          cycles,
        );
      }

      if (dispatch.reason === 'complete') {
        return finish(
          'complete',
          'goal_complete',
          rounds,
          executions,
          summarize(
            this.queue,
            goal.goalId,
            plan.value.planId,
            now,
          ),
          cycles,
        );
      }

      if (
        executions
          >= policy.maxExecutionsPerTick
      ) {
        break;
      }

      const remainingBudget =
        policy.maxExecutionsPerTick
        - executions;
      const activeWorkers =
        workers.slice(
          0,
          Math.min(
            workers.length,
            remainingBudget,
          ),
        );

      const roundCycles =
        await Promise.all(
          activeWorkers.map(
            (workerRef) =>
              this.execution.runNext(
                goal,
                plan.value,
                workerRef,
              ),
          ),
        );

      let progressedThisRound = false;

      for (const item of roundCycles) {
        cycles.push(item);

        if (item.status !== 'idle') {
          executions += 1;
          progressedThisRound = true;
        }

        if (
          item.status
            === 'reconciliation_required'
        ) {
          if (this.reconciliation) {
            progressedThisRound = true;
            continue;
          }

          const current = this.clock();
          return finish(
            'reconciliation_required',
            item.reason,
            rounds,
            executions,
            summarize(
              this.queue,
              goal.goalId,
              plan.value.planId,
              safeInteger(current)
                ? current
                : now,
            ),
            cycles,
          );
        }

        if (item.status === 'dead_letter') {
          const current = this.clock();
          return finish(
            'dead_letter',
            item.reason,
            rounds,
            executions,
            summarize(
              this.queue,
              goal.goalId,
              plan.value.planId,
              safeInteger(current)
                ? current
                : now,
            ),
            cycles,
          );
        }
      }

      if (!progressedThisRound) {
        const current = this.clock();
        const effectiveNow =
          safeInteger(current)
            ? current
            : now;
        const summary =
          summarize(
            this.queue,
            goal.goalId,
            plan.value.planId,
            effectiveNow,
          );

        return finish(
          executions > 0
            ? 'progressed'
            : 'idle',
          dispatch.reason === 'no_dispatch'
            ? 'waiting_for_dependency_or_retry'
            : 'no_eligible_work',
          rounds,
          executions,
          summary,
          cycles,
        );
      }
    }

    const finalNow = this.clock();
    const effectiveNow =
      safeInteger(finalNow)
        ? finalNow
        : initialNow;
    const summary =
      summarize(
        this.queue,
        goal.goalId,
        plan.value.planId,
        effectiveNow,
      );

    return finish(
      executions > 0
        ? 'progressed'
        : 'idle',
      executions
        >= policy.maxExecutionsPerTick
        ? 'execution_budget_reached'
        : 'round_budget_reached',
      rounds,
      executions,
      summary,
      cycles,
    );
  }
}
