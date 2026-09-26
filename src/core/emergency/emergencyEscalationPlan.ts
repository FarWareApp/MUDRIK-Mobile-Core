import {
  parseTrustedEvaluationTime,
} from '../security/trustedEvaluationTime';

import {
  parseEmergencyGuardianConfig,
} from './emergencyGuardianConfig';

import {
  isEmergencyGuardianSessionState,
} from './emergencyGuardianSessionState';

import {
  isEmergencyResponsivenessCheck,
  isEmergencyResponsivenessEvaluationFor,
} from './emergencyResponsivenessCheck';

import {
  isEmergencyRiskAssessment,
} from './emergencyRiskAssessment';

import type {
  EmergencyGuardianConfig,
} from './emergencyGuardianConfig';

export type EmergencyEscalationStepKind =
  | 'request_user_confirmation'
  | 'notify_contact'
  | 'resolve_emergency_route'
  | 'simulate_contact_notification'
  | 'simulate_route_resolution';
export type EmergencyEscalationStep =
  Readonly<{
    kind: EmergencyEscalationStepKind;
    targetRef: string | null;
    requiredCapability:
      | 'emergency.contact.notify'
      | null;
    simulated: boolean;
  }>;

export type EmergencyEscalationPlan =
  Readonly<{
    emergencySessionId: string;
    accountId: string;
    generation: number;
    configId: string;
    configRevision: number;
    createdAtMs: number;
    simulationOnly: boolean;
    automaticEscalation: boolean;
    requiresUserConfirmation: boolean;
    steps: readonly EmergencyEscalationStep[];
    diagnosticClaim: false;
    grantsAuthority: false;
    performsExternalAction: false;
  }>;

export type EmergencyEscalationPlanResult =
  Readonly<{
    accepted: boolean;
    plan: EmergencyEscalationPlan | null;
    reason:
      | 'planned'
      | 'confirmation_required'
      | 'invalid_input'
      | 'guardian_disabled'
      | 'session_config_mismatch'
      | 'state_not_escalating'
      | 'risk_not_critical'
      | 'responsiveness_not_timed_out'
      | 'binding_mismatch';
    grantsAuthority: false;
    performsExternalAction: false;
  }>;

const INPUT_KEYS = new Set([
  'sessionState',
  'config',
  'riskAssessment',
  'responsivenessCheck',
  'responsivenessEvaluation',
]);

const issuedEscalationPlans =
  new WeakSet<object>();

function result(
  accepted: boolean,
  plan: EmergencyEscalationPlan | null,
  reason:
    EmergencyEscalationPlanResult['reason'],
): EmergencyEscalationPlanResult {
  return Object.freeze({
    accepted,
    plan,
    reason,
    grantsAuthority: false,
    performsExternalAction: false,
  });
}
export function isEmergencyEscalationPlan(
  value: unknown,
): value is EmergencyEscalationPlan {
  return (
    typeof value === 'object'
    && value !== null
    && issuedEscalationPlans.has(value)
  );
}

function configMatchesSession(
  config: EmergencyGuardianConfig,
  session: {
    readonly configId: string;
    readonly configRevision: number;
    readonly accountId: string;
    readonly mode: string;
    readonly simulationOnly: boolean;
  },
): boolean {
  return (
    config.configId === session.configId
    && config.revision
      === session.configRevision
    && config.accountId === session.accountId
    && config.mode === session.mode
    && config.simulationOnly
      === session.simulationOnly
  );
}

function step(
  kind: EmergencyEscalationStepKind,
  targetRef: string | null,
  requiredCapability:
    EmergencyEscalationStep['requiredCapability'],
  simulated: boolean,
): EmergencyEscalationStep {
  return Object.freeze({
    kind,
    targetRef,
    requiredCapability,
    simulated,
  });
}

