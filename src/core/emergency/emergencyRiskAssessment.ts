import {
  isIdentityId,
} from '../identity/identityIds';

import {
  parseTrustedEvaluationTime,
} from '../security/trustedEvaluationTime';

import {
  authorizeEmergencyEvidence,
} from './emergencyEvidenceAuthorization';

import {
  isEmergencySessionId,
  parseEmergencyEvidence,
} from './emergencyEvidence';

import {
  parseEmergencyGuardianConfig,
} from './emergencyGuardianConfig';

import type {
  EmergencyEvidence,
  EmergencyEvidenceFinding,
  EmergencyEvidenceKind,
} from './emergencyEvidence';

export type EmergencyRiskLevel =
  | 'normal'
  | 'watch'
  | 'check_user'
  | 'urgent'
  | 'critical'
  | 'unknown';

export type EmergencyRiskRecommendedEvent =
  | 'risk_watch'
  | 'request_check'
  | 'risk_urgent'
  | 'risk_critical';

export type EmergencyRiskAssessment =
  Readonly<{
    risk: EmergencyRiskLevel;
    confidence: number;
    recommendedEvent:
      EmergencyRiskRecommendedEvent | null;
    reason:
      | 'normal'
      | 'watch'
      | 'check_user'
      | 'urgent_user_report'
      | 'urgent_corroborated'
      | 'critical_corroborated'
      | 'conflicting_evidence'
      | 'historical_only'
      | 'no_authorized_evidence'
      | 'guardian_disabled'
      | 'invalid_input';
    supportingEvidenceIds:
      readonly string[];
    historicalEvidenceIds:
      readonly string[];
    rejectedEvidenceCount: number;
    diagnosticClaim: false;
    grantsAuthority: false;
    performsExternalAction: false;
  }>;

const INPUT_KEYS = new Set([
  'accountId',
  'emergencySessionId',
  'config',
  'candidates',
]);

const CANDIDATE_KEYS = new Set([
  'evidence',
  'collectorDeviceTrustInput',
  'capabilityGrants',
  'sensorAuthorization',
]);

const DIRECT_URGENT:
  ReadonlySet<EmergencyEvidenceFinding> =
  new Set([
    'help_requested',
    'severe_symptoms_reported',
  ]);

const ALERT_FINDINGS:
  ReadonlySet<EmergencyEvidenceFinding> =
  new Set([
    'fall_detected',
    'prolonged_immobility',
    'heart_rate_alert',
    'ecg_device_alert',
    'oxygen_alert',
    'respiratory_alert',
    'distress_phrase_detected',
    'collapse_pattern_detected',
    'gross_asymmetry_warning',
    'unresponsive',
  ]);

const NORMAL_FINDINGS:
  ReadonlySet<EmergencyEvidenceFinding> =
  new Set([
    'user_reports_ok',
    'motion_normal',
    'heart_rate_normal',
    'ecg_device_normal',
    'oxygen_normal',
    'respiratory_normal',
    'response_detected',
    'responsive',
  ]);

const CRITICAL_INCIDENT_FINDINGS:
  ReadonlySet<EmergencyEvidenceFinding> =
  new Set([
    'fall_detected',
    'prolonged_immobility',
    'collapse_pattern_detected',
  ]);

const CRITICAL_PHYSIOLOGICAL_FINDINGS:
  ReadonlySet<EmergencyEvidenceFinding> =
  new Set([
    'heart_rate_alert',
    'ecg_device_alert',
    'oxygen_alert',
    'respiratory_alert',
  ]);

type Candidate = Readonly<{
  evidence: unknown;
  collectorDeviceTrustInput: unknown;
  capabilityGrants: readonly unknown[];
  sensorAuthorization: unknown;
}>;

