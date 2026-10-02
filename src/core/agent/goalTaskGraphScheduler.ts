import {
  safeInteger,
} from '../brain/brainSecurity';

import {
  validateGoalExecutionPlan,
  type GoalExecutionPlan,
  type GoalPlanStep,
} from './goalPlan';

export type GoalTaskGraphRuntime =
  Readonly<{
    completedStepIds: readonly string[];
    runningStepIds: readonly string[];
    failedStepIds: readonly string[];
  }>;

export type GoalTaskGraphPolicy =
  Readonly<{
    maxParallelSteps: number;
    serializeSideEffects: boolean;
    exclusiveFinalize: boolean;
    preferVerification: boolean;
  }>;

export type GoalTaskGraphDecision =
  Readonly<{
    accepted: boolean;
    reason:
      | 'scheduled'
      | 'complete'
      | 'wait_for_running'
      | 'dependency_blocked'
      | 'failed_dependency'
      | 'invalid_input';
    readySteps: readonly GoalPlanStep[];
    blockedStepIds: readonly string[];
    remainingStepIds: readonly string[];
    availableSlots: number;
  }>;

function uniqueStepIds(
  values: readonly string[],
  validIds: ReadonlySet<string>,
): boolean {
  return (
    Array.isArray(values)
    && values.length <= validIds.size
    && new Set(values).size === values.length
    && values.every(
      (value) =>
        typeof value === 'string'
        && validIds.has(value),
    )
  );
}

export function validateGoalTaskGraphPolicy(
  policy: GoalTaskGraphPolicy,
): boolean {
  return (
    safeInteger(policy.maxParallelSteps)
    && policy.maxParallelSteps >= 1
    && policy.maxParallelSteps <= 32
    && typeof policy.serializeSideEffects === 'boolean'
    && typeof policy.exclusiveFinalize === 'boolean'
    && typeof policy.preferVerification === 'boolean'
  );
}

function emptyDecision(
  reason: GoalTaskGraphDecision['reason'],
): GoalTaskGraphDecision {
  return Object.freeze({
    accepted: false,
    reason,
    readySteps: Object.freeze([]),
    blockedStepIds: Object.freeze([]),
    remainingStepIds: Object.freeze([]),
    availableSlots: 0,
  });
}

function priority(
  step: GoalPlanStep,
  policy: GoalTaskGraphPolicy,
): number {
  if (step.kind === 'finalize') {
    return 10_000;
  }

  if (
    policy.preferVerification
    && step.kind === 'verify'
  ) {
    return 0;
  }

  const KIND_PRIORITY:
    Readonly<Record<GoalPlanStep['kind'], number>> =
    Object.freeze({
      verify: 1,
      retrieve: 2,
      reason: 3,
      tool: 4,
      repair: 5,
      finalize: 10_000,
    });

  return KIND_PRIORITY[step.kind];
}

function sortReady(
  steps: readonly GoalPlanStep[],
  policy: GoalTaskGraphPolicy,
): readonly GoalPlanStep[] {
  return Object.freeze(
    [...steps].sort(
      (left, right) =>
        priority(left, policy)
        - priority(right, policy)
        || left.ordinal - right.ordinal
        || left.stepId.localeCompare(right.stepId),
    ),
  );
}