function buildSteps(
  config: EmergencyGuardianConfig,
): readonly EmergencyEscalationStep[] {
  if (!config.automaticEscalation) {
    return Object.freeze([
      step(
        'request_user_confirmation',
        null,
        null,
        false,
      ),
    ]);
  }

  if (config.simulationOnly) {
    const simulatedContacts =
      config.emergencyContactRefs.map(
        (contactRef) =>
          step(
            'simulate_contact_notification',
            contactRef,
            null,
            true,
          ),
      );

    return Object.freeze([
      ...simulatedContacts,
      step(
        'simulate_route_resolution',
        null,
        null,
        true,
      ),
    ]);
  }
  const contacts =
    config.emergencyContactRefs.map(
      (contactRef) =>
        step(
          'notify_contact',
          contactRef,
          'emergency.contact.notify',
          false,
        ),
    );

  return Object.freeze([
    ...contacts,
    step(
      'resolve_emergency_route',
      null,
      null,
      false,
    ),
  ]);
}

export function planEmergencyEscalation(
  input: unknown,
  trustedEvaluationTimeInput: unknown,
): EmergencyEscalationPlanResult {
  const nowMs =
    parseTrustedEvaluationTime(
      trustedEvaluationTimeInput,
    );

  if (
    nowMs === null
    || typeof input !== 'object'
    || input === null
    || Array.isArray(input)
  ) {
    return result(
      false,
      null,
      'invalid_input',
    );
  }

  const record =
    input as Record<string, unknown>;

  if (
    Object.keys(record).length
      !== INPUT_KEYS.size
    || Object.keys(record).some(
      (key) => !INPUT_KEYS.has(key),
    )
    || !isEmergencyGuardianSessionState(
      record.sessionState,
    )
    || !isEmergencyRiskAssessment(
      record.riskAssessment,
    )
    || !isEmergencyResponsivenessCheck(
      record.responsivenessCheck,
    )
    || !isEmergencyResponsivenessEvaluationFor(
      record.responsivenessEvaluation,
      record.responsivenessCheck,
    )
  ) {
    return result(
      false,
      null,
      'invalid_input',
    );
  }

  const sessionState =
    record.sessionState;
  const session =
    sessionState.session;
  const state =
    sessionState.state;
  const risk =
    record.riskAssessment;
  const check =
    record.responsivenessCheck;
  const responsiveness =
    record.responsivenessEvaluation;
  const config =
    parseEmergencyGuardianConfig(
      record.config,
      nowMs,
    );

  if (!config) {
    return result(
      false,
      null,
      'invalid_input',
    );
  }

  if (!config.enabled) {
    return result(
      false,
      null,
      'guardian_disabled',
    );
  }

  if (!configMatchesSession(
    config,
    session,
  )) {
    return result(
      false,
      null,
      'session_config_mismatch',
    );
  }
  if (state.phase !== 'escalating') {
    return result(
      false,
      null,
      'state_not_escalating',
    );
  }

  if (
    risk.risk !== 'critical'
    || risk.recommendedEvent
      !== 'risk_critical'
    || risk.reason
      !== 'critical_corroborated'
  ) {
    return result(
      false,
      null,
      'risk_not_critical',
    );
  }

  if (
    responsiveness.status
      !== 'timed_out'
    || (
      responsiveness.reason
        !== 'timed_out'
      && responsiveness.reason
        !== 'late_response'
    )
  ) {
    return result(
      false,
      null,
      'responsiveness_not_timed_out',
    );
  }
  if (
    check.emergencySessionId
      !== session.emergencySessionId
    || check.accountId !== session.accountId
    || check.generation !== state.generation
    || check.configId !== config.configId
    || check.configRevision !== config.revision
    || check.simulationOnly
      !== session.simulationOnly
  ) {
    return result(
      false,
      null,
      'binding_mismatch',
    );
  }

  const plan: EmergencyEscalationPlan =
    Object.freeze({
      emergencySessionId:
        session.emergencySessionId,
      accountId: session.accountId,
      generation: state.generation,
      configId: config.configId,
      configRevision: config.revision,
      createdAtMs: nowMs,
      simulationOnly:
        session.simulationOnly,
      automaticEscalation:
        config.automaticEscalation,
      requiresUserConfirmation:
        !config.automaticEscalation,
      steps: buildSteps(config),
      diagnosticClaim: false,
      grantsAuthority: false,
      performsExternalAction: false,
    });
  issuedEscalationPlans.add(plan);

  return result(
    true,
    plan,
    config.automaticEscalation
      ? 'planned'
      : 'confirmation_required',
  );
}
