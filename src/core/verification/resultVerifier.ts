import {
  exactObject,
  safeInteger,
  safeReference,
} from '../brain/brainSecurity';

import {
  GOAL_ID,
  GOAL_PLAN_ID,
  GOAL_STEP_ID,
  type GoalVerificationMode,
} from '../agent/goalContract';

import type {
  CapabilityRisk,
} from '../security/capabilityRisk';

const BODY =
  '[a-z0-9][a-z0-9_-]{15,127}';

const EVIDENCE_ID =
  new RegExp(
    '^verification_evidence_' + BODY + '$',
  );

export type VerificationEvidenceKind =
  | 'deterministic_test'
  | 'state_readback'
  | 'tool_receipt'
  | 'external_truth'
  | 'integrity_attestation'
  | 'model_review'
  | 'user_confirmation';

export type VerificationVerdict =
  | 'pass'
  | 'fail'
  | 'unknown';

export type ResultVerificationEvidence =
  Readonly<{
    protocolVersion: '1.0';
    evidenceId: string;
    goalId: string;
    planId: string;
    stepId: string;
    resultRef: string;
    kind: VerificationEvidenceKind;
    sourceRef: string;
    independentGroupRef: string;
    verdict: VerificationVerdict;
    confidenceScore: number;
    observedAtMs: number;
    expiresAtMs: number | null;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

export type ResultVerificationSubject =
  Readonly<{
    goalId: string;
    planId: string;
    stepId: string;
    resultRef: string;
    risk: CapabilityRisk;
    sideEffect: boolean;
    verification: GoalVerificationMode;
  }>;

export type ResultVerificationPolicy =
  Readonly<{
    minIndependentPasses: number;
    minAggregateConfidence: number;
    maxEvidenceAgeMs: number;
    failureVetoConfidence: number;
    requireDeterministicForSideEffect: boolean;
    requireStateReadbackForSideEffect: boolean;
    allowModelOnly: boolean;
  }>;

export type ResultVerificationDecision =
  Readonly<{
    accepted: boolean;
    reason:
      | 'verified'
      | 'verification_not_required'
      | 'invalid_input'
      | 'binding_mismatch'
      | 'evidence_time_invalid'
      | 'contradicted'
      | 'insufficient_independence'
      | 'insufficient_confidence'
      | 'model_only_forbidden'
      | 'deterministic_evidence_missing'
      | 'state_readback_missing';
    independentPasses: number;
    aggregateConfidence: number | null;
    acceptedEvidenceIds: readonly string[];
    rejectingEvidenceIds: readonly string[];
  }>;

const KINDS =
  new Set<VerificationEvidenceKind>([
    'deterministic_test',
    'state_readback',
    'tool_receipt',
    'external_truth',
    'integrity_attestation',
    'model_review',
    'user_confirmation',
  ]);

const VERDICTS =
  new Set<VerificationVerdict>([
    'pass',
    'fail',
    'unknown',
  ]);

const RISKS =
  new Set<CapabilityRisk>([
    'low',
    'medium',
    'high',
    'critical',
  ]);

const VERIFICATION =
  new Set<GoalVerificationMode>([
    'none',
    'standard',
    'strict',
  ]);

const EVIDENCE_KEYS =
  new Set([
    'protocolVersion',
    'evidenceId',
    'goalId',
    'planId',
    'stepId',
    'resultRef',
    'kind',
    'sourceRef',
    'independentGroupRef',
    'verdict',
    'confidenceScore',
    'observedAtMs',
    'expiresAtMs',
    'grantsExecutionAuthority',
    'grantsSensorAuthority',
    'grantsApprovalAuthority',
    'grantsCapabilityAuthority',
  ]);

const TRUST_WEIGHT:
  Readonly<Record<
    VerificationEvidenceKind,
    number
  >> =
  Object.freeze({
    deterministic_test: 1000,
    state_readback: 1000,
    tool_receipt: 850,
    external_truth: 950,
    integrity_attestation: 1000,
    model_review: 650,
    user_confirmation: 900,
  });

function score(
  value: unknown,
): value is number {
  return (
    safeInteger(value)
    && Number(value) <= 1000
  );
}

export function parseResultVerificationEvidence(
  input: unknown,
): ResultVerificationEvidence | null {
  const record =
    exactObject(input, EVIDENCE_KEYS);

  if (
    !record
    || record.protocolVersion !== '1.0'
    || typeof record.evidenceId !== 'string'
    || !EVIDENCE_ID.test(record.evidenceId)
    || typeof record.goalId !== 'string'
    || !GOAL_ID.test(record.goalId)
    || typeof record.planId !== 'string'
    || !GOAL_PLAN_ID.test(record.planId)
    || typeof record.stepId !== 'string'
    || !GOAL_STEP_ID.test(record.stepId)
    || !safeReference(record.resultRef, 240)
    || typeof record.kind !== 'string'
    || !KINDS.has(
      record.kind as VerificationEvidenceKind,
    )
    || !safeReference(record.sourceRef, 240)
    || !safeReference(
      record.independentGroupRef,
      240,
    )
    || typeof record.verdict !== 'string'
    || !VERDICTS.has(
      record.verdict as VerificationVerdict,
    )
    || !score(record.confidenceScore)
    || !safeInteger(record.observedAtMs)
    || (
      record.expiresAtMs !== null
      && (
        !safeInteger(record.expiresAtMs)
        || Number(record.expiresAtMs)
          <= Number(record.observedAtMs)
      )
    )
    || record.grantsExecutionAuthority !== false
    || record.grantsSensorAuthority !== false
    || record.grantsApprovalAuthority !== false
    || record.grantsCapabilityAuthority !== false
  ) {
    return null;
  }

  return Object.freeze({
    protocolVersion: '1.0',
    evidenceId: record.evidenceId as string,
    goalId: record.goalId as string,
    planId: record.planId as string,
    stepId: record.stepId as string,
    resultRef: record.resultRef as string,
    kind:
      record.kind as VerificationEvidenceKind,
    sourceRef: record.sourceRef as string,
    independentGroupRef:
      record.independentGroupRef as string,
    verdict:
      record.verdict as VerificationVerdict,
    confidenceScore:
      record.confidenceScore as number,
    observedAtMs:
      record.observedAtMs as number,
    expiresAtMs:
      record.expiresAtMs as number | null,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}

function validSubject(
  subject: ResultVerificationSubject,
): boolean {
  return (
    GOAL_ID.test(subject.goalId)
    && GOAL_PLAN_ID.test(subject.planId)
    && GOAL_STEP_ID.test(subject.stepId)
    && safeReference(subject.resultRef, 240)
    && RISKS.has(subject.risk)
    && typeof subject.sideEffect === 'boolean'
    && VERIFICATION.has(subject.verification)
  );
}

export function validateResultVerificationPolicy(
  policy: ResultVerificationPolicy,
): boolean {
  return (
    safeInteger(policy.minIndependentPasses)
    && policy.minIndependentPasses >= 1
    && policy.minIndependentPasses <= 8
    && score(policy.minAggregateConfidence)
    && safeInteger(policy.maxEvidenceAgeMs)
    && policy.maxEvidenceAgeMs >= 1_000
    && policy.maxEvidenceAgeMs
      <= 24 * 60 * 60 * 1000
    && score(policy.failureVetoConfidence)
    && typeof policy.requireDeterministicForSideEffect
      === 'boolean'
    && typeof policy.requireStateReadbackForSideEffect
      === 'boolean'
    && typeof policy.allowModelOnly === 'boolean'
  );
}

function emptyDecision(
  accepted: boolean,
  reason: ResultVerificationDecision['reason'],
): ResultVerificationDecision {
  return Object.freeze({
    accepted,
    reason,
    independentPasses: 0,
    aggregateConfidence: null,
    acceptedEvidenceIds: Object.freeze([]),
    rejectingEvidenceIds: Object.freeze([]),
  });
}

function bindingMatches(
  subject: ResultVerificationSubject,
  evidence: ResultVerificationEvidence,
): boolean {
  return (
    evidence.goalId === subject.goalId
    && evidence.planId === subject.planId
    && evidence.stepId === subject.stepId
    && evidence.resultRef === subject.resultRef
  );
}

export function evaluateResultVerification(
  subject: ResultVerificationSubject,
  evidenceInputs: readonly unknown[],
  policy: ResultVerificationPolicy,
  trustedNowMs: number,
): ResultVerificationDecision {
  if (
    !validSubject(subject)
    || !validateResultVerificationPolicy(policy)
    || !safeInteger(trustedNowMs)
    || !Array.isArray(evidenceInputs)
    || evidenceInputs.length > 256
  ) {
    return emptyDecision(
      false,
      'invalid_input',
    );
  }

  if (
    subject.verification === 'none'
    && !subject.sideEffect
    && subject.risk === 'low'
  ) {
    return emptyDecision(
      true,
      'verification_not_required',
    );
  }

  const evidence:
    ResultVerificationEvidence[] = [];
  const evidenceIds = new Set<string>();

  for (const raw of evidenceInputs) {
    const parsed =
      parseResultVerificationEvidence(raw);

    if (
      !parsed
      || evidenceIds.has(parsed.evidenceId)
    ) {
      return emptyDecision(
        false,
        'invalid_input',
      );
    }

    if (!bindingMatches(subject, parsed)) {
      return emptyDecision(
        false,
        'binding_mismatch',
      );
    }

    if (
      parsed.observedAtMs > trustedNowMs
      || trustedNowMs - parsed.observedAtMs
        > policy.maxEvidenceAgeMs
      || (
        parsed.expiresAtMs !== null
        && parsed.expiresAtMs <= trustedNowMs
      )
    ) {
      return emptyDecision(
        false,
        'evidence_time_invalid',
      );
    }

    evidenceIds.add(parsed.evidenceId);
    evidence.push(parsed);
  }

  const rejecting =
    evidence.filter(
      (item) =>
        item.verdict === 'fail'
        && item.confidenceScore
          >= policy.failureVetoConfidence,
    );

  if (rejecting.length > 0) {
    return Object.freeze({
      accepted: false,
      reason: 'contradicted',
      independentPasses: 0,
      aggregateConfidence: null,
      acceptedEvidenceIds: Object.freeze([]),
      rejectingEvidenceIds:
        Object.freeze(
          rejecting.map(
            (item) => item.evidenceId,
          ),
        ),
    });
  }

  const passing =
    evidence.filter(
      (item) => item.verdict === 'pass',
    );

  const bestByGroup =
    new Map<
      string,
      ResultVerificationEvidence
    >();

  for (const item of passing) {
    const current =
      bestByGroup.get(
        item.independentGroupRef,
      );

    const itemWeighted =
      item.confidenceScore
      * TRUST_WEIGHT[item.kind];

    const currentWeighted =
      current
        ? current.confidenceScore
          * TRUST_WEIGHT[current.kind]
        : -1;

    if (itemWeighted > currentWeighted) {
      bestByGroup.set(
        item.independentGroupRef,
        item,
      );
    }
  }

  const independent =
    [...bestByGroup.values()];

  const requiredPasses =
    subject.verification === 'strict'
      || subject.risk === 'critical'
      ? Math.max(
          2,
          policy.minIndependentPasses,
        )
      : policy.minIndependentPasses;

  if (independent.length < requiredPasses) {
    return Object.freeze({
      accepted: false,
      reason: 'insufficient_independence',
      independentPasses: independent.length,
      aggregateConfidence: null,
      acceptedEvidenceIds:
        Object.freeze(
          independent.map(
            (item) => item.evidenceId,
          ),
        ),
      rejectingEvidenceIds:
        Object.freeze([]),
    });
  }

  if (
    !policy.allowModelOnly
    && independent.every(
      (item) => item.kind === 'model_review',
    )
  ) {
    return Object.freeze({
      accepted: false,
      reason: 'model_only_forbidden',
      independentPasses: independent.length,
      aggregateConfidence: null,
      acceptedEvidenceIds:
        Object.freeze(
          independent.map(
            (item) => item.evidenceId,
          ),
        ),
      rejectingEvidenceIds:
        Object.freeze([]),
    });
  }

  const needsDeterministic =
    policy.requireDeterministicForSideEffect
    && subject.sideEffect;

  if (
    needsDeterministic
    && !independent.some(
      (item) =>
        item.kind === 'deterministic_test'
        || item.kind === 'integrity_attestation',
    )
  ) {
    return Object.freeze({
      accepted: false,
      reason: 'deterministic_evidence_missing',
      independentPasses: independent.length,
      aggregateConfidence: null,
      acceptedEvidenceIds:
        Object.freeze(
          independent.map(
            (item) => item.evidenceId,
          ),
        ),
      rejectingEvidenceIds:
        Object.freeze([]),
    });
  }

  const needsStateReadback =
    policy.requireStateReadbackForSideEffect
    && subject.sideEffect;

  if (
    needsStateReadback
    && !independent.some(
      (item) => item.kind === 'state_readback',
    )
  ) {
    return Object.freeze({
      accepted: false,
      reason: 'state_readback_missing',
      independentPasses: independent.length,
      aggregateConfidence: null,
      acceptedEvidenceIds:
        Object.freeze(
          independent.map(
            (item) => item.evidenceId,
          ),
        ),
      rejectingEvidenceIds:
        Object.freeze([]),
    });
  }

  if (
    ['high', 'critical'].includes(subject.risk)
    && !independent.some(
      (item) =>
        item.kind === 'deterministic_test'
        || item.kind === 'state_readback'
        || item.kind === 'integrity_attestation',
    )
  ) {
    return Object.freeze({
      accepted: false,
      reason: 'deterministic_evidence_missing',
      independentPasses: independent.length,
      aggregateConfidence: null,
      acceptedEvidenceIds:
        Object.freeze(
          independent.map(
            (item) => item.evidenceId,
          ),
        ),
      rejectingEvidenceIds:
        Object.freeze([]),
    });
  }

  const aggregateConfidence =
    Math.round(
      independent.reduce(
        (sum, item) =>
          sum
          + (
            item.confidenceScore
            * TRUST_WEIGHT[item.kind]
            / 1000
          ),
        0,
      ) / independent.length,
    );

  if (
    aggregateConfidence
      < policy.minAggregateConfidence
  ) {
    return Object.freeze({
      accepted: false,
      reason: 'insufficient_confidence',
      independentPasses: independent.length,
      aggregateConfidence,
      acceptedEvidenceIds:
        Object.freeze(
          independent.map(
            (item) => item.evidenceId,
          ),
        ),
      rejectingEvidenceIds:
        Object.freeze([]),
    });
  }

  return Object.freeze({
    accepted: true,
    reason: 'verified',
    independentPasses: independent.length,
    aggregateConfidence,
    acceptedEvidenceIds:
      Object.freeze(
        independent.map(
          (item) => item.evidenceId,
        ),
      ),
    rejectingEvidenceIds:
      Object.freeze([]),
  });
}

export const DEFAULT_RESULT_VERIFICATION_POLICY =
  Object.freeze({
    minIndependentPasses: 1,
    minAggregateConfidence: 750,
    maxEvidenceAgeMs: 10 * 60 * 1000,
    failureVetoConfidence: 700,
    requireDeterministicForSideEffect: true,
    requireStateReadbackForSideEffect: true,
    allowModelOnly: false,
  } satisfies ResultVerificationPolicy);
