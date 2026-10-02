import {
  safeInteger,
} from '../brain/brainSecurity';

import {
  parseGoalExecutionSpec,
} from './goalContract';

import {
  validateGoalExecutionPlan,
  type GoalPlanStep,
} from './goalPlan';

import {
  scheduleGoalTaskGraph,
  type GoalTaskGraphPolicy,
} from './goalTaskGraphScheduler';

import {
  GoalWorkQueue,
  parseGoalWorkItem,
  type GoalWorkItem,
  type GoalWorkState,
} from './goalWorkQueue';

export type GoalDispatchResult =
  Readonly<{
    accepted: boolean;
    reason:
      | 'dispatched'
      | 'no_dispatch'
      | 'complete'
      | 'blocked'
      | 'invalid_input'
      | 'queue_conflict';
    workItems: readonly GoalWorkItem[];
    queuedWorkIds: readonly string[];
    blockedStepIds: readonly string[];
  }>;

function workIdForStep(
  stepId: string,
): string {
  return stepId.replace(
    /^goal_step_/,
    'goal_work_',
  );
}

function priorityForStep(
  step: GoalPlanStep,
): number {
  const PRIORITY:
    Readonly<Record<GoalPlanStep['kind'], number>> =
    Object.freeze({
      verify: 950,
      repair: 900,
      tool: 800,
      retrieve: 700,
      reason: 600,
      finalize: 500,
    });

  return PRIORITY[step.kind];
}

function result(
  accepted: boolean,
  reason: GoalDispatchResult['reason'],
  workItems: readonly GoalWorkItem[] = [],
  queuedWorkIds: readonly string[] = [],
  blockedStepIds: readonly string[] = [],
): GoalDispatchResult {
  return Object.freeze({
    accepted,
    reason,
    workItems: Object.freeze([...workItems]),
    queuedWorkIds:
      Object.freeze([...queuedWorkIds]),
    blockedStepIds:
      Object.freeze([...blockedStepIds]),
  });
}

function classifyStates(
  states: readonly GoalWorkState[],
  goalId: string,
  planId: string,
  validStepIds: ReadonlySet<string>,
): Readonly<{
  completedStepIds: readonly string[];
  runningStepIds: readonly string[];
  failedStepIds: readonly string[];
}> | null {
  const completed: string[] = [];
  const running: string[] = [];
  const failed: string[] = [];
  const seen = new Set<string>();

  for (const state of states) {
    if (
      state.item.goalId !== goalId
      || state.item.planId !== planId
    ) {
      continue;
    }

    if (
      !validStepIds.has(state.item.stepId)
      || seen.has(state.item.stepId)
    ) {
      return null;
    }

    seen.add(state.item.stepId);

    if (state.status === 'completed') {
      completed.push(state.item.stepId);
    } else if (state.status === 'dead_letter') {
      failed.push(state.item.stepId);
    } else {
      running.push(state.item.stepId);
    }
  }

  return Object.freeze({
    completedStepIds:
      Object.freeze(completed),
    runningStepIds:
      Object.freeze(running),
    failedStepIds:
      Object.freeze(failed),
  });
}

export function dispatchReadyGoalWork(
  queue: GoalWorkQueue,
  goalInput: unknown,
  planInput: unknown,
  schedulerPolicy: GoalTaskGraphPolicy,
  trustedNowMs: number,
): GoalDispatchResult {
  const goal =
    parseGoalExecutionSpec(goalInput);
  const planValidation =
    validateGoalExecutionPlan(
      goalInput,
      planInput,
    );

  if (
    !goal
    || !planValidation.accepted
    || !planValidation.value
    || !safeInteger(trustedNowMs)
    || trustedNowMs < goal.createdAtMs
    || (
      goal.deadlineAtMs !== null
      && trustedNowMs >= goal.deadlineAtMs
    )
    || !(queue instanceof GoalWorkQueue)
  ) {
    return result(
      false,
      'invalid_input',
    );
  }

  const plan = planValidation.value;
  const validStepIds =
    new Set(
      plan.steps.map(
        (step) => step.stepId,
      ),
    );
  const runtime =
    classifyStates(
      queue.snapshot(trustedNowMs),
      goal.goalId,
      plan.planId,
      validStepIds,
    );

  if (!runtime) {
    return result(
      false,
      'queue_conflict',
    );
  }

  const schedule =
    scheduleGoalTaskGraph(
      goal,
      plan,
      runtime,
      schedulerPolicy,
    );

  if (!schedule.accepted) {
    return result(
      false,
      schedule.reason === 'invalid_input'
        ? 'invalid_input'
        : 'blocked',
      [],
      [],
      schedule.blockedStepIds,
    );
  }

  if (schedule.reason === 'complete') {
    return result(
      true,
      'complete',
    );
  }

  if (
    schedule.reason !== 'scheduled'
    || schedule.readySteps.length === 0
  ) {
    return result(
      true,
      'no_dispatch',
      [],
      [],
      schedule.blockedStepIds,
    );
  }

  const items: GoalWorkItem[] = [];

  for (const step of schedule.readySteps) {
    const body =
      step.stepId.replace(
        /^goal_step_/,
        '',
      );
    const raw = {
      protocolVersion: '1.0' as const,
      workId: workIdForStep(step.stepId),
      goalId: goal.goalId,
      planId: plan.planId,
      stepId: step.stepId,
      operationRef: step.operationRef,
      priority:
        priorityForStep(step),
      sideEffect: step.sideEffect,
      idempotencyKey:
        'idempotency_' + body,
      notBeforeMs: trustedNowMs,
      deadlineAtMs:
        goal.deadlineAtMs,
      maxAttempts:
        Math.min(
          32,
          Math.max(
            1,
            step.kind === 'tool'
              ? goal.maxToolAttempts
              : goal.maxRepairCycles + 1,
          ),
        ),
      createdAtMs: trustedNowMs,
      grantsExecutionAuthority:
        false as const,
      grantsSensorAuthority:
        false as const,
      grantsApprovalAuthority:
        false as const,
      grantsCapabilityAuthority:
        false as const,
    };
    const item =
      parseGoalWorkItem(raw);

    if (!item) {
      return result(
        false,
        'invalid_input',
      );
    }

    items.push(item);
  }

  const queued: string[] = [];

  for (const item of items) {
    const mutation =
      queue.enqueue(
        item,
        trustedNowMs,
      );

    if (!mutation.accepted) {
      return result(
        false,
        'queue_conflict',
        items,
        queued,
      );
    }

    queued.push(item.workId);
  }

  return result(
    true,
    'dispatched',
    items,
    queued,
  );
}