export function scheduleGoalTaskGraph(
  goalInput: unknown,
  planInput: unknown,
  runtime: GoalTaskGraphRuntime,
  policy: GoalTaskGraphPolicy,
): GoalTaskGraphDecision {
  const validation =
    validateGoalExecutionPlan(
      goalInput,
      planInput,
    );

  if (
    !validation.accepted
    || !validation.value
    || !validateGoalTaskGraphPolicy(policy)
    || typeof runtime !== 'object'
    || runtime === null
  ) {
    return emptyDecision('invalid_input');
  }

  const plan: GoalExecutionPlan =
    validation.value;
  const validIds =
    new Set(
      plan.steps.map((step) => step.stepId),
    );

  if (
    !uniqueStepIds(
      runtime.completedStepIds,
      validIds,
    )
    || !uniqueStepIds(
      runtime.runningStepIds,
      validIds,
    )
    || !uniqueStepIds(
      runtime.failedStepIds,
      validIds,
    )
  ) {
    return emptyDecision('invalid_input');
  }

  const completed =
    new Set(runtime.completedStepIds);
  const running =
    new Set(runtime.runningStepIds);
  const failed =
    new Set(runtime.failedStepIds);

  for (const stepId of validIds) {
    const memberships =
      Number(completed.has(stepId))
      + Number(running.has(stepId))
      + Number(failed.has(stepId));

    if (memberships > 1) {
      return emptyDecision('invalid_input');
    }
  }

  const remaining =
    plan.steps.filter(
      (step) =>
        !completed.has(step.stepId)
        && !running.has(step.stepId)
        && !failed.has(step.stepId),
    );

  if (
    remaining.length === 0
    && running.size === 0
    && failed.size === 0
  ) {
    return Object.freeze({
      accepted: true,
      reason: 'complete',
      readySteps: Object.freeze([]),
      blockedStepIds: Object.freeze([]),
      remainingStepIds: Object.freeze([]),
      availableSlots: policy.maxParallelSteps,
    });
  }

  const failedDependents =
    remaining.filter(
      (step) =>
        step.dependsOn.some(
          (dependency) => failed.has(dependency),
        ),
    );

  if (
    failedDependents.length > 0
    && running.size === 0
  ) {
    return Object.freeze({
      accepted: false,
      reason: 'failed_dependency',
      readySteps: Object.freeze([]),
      blockedStepIds:
        Object.freeze(
          failedDependents.map(
            (step) => step.stepId,
          ),
        ),
      remainingStepIds:
        Object.freeze(
          remaining.map(
            (step) => step.stepId,
          ),
        ),
      availableSlots:
        Math.max(
          0,
          policy.maxParallelSteps
          - running.size,
        ),
    });
  }

  const availableSlots =
    Math.max(
      0,
      policy.maxParallelSteps
      - running.size,
    );

  if (availableSlots === 0) {
    return Object.freeze({
      accepted: true,
      reason: 'wait_for_running',
      readySteps: Object.freeze([]),
      blockedStepIds: Object.freeze([]),
      remainingStepIds:
        Object.freeze(
          remaining.map(
            (step) => step.stepId,
          ),
        ),
      availableSlots: 0,
    });
  }

  const dependencyReady =
    remaining.filter(
      (step) =>
        step.dependsOn.every(
          (dependency) =>
            completed.has(dependency),
        ),
    );

  if (dependencyReady.length === 0) {
    return Object.freeze({
      accepted: running.size > 0,
      reason:
        running.size > 0
          ? 'wait_for_running'
          : 'dependency_blocked',
      readySteps: Object.freeze([]),
      blockedStepIds:
        Object.freeze(
          remaining.map(
            (step) => step.stepId,
          ),
        ),
      remainingStepIds:
        Object.freeze(
          remaining.map(
            (step) => step.stepId,
          ),
        ),
      availableSlots,
    });
  }

  const runningSteps =
    plan.steps.filter(
      (step) => running.has(step.stepId),
    );
  const sideEffectRunning =
    runningSteps.some(
      (step) => step.sideEffect,
    );

  let candidates =
    sortReady(
      dependencyReady,
      policy,
    );

  if (
    policy.serializeSideEffects
    && sideEffectRunning
  ) {
    candidates = Object.freeze([]);
  }

  if (
    policy.serializeSideEffects
    && !sideEffectRunning
    && candidates.some(
      (step) => step.sideEffect,
    )
  ) {
    const safeCandidates =
      candidates.filter(
        (step) => !step.sideEffect,
      );

    if (safeCandidates.length > 0) {
      candidates =
        Object.freeze(safeCandidates);
    } else if (running.size === 0) {
      const firstSideEffect =
        candidates.find(
          (step) => step.sideEffect,
        );

      candidates =
        firstSideEffect
          ? Object.freeze([firstSideEffect])
          : Object.freeze([]);
    } else {
      candidates = Object.freeze([]);
    }
  }

  const finalize =
    candidates.find(
      (step) => step.kind === 'finalize',
    );

  if (finalize && policy.exclusiveFinalize) {
    const nonFinalizeOutstanding =
      plan.steps.some(
        (step) =>
          step.kind !== 'finalize'
          && !completed.has(step.stepId),
      );

    candidates =
      nonFinalizeOutstanding
        ? Object.freeze(
            candidates.filter(
              (step) =>
                step.kind !== 'finalize',
            ),
          )
        : running.size === 0
          ? Object.freeze([finalize])
          : Object.freeze([]);
  }

  const ready =
    Object.freeze(
      candidates.slice(0, availableSlots),
    );

  if (ready.length === 0) {
    return Object.freeze({
      accepted: running.size > 0,
      reason:
        running.size > 0
          ? 'wait_for_running'
          : 'dependency_blocked',
      readySteps: Object.freeze([]),
      blockedStepIds:
        Object.freeze(
          remaining.map(
            (step) => step.stepId,
          ),
        ),
      remainingStepIds:
        Object.freeze(
          remaining.map(
            (step) => step.stepId,
          ),
        ),
      availableSlots,
    });
  }

  return Object.freeze({
    accepted: true,
    reason: 'scheduled',
    readySteps: ready,
    blockedStepIds: Object.freeze([]),
    remainingStepIds:
      Object.freeze(
        remaining.map(
          (step) => step.stepId,
        ),
      ),
    availableSlots,
  });
}

export const DEFAULT_GOAL_TASK_GRAPH_POLICY =
  Object.freeze({
    maxParallelSteps: 4,
    serializeSideEffects: true,
    exclusiveFinalize: true,
    preferVerification: true,
  } satisfies GoalTaskGraphPolicy);
