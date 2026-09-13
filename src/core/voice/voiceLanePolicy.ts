import type { CapabilityRisk } from '../security/capabilityRisk';

export type VoiceLaneDecision =
  | 'instant_candidate'
  | 'reasoning'
  | 'clarify'
  | 'reject';

export type VoiceLaneReason =
  | 'clear_low_risk_action'
  | 'clear_medium_risk_action'
  | 'high_risk_requires_reasoning'
  | 'critical_risk_requires_reasoning'
  | 'no_action_candidate'
  | 'ambiguous'
  | 'target_unresolved'
  | 'confidence_too_low'
  | 'transcript_not_final'
  | 'invalid_input';

export type VoiceLaneResult = Readonly<{
  lane: VoiceLaneDecision;
  reason: VoiceLaneReason;
  mayExecuteDirectly: false;
}>;

const RISKS: readonly CapabilityRisk[] = [
  'low',
  'medium',
  'high',
  'critical',
];

const INSTANT_CONFIDENCE_MIN = 0.92;
const CLARIFY_CONFIDENCE_MIN = 0.70;

function isProbability(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1
  );
}

function isRisk(value: unknown): value is CapabilityRisk {
  return typeof value === 'string' && RISKS.includes(value as CapabilityRisk);
}

function output(
  lane: VoiceLaneDecision,
  reason: VoiceLaneReason,
): VoiceLaneResult {
  return Object.freeze({
    lane,
    reason,
    mayExecuteDirectly: false,
  });
}

export function chooseVoiceLane(input: unknown): VoiceLaneResult {
  if (
    typeof input !== 'object' ||
    input === null ||
    Array.isArray(input)
  ) {
    return output('reject', 'invalid_input');
  }

  const record = input as Record<string, unknown>;
  const allowedKeys = new Set([
    'transcriptFinal',
    'intentConfidence',
    'ambiguous',
    'targetResolved',
    'hasActionCandidate',
    'capabilityRisk',
  ]);

  if (
    Object.keys(record).some((key) => !allowedKeys.has(key)) ||
    typeof record.transcriptFinal !== 'boolean' ||
    !isProbability(record.intentConfidence) ||
    typeof record.ambiguous !== 'boolean' ||
    typeof record.targetResolved !== 'boolean' ||
    typeof record.hasActionCandidate !== 'boolean' ||
    !isRisk(record.capabilityRisk)
  ) {
    return output('reject', 'invalid_input');
  }

  if (!record.transcriptFinal) {
    return output('reasoning', 'transcript_not_final');
  }

  if (record.intentConfidence < CLARIFY_CONFIDENCE_MIN) {
    return output('clarify', 'confidence_too_low');
  }

  if (record.ambiguous) {
    return output('clarify', 'ambiguous');
  }

  if (!record.targetResolved && record.hasActionCandidate) {
    return output('clarify', 'target_unresolved');
  }

  if (!record.hasActionCandidate) {
    return output('reasoning', 'no_action_candidate');
  }

  if (record.capabilityRisk === 'critical') {
    return output('reasoning', 'critical_risk_requires_reasoning');
  }

  if (record.capabilityRisk === 'high') {
    return output('reasoning', 'high_risk_requires_reasoning');
  }

  if (record.intentConfidence < INSTANT_CONFIDENCE_MIN) {
    return output('reasoning', 'confidence_too_low');
  }

  return output(
    'instant_candidate',
    record.capabilityRisk === 'low'
      ? 'clear_low_risk_action'
      : 'clear_medium_risk_action',
  );
}
