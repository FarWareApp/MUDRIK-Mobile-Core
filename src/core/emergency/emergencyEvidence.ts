import {
  isIdentityId,
} from '../identity/identityIds';

import {
  parseTrustedEvaluationTime,
} from '../security/trustedEvaluationTime';

export type EmergencyEvidenceKind =
  | 'user_report'
  | 'motion'
  | 'heart_rate'
  | 'ecg'
  | 'oxygen'
  | 'respiratory'
  | 'microphone'
  | 'camera'
  | 'responsiveness'
  | 'location';

export type EmergencyEvidenceFinding =
  | 'help_requested'
  | 'severe_symptoms_reported'
  | 'user_reports_ok'
  | 'fall_detected'
  | 'prolonged_immobility'
  | 'motion_normal'
  | 'heart_rate_alert'
  | 'heart_rate_normal'
  | 'ecg_device_alert'
  | 'ecg_device_normal'
  | 'oxygen_alert'
  | 'oxygen_normal'
  | 'respiratory_alert'
  | 'respiratory_normal'
  | 'distress_phrase_detected'
  | 'response_detected'
  | 'collapse_pattern_detected'
  | 'gross_asymmetry_warning'
  | 'responsive'
  | 'unresponsive'
  | 'location_available'
  | 'location_unavailable';

export type EmergencyEvidence = Readonly<{
  emergencySessionId: string;
  evidenceId: string;
  sequence: number;
  accountId: string;
  sourceDeviceId: string;
  kind: EmergencyEvidenceKind;
  finding: EmergencyEvidenceFinding;
  observedAtMs: number;
  confidence: number;
  sensorId: string | null;
  medicalClaim: false;
  grantsAuthority: false;
}>;

export type EmergencyEvidenceFreshness =
  | 'fresh'
  | 'historical'
  | 'expired'
  | 'future'
  | 'invalid_time';

export type EmergencyEvidenceTimeEvaluation =
  Readonly<{
    accepted: boolean;
    freshness: EmergencyEvidenceFreshness;
    ageMs: number | null;
  }>;

const SESSION_ID =
  /^ems_[a-z0-9][a-z0-9_-]{15,63}$/;
const EVIDENCE_ID =
  /^eme_[a-z0-9][a-z0-9_-]{15,63}$/;

const SENSOR_ID =
  /^sens_[a-z0-9][a-z0-9_-]{15,63}$/;

const KEYS = new Set([
  'emergencySessionId',
  'evidenceId',
  'sequence',
  'accountId',
  'sourceDeviceId',
  'kind',
  'finding',
  'observedAtMs',
  'confidence',
  'sensorId',
]);

const FINDINGS_BY_KIND:
  Readonly<
    Record<
      EmergencyEvidenceKind,
      readonly EmergencyEvidenceFinding[]
    >
  > = Object.freeze({
    user_report: [
      'help_requested',
      'severe_symptoms_reported',
      'user_reports_ok',
    ],
    motion: [
      'fall_detected',
      'prolonged_immobility',
      'motion_normal',
    ],
    heart_rate: [
      'heart_rate_alert',
      'heart_rate_normal',
    ],
    ecg: [
      'ecg_device_alert',
      'ecg_device_normal',
    ],
    oxygen: [
      'oxygen_alert',
      'oxygen_normal',
    ],
    respiratory: [
      'respiratory_alert',
      'respiratory_normal',
    ],
    microphone: [
      'distress_phrase_detected',
      'response_detected',
    ],
    camera: [
      'collapse_pattern_detected',
      'gross_asymmetry_warning',
      'response_detected',
    ],
    responsiveness: [
      'responsive',
      'unresponsive',
    ],
    location: [
      'location_available',
      'location_unavailable',
    ],
  });

const FRESH_MS:
  Readonly<
    Record<EmergencyEvidenceKind, number>
  > = Object.freeze({
    user_report: 120_000,
    motion: 30_000,
    heart_rate: 30_000,
    ecg: 60_000,
    oxygen: 60_000,
    respiratory: 60_000,
    microphone: 15_000,
    camera: 15_000,
    responsiveness: 15_000,
    location: 60_000,
  });

const HISTORICAL_RETENTION_MS =
  15 * 60_000;

const SENSOR_KINDS:
  ReadonlySet<EmergencyEvidenceKind> =
  new Set([
    'motion',
    'heart_rate',
    'ecg',
    'oxygen',
    'respiratory',
    'microphone',
    'camera',
    'location',
  ]);