function result(
  risk: EmergencyRiskLevel,
  confidence: number,
  recommendedEvent:
    EmergencyRiskRecommendedEvent | null,
  reason:
    EmergencyRiskAssessment['reason'],
  supportingEvidenceIds:
    readonly string[] = [],
  historicalEvidenceIds:
    readonly string[] = [],
  rejectedEvidenceCount = 0,
): EmergencyRiskAssessment {
  return Object.freeze({
    risk,
    confidence,
    recommendedEvent,
    reason,
    supportingEvidenceIds:
      Object.freeze([
        ...supportingEvidenceIds,
      ]),
    historicalEvidenceIds:
      Object.freeze([
        ...historicalEvidenceIds,
      ]),
    rejectedEvidenceCount,
    diagnosticClaim: false,
    grantsAuthority: false,
    performsExternalAction: false,
  });
}

function parseCandidate(
  input: unknown,
): Candidate | null {
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
      !== CANDIDATE_KEYS.size
    || Object.keys(record).some(
      (key) => !CANDIDATE_KEYS.has(key),
    )
    || !Array.isArray(
      record.capabilityGrants,
    )
  ) {
    return null;
  }

  return Object.freeze({
    evidence: record.evidence,
    collectorDeviceTrustInput:
      record.collectorDeviceTrustInput,
    capabilityGrants:
      Object.freeze([
        ...record.capabilityGrants,
      ]),
    sensorAuthorization:
      record.sensorAuthorization,
  });
}

function sortedIds(
  evidence: readonly EmergencyEvidence[],
): readonly string[] {
  return Object.freeze(
    evidence
      .map((entry) => entry.evidenceId)
      .sort(),
  );
}

function maxConfidence(
  evidence: readonly EmergencyEvidence[],
): number {
  if (evidence.length === 0) {
    return 0;
  }

  return Math.max(
    ...evidence.map(
      (entry) => entry.confidence,
    ),
  );
}

function averageConfidence(
  evidence: readonly EmergencyEvidence[],
): number {
  if (evidence.length === 0) {
    return 0;
  }

  return (
    evidence.reduce(
      (sum, entry) =>
        sum + entry.confidence,
      0,
    ) / evidence.length
  );
}

function uniqueKinds(
  evidence: readonly EmergencyEvidence[],
): number {
  return new Set(
    evidence.map(
      (entry) => entry.kind,
    ),
  ).size;
}

function selectByFinding(
  evidence: readonly EmergencyEvidence[],
  findings:
    ReadonlySet<EmergencyEvidenceFinding>,
): EmergencyEvidence[] {
  return evidence.filter(
    (entry) =>
      findings.has(entry.finding),
  );
}

function hasStrongContradiction(
  evidence: readonly EmergencyEvidence[],
): boolean {
  const strongFindings = new Set(
    evidence
      .filter((entry) => entry.confidence >= 0.7)
      .map((entry) => entry.finding),
  );

  const conflictingPairs:
    readonly Readonly<[
      EmergencyEvidenceFinding,
      EmergencyEvidenceFinding,
    ]>[] = [
      ['responsive', 'unresponsive'],
      ['user_reports_ok', 'help_requested'],
      ['user_reports_ok', 'severe_symptoms_reported'],
      ['motion_normal', 'fall_detected'],
      ['motion_normal', 'prolonged_immobility'],
      ['heart_rate_normal', 'heart_rate_alert'],
      ['ecg_device_normal', 'ecg_device_alert'],
      ['oxygen_normal', 'oxygen_alert'],
      ['respiratory_normal', 'respiratory_alert'],
      ['response_detected', 'distress_phrase_detected'],
      ['response_detected', 'collapse_pattern_detected'],
    ];

  return conflictingPairs.some(
    ([left, right]) =>
      strongFindings.has(left)
      && strongFindings.has(right),
  );
}

