import {
  exactObject,
  safeInteger,
  safeReasonCode,
} from '../brain/brainSecurity';

import {
  GOAL_ID,
  GOAL_PLAN_ID,
  GOAL_STEP_ID,
  parseGoalExecutionSpec,
} from './goalContract';

import {
  validateGoalExecutionPlan,
  type GoalExecutionPlan,
  type GoalPlanStep,
} from './goalPlan';

const BODY =
  '[a-z0-9][a-z0-9_-]{15,127}';

const AMENDMENT_ID =
  new RegExp(
    '^goal_amendment_' + BODY + '$',
  );

export type GoalReplanTrigger =
  | 'tool_unavailable'
  | 'verification_failed'
  | 'evidence_changed'
  | 'budget_pressure'
  | 'timeout_risk'
  | 'execution_failure'
  | 'dependency_changed';

export type GoalPlanAmendment =
  Readonly<{
    protocolVersion: '1.0';
    amendmentId: string;
    goalId: string;
    fromPlanId: string;
    toPlanId: string;
    generation: number;
    trigger: GoalReplanTrigger;
    reasonCode: string;
    requestedAtMs: number;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

export type GoalReplanDecision =
  Readonly<{
    accepted: boolean;
    reason:
      | 'accepted'
      | 'invalid_input'
      | 'binding_mismatch'
      | 'generation_mismatch'
      | 'time_invalid'
      | 'completed_prefix_mismatch'
      | 'completed_step_mutated'
      | 'unfinished_step_reused'
      | 'no_remaining_work';
    nextPlan: GoalExecutionPlan | null;
    preservedStepIds: readonly string[];
    replacedStepIds: readonly string[];
    newStepIds: readonly string[];
  }>;

const TRIGGERS =
  new Set<GoalReplanTrigger>([
    'tool_unavailable',
    'verification_failed',
    'evidence_changed',
    'budget_pressure',
    'timeout_risk',
    'execution_failure',
    'dependency_changed',
  ]);

const AMENDMENT_KEYS =
  new Set([
    'protocolVersion',
    'amendmentId',
    'goalId',
    'fromPlanId',
    'toPlanId',
    'generation',
    'trigger',
    'reasonCode',
    'requestedAtMs',
    'grantsExecutionAuthority',
    'grantsSensorAuthority',
    'grantsApprovalAuthority',
    'grantsCapabilityAuthority',
  ]);

export function parseGoalPlanAmendment(
  input: unknown,
): GoalPlanAmendment | null {
  const record =
    exactObject(input, AMENDMENT_KEYS);

  if (
    !record
    || record.protocolVersion !== '1.0'
    || typeof record.amendmentId !== 'string'
    || !AMENDMENT_ID.test(record.amendmentId)
    || typeof record.goalId !== 'string'
    || !GOAL_ID.test(record.goalId)
    || typeof record.fromPlanId !== 'string'
    || !GOAL_PLAN_ID.test(record.fromPlanId)
    || typeof record.toPlanId !== 'string'
    || !GOAL_PLAN_ID.test(record.toPlanId)
    || record.fromPlanId === record.toPlanId
    || !safeInteger(record.generation)
    || Number(record.generation) < 1
    || typeof record.trigger !== 'string'
    || !TRIGGERS.has(
      record.trigger as GoalReplanTrigger,
    )
    || !safeReasonCode(record.reasonCode)
    || !safeInteger(record.requestedAtMs)
    || record.grantsExecutionAuthority !== false
    || record.grantsSensorAuthority !== false
    || record.grantsApprovalAuthority !== false
    || record.grantsCapabilityAuthority !== false
  ) {
    return null;
  }

  return Object.freeze({
    protocolVersion: '1.0',
    amendmentId:
      record.amendmentId as string,
    goalId: record.goalId as string,
    fromPlanId:
      record.fromPlanId as string,
    toPlanId: record.toPlanId as string,
    generation: record.generation as number,
    trigger:
      record.trigger as GoalReplanTrigger,
    reasonCode: record.reasonCode as string,
    requestedAtMs:
      record.requestedAtMs as number,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}

function fail(
  reason: GoalReplanDecision['reason'],
): GoalReplanDecision {
  return Object.freeze({
    accepted: false,
    reason,
    nextPlan: null,
    preservedStepIds: Object.freeze([]),
    replacedStepIds: Object.freeze([]),
    newStepIds: Object.freeze([]),
  });
}

function sameStep(
  left: GoalPlanStep,
  right: GoalPlanStep,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function exactCompletedPrefix(
  plan: GoalExecutionPlan,
  completedStepIds: readonly string[],
): boolean {
  if (
    completedStepIds.length > plan.steps.length
  ) {
    return false;
  }

  const seen = new Set<string>();

  for (
    let index = 0;
    index < completedStepIds.length;
    index += 1
  ) {
    const stepId = completedStepIds[index];

    if (
      typeof stepId !== 'string'
      || !GOAL_STEP_ID.test(stepId)
      || seen.has(stepId)
      || plan.steps[index]?.stepId !== stepId
    ) {
      return false;
    }

    seen.add(stepId);
  }

  return true;
}

export function validateGoalReplanTransition(
  goalInput: unknown,
  currentPlanInput: unknown,
  nextPlanInput: unknown,
  amendmentInput: unknown,
  completedStepIds: readonly string[],
  previousAmendmentGeneration: number,
  trustedNowMs: number,
): GoalReplanDecision {
  const goal =
    parseGoalExecutionSpec(goalInput);
  const currentValidation =
    validateGoalExecutionPlan(
      goalInput,
      currentPlanInput,
    );
  const nextValidation =
    validateGoalExecutionPlan(
      goalInput,
      nextPlanInput,
    );
  const amendment =
    parseGoalPlanAmendment(amendmentInput);

  if (
    !goal
    || !currentValidation.accepted
    || !currentValidation.value
    || !nextValidation.accepted
    || !nextValidation.value
    || !amendment
    || !Array.isArray(completedStepIds)
    || !safeInteger(previousAmendmentGeneration)
    || !safeInteger(trustedNowMs)
  ) {
    return fail('invalid_input');
  }

  const currentPlan =
    currentValidation.value;
  const nextPlan =
    nextValidation.value;

  if (
    amendment.goalId !== goal.goalId
    || amendment.fromPlanId
      !== currentPlan.planId
    || amendment.toPlanId !== nextPlan.planId
    || nextPlan.goalId !== currentPlan.goalId
    || nextPlan.sourceRequestId
      !== currentPlan.sourceRequestId
  ) {
    return fail('binding_mismatch');
  }

  if (
    amendment.generation
      !== previousAmendmentGeneration + 1
  ) {
    return fail('generation_mismatch');
  }

  if (
    amendment.requestedAtMs < currentPlan.generatedAtMs
    || amendment.requestedAtMs > trustedNowMs
    || nextPlan.generatedAtMs
      < amendment.requestedAtMs
    || nextPlan.generatedAtMs <= currentPlan.generatedAtMs
    || (
      goal.deadlineAtMs !== null
      && nextPlan.generatedAtMs > goal.deadlineAtMs
    )
  ) {
    return fail('time_invalid');
  }

  if (
    !exactCompletedPrefix(
      currentPlan,
      completedStepIds,
    )
  ) {
    return fail('completed_prefix_mismatch');
  }

  if (
    completedStepIds.length >= currentPlan.steps.length
    || completedStepIds.length >= nextPlan.steps.length
  ) {
    return fail('no_remaining_work');
  }

  for (
    let index = 0;
    index < completedStepIds.length;
    index += 1
  ) {
    const currentStep =
      currentPlan.steps[index];
    const nextStep =
      nextPlan.steps[index];

    if (
      !currentStep
      || !nextStep
      || !sameStep(currentStep, nextStep)
    ) {
      return fail('completed_step_mutated');
    }
  }

  const completed =
    new Set(completedStepIds);
  const unfinishedCurrent =
    new Set(
      currentPlan.steps
        .slice(completedStepIds.length)
        .map((step) => step.stepId),
    );

  for (
    const step
    of nextPlan.steps.slice(
      completedStepIds.length,
    )
  ) {
    if (
      unfinishedCurrent.has(step.stepId)
      && !completed.has(step.stepId)
    ) {
      return fail('unfinished_step_reused');
    }
  }

  return Object.freeze({
    accepted: true,
    reason: 'accepted',
    nextPlan,
    preservedStepIds:
      Object.freeze([...completedStepIds]),
    replacedStepIds:
      Object.freeze(
        currentPlan.steps
          .slice(completedStepIds.length)
          .map((step) => step.stepId),
      ),
    newStepIds:
      Object.freeze(
        nextPlan.steps
          .slice(completedStepIds.length)
          .map((step) => step.stepId),
      ),
  });
}