export function isEmergencySessionId(
  value: unknown,
): value is string {
  return (
    typeof value === 'string'
    && SESSION_ID.test(value)
  );
}

export function isEmergencyEvidenceId(
  value: unknown,
): value is string {
  return (
    typeof value === 'string'
    && EVIDENCE_ID.test(value)
  );
}

function isKind(
  value: unknown,
): value is EmergencyEvidenceKind {
  return (
    typeof value === 'string'
    && Object.prototype.hasOwnProperty.call(
      FINDINGS_BY_KIND,
      value,
    )
  );
}

function isFindingForKind(
  kind: EmergencyEvidenceKind,
  value: unknown,
): value is EmergencyEvidenceFinding {
  return (
    typeof value === 'string'
    && FINDINGS_BY_KIND[kind].includes(
      value as EmergencyEvidenceFinding,
    )
  );
}

function parseSensorId(
  value: unknown,
  sensorRequired: boolean,
): string | null | undefined {
  if (value === null) {
    return sensorRequired
      ? undefined
      : null;
  }

  if (
    typeof value !== 'string'
    || !SENSOR_ID.test(value)
  ) {
    return undefined;
  }

  return sensorRequired
    ? value
    : undefined;
}
export function parseEmergencyEvidence(
  input: unknown,
): EmergencyEvidence | null {
  if (
    typeof input !== 'object'
    || input === null
    || Array.isArray(input)
  ) {
    return null;
  }

  const record =
    input as Record<string, unknown>;

  if (
    Object.keys(record).length
      !== KEYS.size
    || Object.keys(record).some(
      (key) => !KEYS.has(key),
    )
    || !isEmergencySessionId(
      record.emergencySessionId,
    )
    || !isEmergencyEvidenceId(
      record.evidenceId,
    )
    || typeof record.sequence !== 'number'
    || !Number.isSafeInteger(
      record.sequence,
    )
    || record.sequence < 0
    || !isIdentityId(
      'account',
      record.accountId,
    )
    || !isIdentityId(
      'device',
      record.sourceDeviceId,
    )
    || !isKind(record.kind)
    || typeof record.observedAtMs !== 'number'
    || !Number.isSafeInteger(
      record.observedAtMs,
    )
    || record.observedAtMs < 0
    || typeof record.confidence !== 'number'
    || !Number.isFinite(
      record.confidence,
    )
    || record.confidence < 0
    || record.confidence > 1
  ) {
    return null;
  }

  const kind = record.kind;
  if (
    !isFindingForKind(
      kind,
      record.finding,
    )
  ) {
    return null;
  }

  const sensorId =
    parseSensorId(
      record.sensorId,
      SENSOR_KINDS.has(kind),
    );

  if (sensorId === undefined) {
    return null;
  }

  return Object.freeze({
    emergencySessionId:
      record.emergencySessionId,
    evidenceId: record.evidenceId,
    sequence: record.sequence,
    accountId: record.accountId,
    sourceDeviceId:
      record.sourceDeviceId,
    kind,
    finding: record.finding,
    observedAtMs:
      record.observedAtMs,
    confidence:
      record.confidence,
    sensorId,
    medicalClaim: false,
    grantsAuthority: false,
  });
}

export function evaluateEmergencyEvidenceTime(
  evidence: EmergencyEvidence,
  trustedEvaluationTimeInput: unknown,
): EmergencyEvidenceTimeEvaluation {
  const nowMs =
    parseTrustedEvaluationTime(
      trustedEvaluationTimeInput,
    );

  if (nowMs === null) {
    return Object.freeze({
      accepted: false,
      freshness: 'invalid_time',
      ageMs: null,
    });
  }

  if (
    evidence.observedAtMs
      > nowMs
  ) {
    return Object.freeze({
      accepted: false,
      freshness: 'future',
      ageMs: null,
    });
  }

  const ageMs =
    nowMs - evidence.observedAtMs;
  const freshMs =
    FRESH_MS[evidence.kind];

  if (ageMs <= freshMs) {
    return Object.freeze({
      accepted: true,
      freshness: 'fresh',
      ageMs,
    });
  }

  if (
    ageMs
      <= HISTORICAL_RETENTION_MS
  ) {
    return Object.freeze({
      accepted: true,
      freshness: 'historical',
      ageMs,
    });
  }

  return Object.freeze({
    accepted: false,
    freshness: 'expired',
    ageMs,
  });
}