function strongestCriticalSet(
  evidence: readonly EmergencyEvidence[],
): readonly EmergencyEvidence[] | null {
  const strongest = (
    findings: ReadonlySet<EmergencyEvidenceFinding>,
  ): EmergencyEvidence | null =>
    evidence
      .filter(
        (entry) =>
          findings.has(entry.finding)
          && entry.confidence >= 0.8,
      )
      .sort(
        (left, right) =>
          right.confidence - left.confidence
          || left.evidenceId.localeCompare(
            right.evidenceId,
          ),
      )[0] ?? null;

  const unresponsive = evidence
    .filter(
      (entry) =>
        entry.finding === 'unresponsive'
        && entry.confidence >= 0.8,
    )
    .sort(
      (left, right) =>
        right.confidence - left.confidence
        || left.evidenceId.localeCompare(
          right.evidenceId,
        ),
    )[0] ?? null;
  const incident = strongest(
    CRITICAL_INCIDENT_FINDINGS,
  );
  const physiological = strongest(
    CRITICAL_PHYSIOLOGICAL_FINDINGS,
  );

  if (!unresponsive || !incident || !physiological) {
    return null;
  }

  return Object.freeze([
    unresponsive,
    incident,
    physiological,
  ]);
}

function corroboratedUrgentSet(
  evidence: readonly EmergencyEvidence[],
): readonly EmergencyEvidence[] | null {
  const alerts =
    selectByFinding(
      evidence,
      ALERT_FINDINGS,
    )
      .filter(
        (entry) =>
          entry.confidence >= 0.7,
      )
      .sort(
        (left, right) =>
          right.confidence
            - left.confidence
          || left.evidenceId.localeCompare(
            right.evidenceId,
          ),
      );

  if (
    alerts.length < 2
    || uniqueKinds(alerts) < 2
  ) {
    return null;
  }

  const selected: EmergencyEvidence[] = [];
  const seenKinds =
    new Set<EmergencyEvidenceKind>();

  for (const entry of alerts) {
    if (!seenKinds.has(entry.kind)) {
      seenKinds.add(entry.kind);
      selected.push(entry);
    }

    if (selected.length === 2) {
      break;
    }
  }

  return selected.length === 2
    ? Object.freeze(selected)
    : null;
}
export function assessEmergencyRisk(
  input: unknown,
  trustedEvaluationTimeInput: unknown,
): EmergencyRiskAssessment {
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
      'unknown',
      0,
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
    || !isIdentityId(
      'account',
      record.accountId,
    )
    || !isEmergencySessionId(
      record.emergencySessionId,
    )
    || !Array.isArray(record.candidates)
    || record.candidates.length > 64
  ) {
    return result(
      'unknown',
      0,
      null,
      'invalid_input',
    );
  }

  const config =
    parseEmergencyGuardianConfig(
      record.config,
      nowMs,
    );

  if (
    !config
    || config.accountId
      !== record.accountId
  ) {
    return result(
      'unknown',
      0,
      null,
      'invalid_input',
    );
  }

  if (!config.enabled) {
    return result(
      'unknown',
      0,
      null,
      'guardian_disabled',
    );
  }

  const parsedCandidates: Candidate[] = [];

  for (const rawCandidate of record.candidates) {
    const candidate =
      parseCandidate(rawCandidate);

    if (!candidate) {
      return result(
        'unknown',
        0,
        null,
        'invalid_input',
      );
    }

    parsedCandidates.push(candidate);
  }
  const fresh: EmergencyEvidence[] = [];
  const historical: EmergencyEvidence[] = [];
  const seenEvidenceIds =
    new Set<string>();
  let rejectedEvidenceCount = 0;

  for (const candidate of parsedCandidates) {
    const parsedEvidence =
      parseEmergencyEvidence(
        candidate.evidence,
      );

    if (
      !parsedEvidence
      || seenEvidenceIds.has(
        parsedEvidence.evidenceId,
      )
    ) {
      return result(
        'unknown',
        0,
        null,
        'invalid_input',
      );
    }

    seenEvidenceIds.add(
      parsedEvidence.evidenceId,
    );
    const authorization =
      authorizeEmergencyEvidence(
        {
          accountId: record.accountId,
          expectedEmergencySessionId:
            record.emergencySessionId,
          config: record.config,
          collectorDeviceTrustInput:
            candidate
              .collectorDeviceTrustInput,
          evidence:
            candidate.evidence,
          capabilityGrants:
            candidate.capabilityGrants,
          sensorAuthorization:
            candidate.sensorAuthorization,
        },
        nowMs,
      );

    if (
      !authorization.accepted
      || !authorization.evidence
    ) {
      rejectedEvidenceCount += 1;
      continue;
    }

    if (
      authorization.freshness
        === 'historical'
    ) {
      historical.push(
        authorization.evidence,
      );
      continue;
    }

    if (
      authorization.freshness === 'fresh'
    ) {
      fresh.push(
        authorization.evidence,
      );
    }
  }

  fresh.sort(
    (left, right) =>
      left.evidenceId.localeCompare(
        right.evidenceId,
      ),
  );
  historical.sort(
    (left, right) =>
      left.evidenceId.localeCompare(
        right.evidenceId,
      ),
  );

  if (fresh.length === 0) {
    if (historical.length > 0) {
      return result(
        'unknown',
        0,
        null,
        'historical_only',
        [],
        sortedIds(historical),
        rejectedEvidenceCount,
      );
    }

    return result(
      'unknown',
      0,
      null,
      'no_authorized_evidence',
      [],
      [],
      rejectedEvidenceCount,
    );
  }

  if (
    hasStrongContradiction(fresh)
  ) {
    return result(
      'check_user',
      maxConfidence(fresh),
      'request_check',
      'conflicting_evidence',
      sortedIds(fresh),
      sortedIds(historical),
      rejectedEvidenceCount,
    );
  }

  const critical =
    strongestCriticalSet(fresh);

  if (critical) {
    return result(
      'critical',
      Math.min(
        ...critical.map(
          (entry) => entry.confidence,
        ),
      ),
      'risk_critical',
      'critical_corroborated',
      sortedIds(critical),
      sortedIds(historical),
      rejectedEvidenceCount,
    );
  }

  const directUrgent =
    fresh
      .filter(
        (entry) =>
          DIRECT_URGENT.has(
            entry.finding,
          ),
      )
      .sort(
        (left, right) =>
          right.confidence
            - left.confidence
          || left.evidenceId.localeCompare(
            right.evidenceId,
          ),
      );

  if (directUrgent.length > 0) {
    return result(
      'urgent',
      directUrgent[0].confidence,
      'risk_urgent',
      'urgent_user_report',
      sortedIds(directUrgent),
      sortedIds(historical),
      rejectedEvidenceCount,
    );
  }

  const corroboratedUrgent =
    corroboratedUrgentSet(fresh);

  if (corroboratedUrgent) {
    return result(
      'urgent',
      averageConfidence(
        corroboratedUrgent,
      ),
      'risk_urgent',
      'urgent_corroborated',
      sortedIds(
        corroboratedUrgent,
      ),
      sortedIds(historical),
      rejectedEvidenceCount,
    );
  }

  const alerts =
    selectByFinding(
      fresh,
      ALERT_FINDINGS,
    );

  if (alerts.length > 0) {
    const strongest =
      maxConfidence(alerts);

    if (strongest >= 0.55) {
      return result(
        'check_user',
        strongest,
        'request_check',
        'check_user',
        sortedIds(alerts),
        sortedIds(historical),
        rejectedEvidenceCount,
      );
    }

    return result(
      'watch',
      strongest,
      'risk_watch',
      'watch',
      sortedIds(alerts),
      sortedIds(historical),
      rejectedEvidenceCount,
    );
  }

  const normal =
    selectByFinding(
      fresh,
      NORMAL_FINDINGS,
    );

  if (normal.length > 0) {
    return result(
      'normal',
      maxConfidence(normal),
      null,
      'normal',
      sortedIds(normal),
      sortedIds(historical),
      rejectedEvidenceCount,
    );
  }

  return result(
    'unknown',
    0,
    null,
    'no_authorized_evidence',
    [],
    sortedIds(historical),
    rejectedEvidenceCount,
  );
}
