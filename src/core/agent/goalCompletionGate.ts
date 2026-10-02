import {
  safeInteger,
} from '../brain/brainSecurity';

import {
  parseGoalExecutionSpec,
} from './goalContract';

import {
  validateGoalExecutionPlan,
} from './goalPlan';

import {
  parseGoalWorkState,
  type GoalWorkState,
} from './goalWorkQueue';

import type {
  ResultVerificationDecision,
} from '../verification/resultVerifier';

export type GoalCompletionGateInput =
  Readonly<{
    goal: unknown;
    plan: unknown;
    workStates: readonly unknown[];
    finalVerification:
      ResultVerificationDecision | null;
    runtimeTrusted: boolean;
    rollbackPending: number;
    budgetHealthy: boolean;
    trustedNowMs: number;
  }>;

export type GoalCompletionDecision =
  Readonly<{
    accepted: boolean;
    reason:
      | 'complete'
      | 'invalid_input'
      | 'runtime_untrusted'
      | 'budget_exhausted'
      | 'rollback_pending'
      | 'deadline_exceeded'
      | 'work_missing'
      | 'work_duplicate'
      | 'work_incomplete'
      | 'work_failed'
      | 'work_reconciliation_required'
      | 'finalize_missing'
      | 'verification_missing'
      | 'verification_failed';
    completionEvidenceRefs:
      readonly string[];
  }>;

function decision(
  accepted: boolean,
  reason: GoalCompletionDecision['reason'],
  refs: readonly string[] = [],
): GoalCompletionDecision {
  return Object.freeze({
    accepted,
    reason,
    completionEvidenceRefs:
      Object.freeze([...refs]),
  });
}

function validFinalVerification(
  value: ResultVerificationDecision,
): boolean {
  const reasons =
    new Set([
      'verified',
      'verification_not_required',
      'invalid_input',
      'binding_mismatch',
      'evidence_time_invalid',
      'contradicted',
      'insufficient_independence',
      'insufficient_confidence',
      'model_only_forbidden',
      'deterministic_evidence_missing',
      'state_readback_missing',
    ]);

  return (
    typeof value === 'object'
    && value !== null
    && typeof value.accepted === 'boolean'
    && typeof value.reason === 'string'
    && reasons.has(value.reason)
    && safeInteger(
      value.independentPasses,
    )
    && (
      value.aggregateConfidence === null
      || (
        safeInteger(
          value.aggregateConfidence,
        )
        && value.aggregateConfidence
          <= 1000
      )
    )
    && Array.isArray(
      value.acceptedEvidenceIds,
    )
    && Array.isArray(
      value.rejectingEvidenceIds,
    )
    && new Set(
      value.acceptedEvidenceIds,
    ).size
      === value.acceptedEvidenceIds.length
    && new Set(
      value.rejectingEvidenceIds,
    ).size
      === value.rejectingEvidenceIds.length
    && value.acceptedEvidenceIds.every(
      (item) =>
        typeof item === 'string'
        && item.length >= 3
        && item.length <= 240,
    )
    && value.rejectingEvidenceIds.every(
      (item) =>
        typeof item === 'string'
        && item.length >= 3
        && item.length <= 240,
    )
    && (
      value.accepted
        ? [
            'verified',
            'verification_not_required',
          ].includes(value.reason)
        : ![
            'verified',
            'verification_not_required',
          ].includes(value.reason)
    )
  );
}

function verificationRequired(
  risk: 'low' | 'medium' | 'high' | 'critical',
  verification: 'none' | 'standard' | 'strict',
): boolean {
  return (
    verification !== 'none'
    || risk === 'high'
    || risk === 'critical'
  );
}

export function evaluateGoalCompletion(
  input: GoalCompletionGateInput,
): GoalCompletionDecision {
  const goal =
    parseGoalExecutionSpec(input.goal);
  const planValidation =
    validateGoalExecutionPlan(
      input.goal,
      input.plan,
    );

  if (
    !goal
    || !planValidation.accepted
    || !planValidation.value
    || !Array.isArray(input.workStates)
    || input.workStates.length > 100_000
    || typeof input.runtimeTrusted !== 'boolean'
    || !safeInteger(input.rollbackPending)
    || input.rollbackPending > 10_000
    || typeof input.budgetHealthy !== 'boolean'
    || !safeInteger(input.trustedNowMs)
  ) {
    return decision(
      false,
      'invalid_input',
    );
  }

  if (!input.runtimeTrusted) {
    return decision(
      false,
      'runtime_untrusted',
    );
  }

  if (!input.budgetHealthy) {
    return decision(
      false,
      'budget_exhausted',
    );
  }

  if (input.rollbackPending > 0) {
    return decision(
      false,
      'rollback_pending',
    );
  }

  if (
    goal.deadlineAtMs !== null
    && input.trustedNowMs
      > goal.deadlineAtMs
  ) {
    return decision(
      false,
      'deadline_exceeded',
    );
  }

  const plan = planValidation.value;
  const planStepIds =
    new Set(
      plan.steps.map(
        (step) => step.stepId,
      ),
    );
  const byStep =
    new Map<string, GoalWorkState>();

  for (const raw of input.workStates) {
    const state =
      parseGoalWorkState(raw);

    if (
      !state
      || state.item.goalId !== goal.goalId
      || state.item.planId !== plan.planId
      || !planStepIds.has(
        state.item.stepId,
      )
    ) {
      return decision(
        false,
        'invalid_input',
      );
    }

    if (
      byStep.has(state.item.stepId)
    ) {
      return decision(
        false,
        'work_duplicate',
      );
    }

    byStep.set(
      state.item.stepId,
      state,
    );
  }

  if (
    byStep.size !== plan.steps.length
  ) {
    return decision(
      false,
      'work_missing',
    );
  }

  for (const step of plan.steps) {
    const state =
      byStep.get(step.stepId);

    if (!state) {
      return decision(
        false,
        'work_missing',
      );
    }

    if (state.status === 'dead_letter') {
      return decision(
        false,
        'work_failed',
      );
    }

    if (
      state.status
        === 'reconciliation_required'
    ) {
      return decision(
        false,
        'work_reconciliation_required',
      );
    }

    if (state.status !== 'completed') {
      return decision(
        false,
        'work_incomplete',
      );
    }

    if (
      state.completionEvidenceRef
        === null
    ) {
      return decision(
        false,
        'work_incomplete',
      );
    }
  }

  const finalizeStep =
    plan.steps[
      plan.steps.length - 1
    ];

  if (
    !finalizeStep
    || finalizeStep.kind !== 'finalize'
    || byStep.get(
      finalizeStep.stepId,
    )?.status !== 'completed'
  ) {
    return decision(
      false,
      'finalize_missing',
    );
  }

  if (
    verificationRequired(
      goal.risk,
      goal.verification,
    )
  ) {
    if (!input.finalVerification) {
      return decision(
        false,
        'verification_missing',
      );
    }

    if (
      !validFinalVerification(
        input.finalVerification,
      )
    ) {
      return decision(
        false,
        'invalid_input',
      );
    }

    if (
      !input.finalVerification.accepted
    ) {
      return decision(
        false,
        'verification_failed',
      );
    }
  }

  const refs =
    plan.steps.map(
      (step) =>
        byStep.get(step.stepId)
          ?.completionEvidenceRef,
    );

  if (
    refs.some(
      (value) =>
        typeof value !== 'string',
    )
  ) {
    return decision(
      false,
      'work_incomplete',
    );
  }

  return decision(
    true,
    'complete',
    refs as readonly string[],
  );
}
