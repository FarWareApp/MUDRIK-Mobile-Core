import type {
  CapabilityGrant,
} from '../security/capabilityPolicy';

import type {
  RuntimeIntegrityDecision,
} from '../security/runtimeIntegrityAttestation';

import {
  authorizeRuntimeOperation,
  type RuntimeOperationClass,
} from '../security/runtimeTrustGate';

import {
  authorizeGoalStepExecution,
  type GoalApprovalAuthority,
  type GoalCapabilityContextMap,
} from './goalCapabilityAdmission';

import type {
  GoalExecutionSpec,
} from './goalContract';

import type {
  GoalExecutionPlan,
  GoalPlanStep,
} from './goalPlan';

import type {
  GoalWorkState,
} from './goalWorkQueue';

export type GoalWorkAuthorizationDecision =
  Readonly<{
    allowed: boolean;
    reason:
      | 'allowed'
      | 'runtime_untrusted'
      | 'goal_admission_denied'
      | 'binding_mismatch'
      | 'invalid_runtime_decision';
    runtimeReason: string | null;
    goalAdmissionReason: string | null;
    grantIds: readonly string[];
    approvalRef: string | null;
  }>;

export interface GoalWorkExecutionAuthorizationAuthority {
  authorize(
    input: Readonly<{
      goal: GoalExecutionSpec;
      plan: GoalExecutionPlan;
      step: GoalPlanStep;
      state: GoalWorkState;
      workerRef: string;
      trustedNowMs: number;
    }>,
  ): GoalWorkAuthorizationDecision;
}

const EXECUTE_CAPABILITIES =
  new Set([
    'terminal.execute',
    'browser.control',
    'device.control',
    'device.ring',
    'app.open',
    'app.close',
    'media.control',
    'media.transfer',
    'game.launch',
    'display.render',
    'display.companion.move',
    'home.light.control',
    'home.device.control',
    'home.access.control',
    'home.security.control',
    'emergency.contact.notify',
    'emergency.call.initiate',
    'security.session.revoke',
    'security.device.revoke',
    'security.capability.revoke',
  ]);

const WRITE_CAPABILITIES =
  new Set([
    'filesystem.write',
    'git.write',
    'clipboard.write',
  ]);

function operationClassFor(
  step: GoalPlanStep,
): RuntimeOperationClass {
  if (step.kind === 'repair') {
    return 'repair';
  }

  if (
    step.requiredCapabilities.includes(
      'secret.use',
    )
  ) {
    return 'credential';
  }

  if (
    step.requiredCapabilities.includes(
      'network.request',
    )
  ) {
    return 'network';
  }

  if (
    step.requiredCapabilities.some(
      (capability) =>
        EXECUTE_CAPABILITIES.has(capability),
    )
  ) {
    return 'execute';
  }

  if (
    step.requiredCapabilities.some(
      (capability) =>
        WRITE_CAPABILITIES.has(capability),
    )
  ) {
    return 'write';
  }

  return step.kind === 'verify'
    ? 'diagnostic'
    : 'read';
}

function denied(
  reason: GoalWorkAuthorizationDecision['reason'],
  runtimeReason: string | null = null,
  goalAdmissionReason: string | null = null,
): GoalWorkAuthorizationDecision {
  return Object.freeze({
    allowed: false,
    reason,
    runtimeReason,
    goalAdmissionReason,
    grantIds: Object.freeze([]),
    approvalRef: null,
  });
}

export class GoalRuntimeAuthorizationAuthority
implements GoalWorkExecutionAuthorizationAuthority {
  constructor(
    private readonly grants:
      readonly CapabilityGrant[],
    private readonly subjectId: string,
    private readonly contexts:
      GoalCapabilityContextMap,
    private readonly approvalAuthority:
      GoalApprovalAuthority | null,
    private readonly runtimeIntegrity:
      () => RuntimeIntegrityDecision,
  ) {}

  authorize(
    input: Readonly<{
      goal: GoalExecutionSpec;
      plan: GoalExecutionPlan;
      step: GoalPlanStep;
      state: GoalWorkState;
      workerRef: string;
      trustedNowMs: number;
    }>,
  ): GoalWorkAuthorizationDecision {
    const { goal, plan, step, state } = input;

    if (
      state.item.goalId !== goal.goalId
      || state.item.planId !== plan.planId
      || state.item.stepId !== step.stepId
      || state.item.operationRef
        !== step.operationRef
      || state.item.sideEffect
        !== step.sideEffect
    ) {
      return denied('binding_mismatch');
    }

    let integrity: RuntimeIntegrityDecision;

    try {
      integrity = this.runtimeIntegrity();
    } catch {
      return denied(
        'invalid_runtime_decision',
      );
    }

    const runtimeDecision =
      authorizeRuntimeOperation(
        integrity,
        operationClassFor(step),
        step.kind === 'repair',
      );

    if (!runtimeDecision.allowed) {
      return denied(
        'runtime_untrusted',
        runtimeDecision.reason,
      );
    }

    const goalAdmission =
      authorizeGoalStepExecution(
        goal,
        step,
        this.grants,
        this.subjectId,
        input.trustedNowMs,
        this.contexts,
        this.approvalAuthority,
      );

    if (!goalAdmission.allowed) {
      return denied(
        'goal_admission_denied',
        runtimeDecision.reason,
        goalAdmission.reason,
      );
    }

    return Object.freeze({
      allowed: true,
      reason: 'allowed',
      runtimeReason:
        runtimeDecision.reason,
      goalAdmissionReason:
        goalAdmission.reason,
      grantIds:
        Object.freeze([
          ...goalAdmission.grantIds,
        ]),
      approvalRef:
        goalAdmission.approvalRef,
    });
  }
}
