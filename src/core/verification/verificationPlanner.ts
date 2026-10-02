import {
  safeInteger,
  safeReference,
} from '../brain/brainSecurity';

import {
  GOAL_ID,
  GOAL_PLAN_ID,
  GOAL_STEP_ID,
} from '../agent/goalContract';

import {
  parseResultVerificationEvidence,
  type ResultVerificationEvidence,
  type ResultVerificationSubject,
  type VerificationEvidenceKind,
} from './resultVerifier';

export type AdaptiveVerificationPolicy =
  Readonly<{
    mediumIndependentGroups: number;
    highIndependentGroups: number;
    criticalIndependentGroups: number;
    maxEvidenceAgeMs: number;
    requireToolReceiptForSideEffect: boolean;
    requireStateReadbackForSideEffect: boolean;
    requireDeterministicForHighRisk: boolean;
    disallowModelOnlyAboveLowRisk: boolean;
  }>;

export type VerificationEvidencePlan =
  Readonly<{
    accepted: boolean;
    reason:
      | 'verification_not_required'
      | 'ready_for_verifier'
      | 'collect_more_evidence'
      | 'invalid_input'
      | 'binding_mismatch'
      | 'evidence_time_invalid';
    minimumIndependentGroups: number;
    observedIndependentGroups: number;
    requiredKinds: readonly VerificationEvidenceKind[];
    missingKinds: readonly VerificationEvidenceKind[];
    availableKinds: readonly VerificationEvidenceKind[];
    allowModelOnly: boolean;
  }>;

const RISKS =
  new Set([
    'low',
    'medium',
    'high',
    'critical',
  ]);

const VERIFICATION =
  new Set([
    'none',
    'standard',
    'strict',
  ]);

function countValue(
  value: unknown,
  minimum: number,
  maximum: number,
): value is number {
  return (
    safeInteger(value)
    && Number(value) >= minimum
    && Number(value) <= maximum
  );
}

export function validateAdaptiveVerificationPolicy(
  policy: AdaptiveVerificationPolicy,
): boolean {
  return (
    countValue(
      policy.mediumIndependentGroups,
      1,
      8,
    )
    && countValue(
      policy.highIndependentGroups,
      1,
      8,
    )
    && countValue(
      policy.criticalIndependentGroups,
      2,
      8,
    )
    && policy.mediumIndependentGroups
      <= policy.highIndependentGroups
    && policy.highIndependentGroups
      <= policy.criticalIndependentGroups
    && countValue(
      policy.maxEvidenceAgeMs,
      1_000,
      24 * 60 * 60 * 1000,
    )
    && typeof policy.requireToolReceiptForSideEffect
      === 'boolean'
    && typeof policy.requireStateReadbackForSideEffect
      === 'boolean'
    && typeof policy.requireDeterministicForHighRisk
      === 'boolean'
    && typeof policy.disallowModelOnlyAboveLowRisk
      === 'boolean'
  );
}

function validSubject(
  subject: ResultVerificationSubject,
): boolean {
  return (
    typeof subject === 'object'
    && subject !== null
    && typeof subject.goalId === 'string'
    && GOAL_ID.test(subject.goalId)
    && typeof subject.planId === 'string'
    && GOAL_PLAN_ID.test(subject.planId)
    && typeof subject.stepId === 'string'
    && GOAL_STEP_ID.test(subject.stepId)
    && safeReference(subject.resultRef, 240)
    && RISKS.has(subject.risk)
    && typeof subject.sideEffect === 'boolean'
    && VERIFICATION.has(subject.verification)
  );
}

function minimumGroups(
  subject: ResultVerificationSubject,
  policy: AdaptiveVerificationPolicy,
): number {
  if (
    subject.risk === 'critical'
    || subject.verification === 'strict'
  ) {
    return policy.criticalIndependentGroups;
  }

  if (subject.risk === 'high') {
    return policy.highIndependentGroups;
  }

  if (subject.risk === 'medium') {
    return policy.mediumIndependentGroups;
  }

  return subject.verification === 'standard'
    ? 1
    : 0;
}

function requirements(
  subject: ResultVerificationSubject,
  policy: AdaptiveVerificationPolicy,
): readonly VerificationEvidenceKind[] {
  const required =
    new Set<VerificationEvidenceKind>();

  if (
    subject.sideEffect
    && policy.requireToolReceiptForSideEffect
  ) {
    required.add('tool_receipt');
  }

  if (
    subject.sideEffect
    && policy.requireStateReadbackForSideEffect
  ) {
    required.add('state_readback');
  }

  if (
    policy.requireDeterministicForHighRisk
    && (
      subject.risk === 'high'
      || subject.risk === 'critical'
    )
  ) {
    required.add('deterministic_test');
  }

  if (subject.risk === 'critical') {
    required.add('integrity_attestation');
  }

  return Object.freeze([...required]);
}

