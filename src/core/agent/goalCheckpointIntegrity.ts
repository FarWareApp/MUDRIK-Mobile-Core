import {
  exactObject,
  safeInteger,
} from '../brain/brainSecurity';

import {
  createIntegrityLedgerEntry,
  parseIntegrityLedgerEntry,
  verifyIntegrityLedgerEntryCryptographically,
  type IntegrityDigestProvider,
  type IntegrityLedgerEntry,
  type IntegritySigner,
  type IntegrityVerifier,
} from '../security/integrityLedger';

import {
  GOAL_CHECKPOINT_ID,
  parseGoalExecutionCheckpoint,
  validateGoalCheckpointTrustAnchor,
  type GoalExecutionCheckpoint,
} from './goalCheckpoint';

import {
  parseGoalExecutionSpec,
} from './goalContract';

const DIGEST =
  /^[a-f0-9]{64}$/;

const ENVELOPE_KEYS =
  new Set([
    'checkpoint',
    'ledgerEntry',
  ]);

export type GoalCheckpointIntegrityEnvelope =
  Readonly<{
    checkpoint: GoalExecutionCheckpoint;
    ledgerEntry: IntegrityLedgerEntry;
  }>;

export type GoalCheckpointIntegrityAnchor =
  Readonly<{
    checkpointId: string;
    checkpointSequence: number;
    chainDigest: string;
  }>;

export type GoalCheckpointAttestationResult =
  Readonly<{
    accepted: boolean;
    reason:
      | 'attested'
      | 'checkpoint_invalid'
      | 'payload_digest_invalid'
      | 'ledger_creation_failed';
    envelope:
      GoalCheckpointIntegrityEnvelope | null;
    anchor:
      GoalCheckpointIntegrityAnchor | null;
  }>;

export type GoalCheckpointVerificationResult =
  Readonly<{
    accepted: boolean;
    reason:
      | 'verified'
      | 'checkpoint_invalid'
      | 'integrity_invalid'
      | 'binding_mismatch'
      | 'anchor_mismatch'
      | 'payload_digest_mismatch';
    checkpoint: GoalExecutionCheckpoint | null;
  }>;

function streamRef(
  goalId: string,
): string {
  return 'goal_checkpoint_stream:' + goalId;
}

function canonicalCheckpoint(
  checkpoint: GoalExecutionCheckpoint,
): string {
  return JSON.stringify(checkpoint);
}

function validAnchor(
  anchor: GoalCheckpointIntegrityAnchor,
): boolean {
  return (
    GOAL_CHECKPOINT_ID.test(
      anchor.checkpointId,
    )
    && safeInteger(
      anchor.checkpointSequence,
    )
    && anchor.checkpointSequence >= 1
    && DIGEST.test(anchor.chainDigest)
  );
}

function attestationFailure(
  reason:
    GoalCheckpointAttestationResult['reason'],
): GoalCheckpointAttestationResult {
  return Object.freeze({
    accepted: false,
    reason,
    envelope: null,
    anchor: null,
  });
}

