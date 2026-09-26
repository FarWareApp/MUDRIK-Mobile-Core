import {
  parseTrustedEvaluationTime,
} from '../security/trustedEvaluationTime';

import {
  isEmergencyEscalationPlan,
} from './emergencyEscalationPlan';

import {
  parseEmergencyGuardianConfig,
} from './emergencyGuardianConfig';

import {
  isEmergencyRiskAssessment,
} from './emergencyRiskAssessment';

export type EmergencyPacket =
  Readonly<{
    packetId: string;
    emergencySessionId: string;
    accountId: string;
    createdAtMs: number;
    category:
      'possible_critical_emergency';
    riskConfidence: number;
    responsiveness:
      'unresponsive_timeout';
    supportingEvidenceIds:
      readonly string[];
    locationRef: string | null;
    medicalProfileRef: string | null;
    simulated: boolean;
    diagnosticClaim: false;
    minimumNecessary: true;
    grantsAuthority: false;
    performsExternalAction: false;
  }>;
export type EmergencyPacketResult =
  Readonly<{
    accepted: boolean;
    packet: EmergencyPacket | null;
    reason:
      | 'built'
      | 'invalid_input'
      | 'session_config_mismatch'
      | 'risk_not_critical'
      | 'plan_not_eligible';
    grantsAuthority: false;
    performsExternalAction: false;
  }>;

const PACKET_ID =
  /^empkt_[a-z0-9][a-z0-9_-]{15,63}$/;

const LOCATION_REF =
  /^emloc_[a-z0-9][a-z0-9_-]{15,63}$/;

const INPUT_KEYS = new Set([
  'packetId',
  'plan',
  'config',
  'riskAssessment',
  'locationRef',
]);

const issuedEmergencyPackets =
  new WeakSet<object>();

function result(
  accepted: boolean,
  packet: EmergencyPacket | null,
  reason:
    EmergencyPacketResult['reason'],
): EmergencyPacketResult {
  return Object.freeze({
    accepted,
    packet,
    reason,
    grantsAuthority: false,
    performsExternalAction: false,
  });
}
export function isEmergencyPacket(
  value: unknown,
): value is EmergencyPacket {
  return (
    typeof value === 'object'
    && value !== null
    && issuedEmergencyPackets.has(value)
  );
}

function parseLocationRef(
  value: unknown,
): string | null | undefined {
  if (value === null) {
    return null;
  }

  return (
    typeof value === 'string'
    && LOCATION_REF.test(value)
  )
    ? value
    : undefined;
}

export function buildEmergencyPacket(
  input: unknown,
  trustedEvaluationTimeInput: unknown,
): EmergencyPacketResult {
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
    || typeof record.packetId !== 'string'
    || !PACKET_ID.test(record.packetId)
    || !isEmergencyEscalationPlan(
      record.plan,
    )
    || !isEmergencyRiskAssessment(
      record.riskAssessment,
    )
  ) {
    return result(
      false,
      null,
      'invalid_input',
    );
  }

  const plan = record.plan;
  const risk = record.riskAssessment;
  const config =
    parseEmergencyGuardianConfig(
      record.config,
      nowMs,
    );
  const locationRef =
    parseLocationRef(
      record.locationRef,
    );

  if (
    !config
    || locationRef === undefined
  ) {
    return result(
      false,
      null,
      'invalid_input',
    );
  }
  if (
    config.configId !== plan.configId
    || config.revision
      !== plan.configRevision
    || config.accountId
      !== plan.accountId
    || config.simulationOnly
      !== plan.simulationOnly
  ) {
    return result(
      false,
      null,
      'session_config_mismatch',
    );
  }

  if (
    risk.risk !== 'critical'
    || risk.reason
      !== 'critical_corroborated'
    || risk.diagnosticClaim !== false
  ) {
    return result(
      false,
      null,
      'risk_not_critical',
    );
  }

  if (
    plan.steps.length === 0
    || (
      !plan.simulationOnly
      && plan.requiresUserConfirmation
    )
  ) {
    return result(
      false,
      null,
      'plan_not_eligible',
    );
  }

  const packet: EmergencyPacket =
    Object.freeze({
      packetId: record.packetId,
      emergencySessionId:
        plan.emergencySessionId,
      accountId: plan.accountId,
      createdAtMs: nowMs,
      category:
        'possible_critical_emergency',
      riskConfidence:
        risk.confidence,
      responsiveness:
        'unresponsive_timeout',
      supportingEvidenceIds:
        Object.freeze([
          ...risk.supportingEvidenceIds,
        ]),
      locationRef:
        config.shareLocation
          ? locationRef
          : null,
      medicalProfileRef:
        config.shareMedicalProfile
          ? config.medicalProfileRef
          : null,
      simulated:
        plan.simulationOnly,
      diagnosticClaim: false,
      minimumNecessary: true,
      grantsAuthority: false,
      performsExternalAction: false,
    });

  issuedEmergencyPackets.add(packet);

  return result(
    true,
    packet,
    'built',
  );
}