function result(
  accepted: boolean,
  reason: VerificationEvidencePlan['reason'],
  minimumIndependentGroups: number,
  observedIndependentGroups: number,
  requiredKinds: readonly VerificationEvidenceKind[],
  missingKinds: readonly VerificationEvidenceKind[],
  availableKinds: readonly VerificationEvidenceKind[],
  allowModelOnly: boolean,
): VerificationEvidencePlan {
  return Object.freeze({
    accepted,
    reason,
    minimumIndependentGroups,
    observedIndependentGroups,
    requiredKinds: Object.freeze([...requiredKinds]),
    missingKinds: Object.freeze([...missingKinds]),
    availableKinds: Object.freeze([...availableKinds]),
    allowModelOnly,
  });
}

export function planVerificationEvidence(
  subject: ResultVerificationSubject,
  evidenceInputs: readonly unknown[],
  policy: AdaptiveVerificationPolicy,
  trustedNowMs: number,
): VerificationEvidencePlan {
  if (
    !validSubject(subject)
    || !validateAdaptiveVerificationPolicy(policy)
    || !safeInteger(trustedNowMs)
    || !Array.isArray(evidenceInputs)
    || evidenceInputs.length > 256
  ) {
    return result(
      false,
      'invalid_input',
      0,
      0,
      [],
      [],
      [],
      false,
    );
  }

  const requiredKinds =
    requirements(subject, policy);
  const minimumIndependentGroups =
    minimumGroups(subject, policy);
  const allowModelOnly =
    !policy.disallowModelOnlyAboveLowRisk
    || subject.risk === 'low';

  if (
    minimumIndependentGroups === 0
    && requiredKinds.length === 0
    && subject.verification === 'none'
    && !subject.sideEffect
  ) {
    return result(
      true,
      'verification_not_required',
      0,
      0,
      [],
      [],
      [],
      allowModelOnly,
    );
  }

  const parsed: ResultVerificationEvidence[] = [];
  const ids = new Set<string>();

  for (const raw of evidenceInputs) {
    const evidence =
      parseResultVerificationEvidence(raw);

    if (
      !evidence
      || ids.has(evidence.evidenceId)
    ) {
      return result(
        false,
        'invalid_input',
        minimumIndependentGroups,
        0,
        requiredKinds,
        requiredKinds,
        [],
        allowModelOnly,
      );
    }

    if (
      evidence.goalId !== subject.goalId
      || evidence.planId !== subject.planId
      || evidence.stepId !== subject.stepId
      || evidence.resultRef !== subject.resultRef
    ) {
      return result(
        false,
        'binding_mismatch',
        minimumIndependentGroups,
        0,
        requiredKinds,
        requiredKinds,
        [],
        allowModelOnly,
      );
    }

    if (
      evidence.observedAtMs > trustedNowMs
      || trustedNowMs - evidence.observedAtMs
        > policy.maxEvidenceAgeMs
      || (
        evidence.expiresAtMs !== null
        && evidence.expiresAtMs <= trustedNowMs
      )
    ) {
      return result(
        false,
        'evidence_time_invalid',
        minimumIndependentGroups,
        0,
        requiredKinds,
        requiredKinds,
        [],
        allowModelOnly,
      );
    }

    ids.add(evidence.evidenceId);
    parsed.push(evidence);
  }

  const passing =
    parsed.filter(
      (evidence) => evidence.verdict === 'pass',
    );
  const groups =
    new Set(
      passing.map(
        (evidence) =>
          evidence.independentGroupRef,
      ),
    );
  const kinds =
    new Set(
      passing.map(
        (evidence) => evidence.kind,
      ),
    );

  const hasDeterministic =
    kinds.has('deterministic_test')
    || kinds.has('integrity_attestation');

  const missingKinds =
    requiredKinds.filter(
      (kind) =>
        kind === 'deterministic_test'
          ? !hasDeterministic
          : !kinds.has(kind),
    );

  const modelOnly =
    passing.length > 0
    && passing.every(
      (evidence) =>
        evidence.kind === 'model_review',
    );

  const needsMore =
    groups.size < minimumIndependentGroups
    || missingKinds.length > 0
    || (!allowModelOnly && modelOnly);

  return result(
    !needsMore,
    needsMore
      ? 'collect_more_evidence'
      : 'ready_for_verifier',
    minimumIndependentGroups,
    groups.size,
    requiredKinds,
    missingKinds,
    Object.freeze([...kinds]),
    allowModelOnly,
  );
}

export const DEFAULT_ADAPTIVE_VERIFICATION_POLICY =
  Object.freeze({
    mediumIndependentGroups: 1,
    highIndependentGroups: 2,
    criticalIndependentGroups: 3,
    maxEvidenceAgeMs: 10 * 60 * 1000,
    requireToolReceiptForSideEffect: true,
    requireStateReadbackForSideEffect: true,
    requireDeterministicForHighRisk: true,
    disallowModelOnlyAboveLowRisk: true,
  } satisfies AdaptiveVerificationPolicy);