export async function attestGoalExecutionCheckpoint(
  checkpointInput: unknown,
  goalInput: unknown,
  planInput: unknown,
  trustedNowMs: number,
  entryId: string,
  previousLedgerDigest: string | null,
  digestProvider: IntegrityDigestProvider,
  signer: IntegritySigner,
): Promise<GoalCheckpointAttestationResult> {
  const checkpoint =
    parseGoalExecutionCheckpoint(
      checkpointInput,
      goalInput,
      planInput,
      trustedNowMs,
    );
  const goal =
    parseGoalExecutionSpec(goalInput);

  if (!checkpoint || !goal) {
    return attestationFailure(
      'checkpoint_invalid',
    );
  }

  let payloadDigest: string;

  try {
    payloadDigest =
      await digestProvider.sha256Utf8(
        canonicalCheckpoint(checkpoint),
      );
  } catch {
    return attestationFailure(
      'payload_digest_invalid',
    );
  }

  if (!DIGEST.test(payloadDigest)) {
    return attestationFailure(
      'payload_digest_invalid',
    );
  }

  const ledgerSequence =
    checkpoint.sequence - 1;

  if (
    ledgerSequence === 0
      ? previousLedgerDigest !== null
      : (
          typeof previousLedgerDigest !== 'string'
          || !DIGEST.test(
            previousLedgerDigest,
          )
        )
  ) {
    return attestationFailure(
      'ledger_creation_failed',
    );
  }

  let ledgerEntry: IntegrityLedgerEntry;

  try {
    ledgerEntry =
      await createIntegrityLedgerEntry(
        {
          entryId,
          streamRef:
            streamRef(goal.goalId),
          sequence: ledgerSequence,
          previousDigest:
            previousLedgerDigest,
          payloadDigest,
          observedAtMs:
            checkpoint.createdAtMs,
        },
        digestProvider,
        signer,
      );
  } catch {
    return attestationFailure(
      'ledger_creation_failed',
    );
  }

  const envelope =
    Object.freeze({
      checkpoint,
      ledgerEntry,
    });

  return Object.freeze({
    accepted: true,
    reason: 'attested',
    envelope,
    anchor: Object.freeze({
      checkpointId:
        checkpoint.checkpointId,
      checkpointSequence:
        checkpoint.sequence,
      chainDigest:
        ledgerEntry.chainDigest,
    }),
  });
}

function verificationFailure(
  reason:
    GoalCheckpointVerificationResult['reason'],
): GoalCheckpointVerificationResult {
  return Object.freeze({
    accepted: false,
    reason,
    checkpoint: null,
  });
}

export async function verifyGoalExecutionCheckpointEnvelope(
  input: unknown,
  goalInput: unknown,
  planInput: unknown,
  trustedNowMs: number,
  anchor: GoalCheckpointIntegrityAnchor,
  digestProvider: IntegrityDigestProvider,
  verifier: IntegrityVerifier,
): Promise<GoalCheckpointVerificationResult> {
  const envelope =
    exactObject(input, ENVELOPE_KEYS);

  if (!envelope || !validAnchor(anchor)) {
    return verificationFailure(
      'checkpoint_invalid',
    );
  }

  const checkpoint =
    parseGoalExecutionCheckpoint(
      envelope.checkpoint,
      goalInput,
      planInput,
      trustedNowMs,
    );
  const goal =
    parseGoalExecutionSpec(goalInput);
  const ledgerEntry =
    parseIntegrityLedgerEntry(
      envelope.ledgerEntry,
    );

  if (!checkpoint || !goal) {
    return verificationFailure(
      'checkpoint_invalid',
    );
  }

  if (!ledgerEntry) {
    return verificationFailure(
      'integrity_invalid',
    );
  }

  if (
    !validateGoalCheckpointTrustAnchor(
      checkpoint,
      {
        checkpointId:
          anchor.checkpointId,
        sequence:
          anchor.checkpointSequence,
      },
    )
    || ledgerEntry.chainDigest
      !== anchor.chainDigest
  ) {
    return verificationFailure(
      'anchor_mismatch',
    );
  }

  if (
    ledgerEntry.streamRef
      !== streamRef(goal.goalId)
    || ledgerEntry.sequence
      !== checkpoint.sequence - 1
    || ledgerEntry.observedAtMs
      !== checkpoint.createdAtMs
  ) {
    return verificationFailure(
      'binding_mismatch',
    );
  }

  let payloadDigest: string;

  try {
    payloadDigest =
      await digestProvider.sha256Utf8(
        canonicalCheckpoint(checkpoint),
      );
  } catch {
    return verificationFailure(
      'payload_digest_mismatch',
    );
  }

  if (
    !DIGEST.test(payloadDigest)
    || ledgerEntry.payloadDigest
      !== payloadDigest
  ) {
    return verificationFailure(
      'payload_digest_mismatch',
    );
  }

  const cryptographic =
    await verifyIntegrityLedgerEntryCryptographically(
      ledgerEntry,
      digestProvider,
      verifier,
    );

  if (!cryptographic.accepted) {
    return verificationFailure(
      'integrity_invalid',
    );
  }

  return Object.freeze({
    accepted: true,
    reason: 'verified',
    checkpoint,
  });
}
