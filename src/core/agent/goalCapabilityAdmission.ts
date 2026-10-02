import {
  safeInteger,
  safeReference,
} from '../brain/brainSecurity';

import {
  authorizeCapability,
  type CapabilityGrant,
  type ElevationLevel,
} from '../security/capabilityPolicy';

import {
  getCapabilityRisk,
  type CapabilityRisk,
} from '../security/capabilityRisk';

import type {
  CapabilityId,
} from '../security/capabilities';

import {
  parseGoalExecutionSpec,
} from './goalContract';

import {
  parseGoalPlanStep,
} from './goalPlan';

export type GoalCapabilityContext =
  Readonly<{
    resourceId?: string;
    resourcePath?: string;
    domain?: string;
    background?: boolean;
    elevation?: ElevationLevel;
  }>;

export type GoalCapabilityContextMap =
  Readonly<
    Partial<
      Record<
        CapabilityId,
        GoalCapabilityContext
      >
    >
  >;

export interface GoalApprovalAuthority {
  authorize(
    input: Readonly<{
      goalId: string;
      stepId: string;
      operationRef: string;
      trustedNowMs: number;
    }>,
  ):
    | Readonly<{
        allowed: true;
        approvalRef: string;
      }>
    | Readonly<{
        allowed: false;
        approvalRef: null;
      }>;
}

export type GoalStepAdmission =
  Readonly<{
    allowed: boolean;
    reason:
      | 'allowed'
      | 'invalid_input'
      | 'read_only_violation'
      | 'risk_underdeclared'
      | 'approval_required'
      | 'approval_denied'
      | 'capability_denied';
    grantIds: readonly string[];
    approvalRef: string | null;
    deniedCapability: CapabilityId | null;
  }>;

const RISK_RANK:
  Readonly<Record<CapabilityRisk, number>> =
    Object.freeze({
      low: 0,
      medium: 1,
      high: 2,
      critical: 3,
    });

function denied(
  reason: GoalStepAdmission['reason'],
  deniedCapability:
    CapabilityId | null = null,
): GoalStepAdmission {
  return Object.freeze({
    allowed: false,
    reason,
    grantIds: Object.freeze([]),
    approvalRef: null,
    deniedCapability,
  });
}

function validSubjectId(
  value: unknown,
): value is string {
  return (
    typeof value === 'string'
    && value.trim().length > 0
    && value.length <= 256
    && !value.includes('\0')
  );
}

export function authorizeGoalStepExecution(
  goalInput: unknown,
  stepInput: unknown,
  grants: readonly CapabilityGrant[],
  subjectId: string,
  trustedNowMs: number,
  contexts: GoalCapabilityContextMap = {},
  approvalAuthority:
    GoalApprovalAuthority | null = null,
): GoalStepAdmission {
  const goal =
    parseGoalExecutionSpec(goalInput);
  const step =
    parseGoalPlanStep(stepInput);

  if (
    !goal
    || !step
    || !Array.isArray(grants)
    || !validSubjectId(subjectId)
    || !safeInteger(trustedNowMs)
    || trustedNowMs < goal.createdAtMs
    || (
      goal.deadlineAtMs !== null
      && trustedNowMs > goal.deadlineAtMs
    )
  ) {
    return denied('invalid_input');
  }

  if (
    goal.sideEffectPolicy === 'read-only'
    && step.sideEffect
  ) {
    return denied('read_only_violation');
  }

  const riskUnderdeclared =
    step.requiredCapabilities.find(
      (capability) =>
        RISK_RANK[
          getCapabilityRisk(capability)
        ] > RISK_RANK[goal.risk],
    );

  if (riskUnderdeclared) {
    return denied(
      'risk_underdeclared',
      riskUnderdeclared,
    );
  }

  let approvalRef: string | null = null;

  if (step.requiresApproval) {
    if (!approvalAuthority) {
      return denied('approval_required');
    }

    let decision:
      ReturnType<
        GoalApprovalAuthority['authorize']
      >;

    try {
      decision =
        approvalAuthority.authorize({
          goalId: goal.goalId,
          stepId: step.stepId,
          operationRef:
            step.operationRef,
          trustedNowMs,
        });
    } catch {
      return denied('approval_denied');
    }

    if (
      !decision.allowed
      || !safeReference(
        decision.approvalRef,
        240,
      )
    ) {
      return denied('approval_denied');
    }

    approvalRef = decision.approvalRef;
  }

  const grantIds: string[] = [];

  for (
    const capability
    of step.requiredCapabilities
  ) {
    const context =
      contexts[capability] ?? {};

    const decision =
      authorizeCapability(
        {
          subjectId,
          capability,
          nowMs: trustedNowMs,
          ...context,
        },
        grants,
        trustedNowMs,
      );

    if (
      !decision.allowed
      || !decision.grantId
    ) {
      return denied(
        'capability_denied',
        capability,
      );
    }

    grantIds.push(decision.grantId);
  }

  return Object.freeze({
    allowed: true,
    reason: 'allowed',
    grantIds:
      Object.freeze(grantIds),
    approvalRef,
    deniedCapability: null,
  });
}
