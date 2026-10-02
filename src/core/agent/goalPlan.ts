import {
  exactObject,
  safeReference,
} from '../brain/brainSecurity';

import {
  GOAL_ID,
  GOAL_PLAN_ID,
  GOAL_STEP_ID,
  parseGoalExecutionSpec,
} from './goalContract';

export type GoalStepKind =
  | 'reason'
  | 'retrieve'
  | 'tool'
  | 'verify'
  | 'repair'
  | 'finalize';

export type GoalPlanStep =
  Readonly<{
    stepId: string;
    ordinal: number;
    kind: GoalStepKind;
    operationRef: string;
    dependsOn: readonly string[];
    capabilityRefs: readonly string[];
    sideEffect: boolean;
    requiresApproval: boolean;
    rollbackRef: string | null;
    verificationRef: string | null;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

export type GoalExecutionPlan =
  Readonly<{
    protocolVersion: '1.0';
    planId: string;
    goalId: string;
    sourceRequestId: string;
    generatedAtMs: number;
    steps: readonly GoalPlanStep[];
    providerIndependent: true;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

export type GoalPlanValidation =
  Readonly<{
    accepted: boolean;
    reason:
      | 'valid'
      | 'invalid_plan'
      | 'goal_mismatch'
      | 'step_budget_exceeded'
      | 'dependency_invalid'
      | 'side_effect_forbidden'
      | 'approval_required'
      | 'verification_missing'
      | 'finalize_invalid';
    value: GoalExecutionPlan | null;
  }>;

const STEP_KINDS =
  new Set<GoalStepKind>([
    'reason',
    'retrieve',
    'tool',
    'verify',
    'repair',
    'finalize',
  ]);

const STEP_KEYS =
  new Set([
    'stepId',
    'ordinal',
    'kind',
    'operationRef',
    'dependsOn',
    'capabilityRefs',
    'sideEffect',
    'requiresApproval',
    'rollbackRef',
    'verificationRef',
    'grantsExecutionAuthority',
    'grantsSensorAuthority',
    'grantsApprovalAuthority',
    'grantsCapabilityAuthority',
  ]);

const PLAN_KEYS =
  new Set([
    'protocolVersion',
    'planId',
    'goalId',
    'sourceRequestId',
    'generatedAtMs',
    'steps',
    'providerIndependent',
    'grantsExecutionAuthority',
    'grantsSensorAuthority',
    'grantsApprovalAuthority',
    'grantsCapabilityAuthority',
  ]);

function exactStrings(
  value: unknown,
  pattern: RegExp | null,
  maxItems: number,
): readonly string[] | null {
  if (
    !Array.isArray(value)
    || value.length > maxItems
  ) {
    return null;
  }

  const output: string[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    if (
      typeof item !== 'string'
      || (
        pattern
          ? !pattern.test(item)
          : !safeReference(item, 160)
      )
      || seen.has(item)
    ) {
      return null;
    }

    seen.add(item);
    output.push(item);
  }

  return Object.freeze(output);
}

export function parseGoalPlanStep(
  input: unknown,
): GoalPlanStep | null {
  const record = exactObject(input, STEP_KEYS);

  if (
    !record
    || typeof record.stepId !== 'string'
    || !GOAL_STEP_ID.test(record.stepId)
    || !Number.isSafeInteger(record.ordinal)
    || Number(record.ordinal) < 1
    || Number(record.ordinal) > 64
    || typeof record.kind !== 'string'
    || !STEP_KINDS.has(record.kind as GoalStepKind)
    || !safeReference(record.operationRef, 240)
    || typeof record.sideEffect !== 'boolean'
    || typeof record.requiresApproval !== 'boolean'
    || (
      record.rollbackRef !== null
      && !safeReference(record.rollbackRef, 240)
    )
    || (
      record.verificationRef !== null
      && !safeReference(record.verificationRef, 240)
    )
    || record.grantsExecutionAuthority !== false
    || record.grantsSensorAuthority !== false
    || record.grantsApprovalAuthority !== false
    || record.grantsCapabilityAuthority !== false
  ) {
    return null;
  }

  const dependsOn =
    exactStrings(record.dependsOn, GOAL_STEP_ID, 63);
  const capabilityRefs =
    exactStrings(record.capabilityRefs, null, 32);

  if (!dependsOn || !capabilityRefs) {
    return null;
  }

  if (
    record.sideEffect === false
    && record.requiresApproval === true
  ) {
    return null;
  }

  return Object.freeze({
    stepId: record.stepId as string,
    ordinal: record.ordinal as number,
    kind: record.kind as GoalStepKind,
    operationRef: record.operationRef as string,
    dependsOn,
    capabilityRefs,
    sideEffect: record.sideEffect as boolean,
    requiresApproval:
      record.requiresApproval as boolean,
    rollbackRef: record.rollbackRef as string | null,
    verificationRef:
      record.verificationRef as string | null,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}

export function parseGoalExecutionPlan(
  input: unknown,
): GoalExecutionPlan | null {
  const record = exactObject(input, PLAN_KEYS);

  if (
    !record
    || record.protocolVersion !== '1.0'
    || typeof record.planId !== 'string'
    || !GOAL_PLAN_ID.test(record.planId)
    || typeof record.goalId !== 'string'
    || !GOAL_ID.test(record.goalId)
    || typeof record.sourceRequestId !== 'string'
    || !/^brain_request_[a-z0-9][a-z0-9_-]{15,127}$/
      .test(record.sourceRequestId)
    || !Number.isSafeInteger(record.generatedAtMs)
    || Number(record.generatedAtMs) < 0
    || !Array.isArray(record.steps)
    || record.steps.length < 1
    || record.steps.length > 64
    || record.providerIndependent !== true
    || record.grantsExecutionAuthority !== false
    || record.grantsSensorAuthority !== false
    || record.grantsApprovalAuthority !== false
    || record.grantsCapabilityAuthority !== false
  ) {
    return null;
  }

  const steps: GoalPlanStep[] = [];

  for (const item of record.steps) {
    const step = parseGoalPlanStep(item);
    if (!step) {
      return null;
    }
    steps.push(step);
  }

  return Object.freeze({
    protocolVersion: '1.0',
    planId: record.planId as string,
    goalId: record.goalId as string,
    sourceRequestId: record.sourceRequestId as string,
    generatedAtMs: record.generatedAtMs as number,
    steps: Object.freeze(steps),
    providerIndependent: true,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}

function fail(
  reason: GoalPlanValidation['reason'],
): GoalPlanValidation {
  return Object.freeze({
    accepted: false,
    reason,
    value: null,
  });
}

export function validateGoalExecutionPlan(
  goalInput: unknown,
  planInput: unknown,
): GoalPlanValidation {
  const goal =
    parseGoalExecutionSpec(goalInput);
  const plan =
    parseGoalExecutionPlan(planInput);

  if (!goal || !plan) {
    return fail('invalid_plan');
  }

  if (
    plan.goalId !== goal.goalId
    || plan.sourceRequestId !== goal.sourceRequestId
    || plan.generatedAtMs < goal.createdAtMs
    || (
      goal.deadlineAtMs !== null
      && plan.generatedAtMs > goal.deadlineAtMs
    )
  ) {
    return fail('goal_mismatch');
  }

  if (plan.steps.length > goal.maxSteps) {
    return fail('step_budget_exceeded');
  }

  const stepIds = new Set<string>();

  for (let index = 0; index < plan.steps.length; index += 1) {
    const step = plan.steps[index];

    if (
      step.ordinal !== index + 1
      || stepIds.has(step.stepId)
      || step.dependsOn.some(
        (dependency) => !stepIds.has(dependency),
      )
    ) {
      return fail('dependency_invalid');
    }

    stepIds.add(step.stepId);

    if (
      goal.sideEffectPolicy === 'read-only'
      && step.sideEffect
    ) {
      return fail('side_effect_forbidden');
    }

    if (
      step.sideEffect
      && !step.requiresApproval
    ) {
      return fail('approval_required');
    }
  }

  const finalizeSteps =
    plan.steps.filter(
      (step) => step.kind === 'finalize',
    );

  if (
    finalizeSteps.length !== 1
    || finalizeSteps[0]?.ordinal !== plan.steps.length
    || finalizeSteps[0]?.sideEffect
  ) {
    return fail('finalize_invalid');
  }

  const verificationCount =
    plan.steps.filter(
      (step) => step.kind === 'verify',
    ).length;

  if (
    (goal.verification === 'standard'
      && verificationCount < 1)
    || (goal.verification === 'strict'
      && verificationCount < 2)
  ) {
    return fail('verification_missing');
  }

  return Object.freeze({
    accepted: true,
    reason: 'valid',
    value: plan,
  });
}
