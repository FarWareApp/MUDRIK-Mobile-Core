import {
  evaluateEmergencyEvidenceTime,
  isEmergencyEvidenceId,
  isEmergencySessionId,
  parseEmergencyEvidence,
} from './emergencyEvidence';

import type {
  EmergencyEvidence,
  EmergencyEvidenceFreshness,
} from './emergencyEvidence';

export type EmergencyEvidenceRegistryResult =
  Readonly<{
    accepted: boolean;
    idempotent: boolean;
    freshness:
      EmergencyEvidenceFreshness | null;
    reason:
      | 'accepted'
      | 'duplicate'
      | 'invalid_evidence'
      | 'invalid_time'
      | 'future_evidence'
      | 'expired_evidence'
      | 'stale_sequence'
      | 'sequence_gap'
      | 'sequence_conflict'
      | 'cross_session_replay'
      | 'evidence_binding_conflict';
  }>;

type EvidenceState = {
  last: EmergencyEvidence;
  lastFingerprint: string;
};

type EvidenceBinding = Readonly<{
  emergencySessionId: string;
  accountId: string;
  sourceDeviceId: string;
  kind: string;
  sensorId: string | null;
}>;

function fingerprint(
  evidence: EmergencyEvidence,
): string {
  return JSON.stringify(evidence);
}

function bindingFor(
  evidence: EmergencyEvidence,
): EvidenceBinding {
  return Object.freeze({
    emergencySessionId:
      evidence.emergencySessionId,
    accountId: evidence.accountId,
    sourceDeviceId:
      evidence.sourceDeviceId,
    kind: evidence.kind,
    sensorId: evidence.sensorId,
  });
}

function sameBinding(
  left: EvidenceBinding,
  right: EvidenceBinding,
): boolean {
  return (
    left.emergencySessionId
      === right.emergencySessionId
    && left.accountId
      === right.accountId
    && left.sourceDeviceId
      === right.sourceDeviceId
    && left.kind === right.kind
    && left.sensorId === right.sensorId
  );
}

export class EmergencyEvidenceRegistry {
  private readonly states =
    new Map<string, EvidenceState>();

  private readonly bindings =
    new Map<string, EvidenceBinding>();

  apply(
    input: unknown,
    trustedEvaluationTimeInput: unknown,
  ): EmergencyEvidenceRegistryResult {
    const evidence =
      parseEmergencyEvidence(input);

    if (!evidence) {
      return {
        accepted: false,
        idempotent: false,
        freshness: null,
        reason: 'invalid_evidence',
      };
    }

    const time =
      evaluateEmergencyEvidenceTime(
        evidence,
        trustedEvaluationTimeInput,
      );

    if (!time.accepted) {
      return {
        accepted: false,
        idempotent: false,
        freshness: time.freshness,
        reason:
          time.freshness === 'invalid_time'
            ? 'invalid_time'
            : time.freshness === 'future'
              ? 'future_evidence'
              : 'expired_evidence',
      };
    }

    const nextBinding =
      bindingFor(evidence);
    const existingBinding =
      this.bindings.get(
        evidence.evidenceId,
      );

    if (
      existingBinding
      && !sameBinding(
        existingBinding,
        nextBinding,
      )
    ) {
      return {
        accepted: false,
        idempotent: false,
        freshness: time.freshness,
        reason:
          existingBinding
            .emergencySessionId
            !== evidence.emergencySessionId
            ? 'cross_session_replay'
            : 'evidence_binding_conflict',
      };
    }

    const current =
      this.states.get(
        evidence.evidenceId,
      );

    if (!current) {
      if (evidence.sequence !== 0) {
        return {
          accepted: false,
          idempotent: false,
          freshness: time.freshness,
          reason: 'sequence_gap',
        };
      }

      this.bindings.set(
        evidence.evidenceId,
        nextBinding,
      );
      this.states.set(
        evidence.evidenceId,
        {
          last: evidence,
          lastFingerprint:
            fingerprint(evidence),
        },
      );

      return {
        accepted: true,
        idempotent: false,
        freshness: time.freshness,
        reason: 'accepted',
      };
    }

    if (
      evidence.sequence
        < current.last.sequence
    ) {
      return {
        accepted: false,
        idempotent: false,
        freshness: time.freshness,
        reason: 'stale_sequence',
      };
    }

    if (
      evidence.sequence
        === current.last.sequence
    ) {
      if (
        fingerprint(evidence)
          === current.lastFingerprint
      ) {
        return {
          accepted: true,
          idempotent: true,
          freshness: time.freshness,
          reason: 'duplicate',
        };
      }

      return {
        accepted: false,
        idempotent: false,
        freshness: time.freshness,
        reason: 'sequence_conflict',
      };
    }

    if (
      evidence.sequence
        !== current.last.sequence + 1
    ) {
      return {
        accepted: false,
        idempotent: false,
        freshness: time.freshness,
        reason: 'sequence_gap',
      };
    }

    current.last = evidence;
    current.lastFingerprint =
      fingerprint(evidence);

    return {
      accepted: true,
      idempotent: false,
      freshness: time.freshness,
      reason: 'accepted',
    };
  }

  getLast(
    evidenceId: string,
    trustedEvaluationTimeInput: unknown,
  ): Readonly<{
    evidence: EmergencyEvidence;
    freshness:
      EmergencyEvidenceFreshness;
  }> | null {
    if (!isEmergencyEvidenceId(evidenceId)) {
      return null;
    }

    const state =
      this.states.get(evidenceId);

    if (!state) {
      return null;
    }

    const time =
      evaluateEmergencyEvidenceTime(
        state.last,
        trustedEvaluationTimeInput,
      );

    return Object.freeze({
      evidence: state.last,
      freshness: time.freshness,
    });
  }

  listForSession(
    emergencySessionId: string,
    trustedEvaluationTimeInput: unknown,
  ): readonly Readonly<{
    evidence: EmergencyEvidence;
    freshness:
      EmergencyEvidenceFreshness;
  }>[] {
    if (
      !isEmergencySessionId(
        emergencySessionId,
      )
    ) {
      return Object.freeze([]);
    }

    const values = [
      ...this.states.values(),
    ]
      .filter(
        (state) =>
          state.last.emergencySessionId
            === emergencySessionId,
      )
      .map((state) => {
        const time =
          evaluateEmergencyEvidenceTime(
            state.last,
            trustedEvaluationTimeInput,
          );

        return Object.freeze({
          evidence: state.last,
          freshness: time.freshness,
        });
      })
      .sort(
        (left, right) =>
          left.evidence.evidenceId
            .localeCompare(
              right.evidence.evidenceId,
            ),
      );

    return Object.freeze(values);
  }

  clear(): void {
    this.states.clear();
    this.bindings.clear();
  }
}
