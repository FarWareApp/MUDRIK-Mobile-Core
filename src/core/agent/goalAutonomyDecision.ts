import {
  safeInteger,
} from '../brain/brainSecurity';

import type {
  ToolExecutionOutcome,
} from '../tools/toolExecutionCoordinator';

import type {
  ResultVerificationDecision,
} from '../verification/resultVerifier';

export type GoalAutonomyAction =
  | 'accept_result'
  | 'gather_evidence'
  | 'replan'
  | 'rollback'
  | 'recover_runtime'
  | 'block';

export type GoalAutonomyDecisionInput =
  Readonly<{
    execution: ToolExecutionOutcome;
    verification:
      ResultVerificationDecision | null;
    verificationRequired: boolean;
    rollbackAvailable: boolean;
    budgetHealthy: boolean;
    runtimeTrusted: boolean;
    recoveryAvailable: boolean;
    repairCycles: number;
    maxRepairCycles: number;
    deadlineRemainingMs: number;
  }>;

export type GoalAutonomyDecision =
  Readonly<{
    action: GoalAutonomyAction;
    reason:
      | 'result_verified'
      | 'verification_not_required'
      | 'evidence_needed'
      | 'verification_contradicted'
      | 'execution_failed'
      | 'side_effect_uncertain'
      | 'repair_budget_exhausted'
      | 'resource_budget_exhausted'
      | 'deadline_exhausted'
      | 'runtime_untrusted'
      | 'verification_invalid';
  }>;

function validInput(
  input: GoalAutonomyDecisionInput,
): boolean {
  return (
    typeof input.execution === 'object'
    && input.execution !== null
    && typeof input.verificationRequired
      === 'boolean'
    && typeof input.rollbackAvailable
      === 'boolean'
    && typeof input.budgetHealthy
      === 'boolean'
    && typeof input.runtimeTrusted
      === 'boolean'
    && typeof input.recoveryAvailable
      === 'boolean'
    && safeInteger(input.repairCycles)
    && safeInteger(input.maxRepairCycles)
    && input.repairCycles
      <= input.maxRepairCycles
    && safeInteger(input.deadlineRemainingMs)
  );
}

function decision(
  action: GoalAutonomyAction,
  reason: GoalAutonomyDecision['reason'],
): GoalAutonomyDecision {
  return Object.freeze({
    action,
    reason,
  });
}

function canRepair(
  input: GoalAutonomyDecisionInput,
): boolean {
  return (
    input.budgetHealthy
    && input.deadlineRemainingMs > 0
    && input.repairCycles
      < input.maxRepairCycles
  );
}

export function decideGoalAutonomyAction(
  input: GoalAutonomyDecisionInput,
): GoalAutonomyDecision {
  if (!validInput(input)) {
    return decision(
      'block',
      'verification_invalid',
    );
  }

  if (!input.runtimeTrusted) {
    return input.recoveryAvailable
      ? decision(
          'recover_runtime',
          'runtime_untrusted',
        )
      : decision(
          'block',
          'runtime_untrusted',
        );
  }

  if (input.deadlineRemainingMs === 0) {
    return decision(
      'block',
      'deadline_exhausted',
    );
  }

  if (!input.budgetHealthy) {
    return decision(
      'block',
      'resource_budget_exhausted',
    );
  }

  if (
    input.execution.status
      === 'needs_reconciliation'
  ) {
    return input.rollbackAvailable
      ? decision(
          'rollback',
          'side_effect_uncertain',
        )
      : decision(
          'block',
          'side_effect_uncertain',
        );
  }

  if (input.execution.status === 'failed') {
    if (canRepair(input)) {
      return decision(
        'replan',
        'execution_failed',
      );
    }

    return decision(
      'block',
      'repair_budget_exhausted',
    );
  }

  if (!input.verificationRequired) {
    return decision(
      'accept_result',
      'verification_not_required',
    );
  }

  if (!input.verification) {
    return decision(
      'gather_evidence',
      'evidence_needed',
    );
  }

  if (input.verification.accepted) {
    return decision(
      'accept_result',
      'result_verified',
    );
  }

  if (
    input.verification.reason
      === 'contradicted'
  ) {
    if (
      input.execution.sideEffectCommitted
      && input.rollbackAvailable
    ) {
      return decision(
        'rollback',
        'verification_contradicted',
      );
    }

    return canRepair(input)
      ? decision(
          'replan',
          'verification_contradicted',
        )
      : decision(
          'block',
          'repair_budget_exhausted',
        );
  }

  if (
    [
      'invalid_input',
      'binding_mismatch',
      'evidence_time_invalid',
    ].includes(input.verification.reason)
  ) {
    return decision(
      'block',
      'verification_invalid',
    );
  }

  if (canRepair(input)) {
    return decision(
      'gather_evidence',
      'evidence_needed',
    );
  }

  return decision(
    'block',
    'repair_budget_exhausted',
  );
}
