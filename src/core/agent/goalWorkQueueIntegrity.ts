import {
  exactObject,
  safeInteger,
  safeReference,
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
  parseGoalWorkState,
  type GoalWorkState,
} from './goalWorkQueue';

const BODY =
  '[a-z0-9][a-z0-9_-]{15,127}';

const SNAPSHOT_ID =
  new RegExp(
    '^goal_work_snapshot_' + BODY + '$',
  );

const DIGEST =
  /^[a-f0-9]{64}$/;

const SNAPSHOT_KEYS =
  new Set([
    'protocolVersion',
    'snapshotId',
    'queueRef',
    'sequence',
    'previousSnapshotId',
    'states',
    'createdAtMs',
  ]);

const ENVELOPE_KEYS =
  new Set([
    'snapshot',
    'ledgerEntry',
  ]);

export type GoalWorkQueueSnapshot =
  Readonly<{
    protocolVersion: '1.0';
    snapshotId: string;
    queueRef: string;
    sequence: number;
    previousSnapshotId: string | null;
    states: readonly GoalWorkState[];
    createdAtMs: number;
  }>;

export type GoalWorkQueueIntegrityEnvelope =
  Readonly<{
    snapshot: GoalWorkQueueSnapshot;
    ledgerEntry: IntegrityLedgerEntry;
  }>;

export type GoalWorkQueueIntegrityAnchor =
  Readonly<{
    queueRef: string;
    snapshotId: string;
    sequence: number;
    chainDigest: string;
  }>;

export type GoalWorkQueueAttestationResult =
  Readonly<{
    accepted: boolean;
    reason:
      | 'attested'
      | 'snapshot_invalid'
      | 'payload_digest_invalid'
      | 'ledger_creation_failed';
    envelope:
      GoalWorkQueueIntegrityEnvelope | null;
    anchor:
      GoalWorkQueueIntegrityAnchor | null;
  }>;

export type GoalWorkQueueVerificationResult =
  Readonly<{
    accepted: boolean;
    reason:
      | 'verified'
      | 'snapshot_invalid'
      | 'integrity_invalid'
      | 'binding_mismatch'
      | 'anchor_mismatch'
      | 'payload_digest_mismatch';
    snapshot: GoalWorkQueueSnapshot | null;
  }>;

function streamRef(
  queueRef: string,
): string {
  return (
    'goal_work_queue_stream:'
    + queueRef
  );
}

function canonicalSnapshot(
  snapshot: GoalWorkQueueSnapshot,
): string {
  return JSON.stringify(snapshot);
}

export function parseGoalWorkQueueSnapshot(
  input: unknown,
): GoalWorkQueueSnapshot | null {
  const record =
    exactObject(
      input,
      SNAPSHOT_KEYS,
    );

  if (
    !record
    || record.protocolVersion !== '1.0'
    || typeof record.snapshotId !== 'string'
    || !SNAPSHOT_ID.test(record.snapshotId)
    || !safeReference(record.queueRef, 160)
    || !safeInteger(record.sequence)
    || Number(record.sequence) < 1
    || (
      Number(record.sequence) === 1
        ? record.previousSnapshotId !== null
        : (
            typeof record.previousSnapshotId
              !== 'string'
            || !SNAPSHOT_ID.test(
              record.previousSnapshotId,
            )
            || record.previousSnapshotId
              === record.snapshotId
          )
    )
    || !Array.isArray(record.states)
    || record.states.length > 100_000
    || !safeInteger(record.createdAtMs)
  ) {
    return null;
  }

  const states: GoalWorkState[] = [];
  const workIds = new Set<string>();

  for (const raw of record.states) {
    const state =
      parseGoalWorkState(raw);

    if (
      !state
      || state.updatedAtMs
        > Number(record.createdAtMs)
      || workIds.has(
        state.item.workId,
      )
    ) {
      return null;
    }

    workIds.add(
      state.item.workId,
    );
    states.push(state);
  }

  return Object.freeze({
    protocolVersion: '1.0',
    snapshotId:
      record.snapshotId as string,
    queueRef:
      record.queueRef as string,
    sequence:
      record.sequence as number,
    previousSnapshotId:
      record.previousSnapshotId as string | null,
    states:
      Object.freeze(states),
    createdAtMs:
      record.createdAtMs as number,
  });
}

function validAnchor(
  anchor: GoalWorkQueueIntegrityAnchor,
): boolean {
  return (
    safeReference(anchor.queueRef, 160)
    && SNAPSHOT_ID.test(
      anchor.snapshotId,
    )
    && safeInteger(anchor.sequence)
    && anchor.sequence >= 1
    && DIGEST.test(
      anchor.chainDigest,
    )
  );
}

function attestationFailure(
  reason:
    GoalWorkQueueAttestationResult['reason'],
): GoalWorkQueueAttestationResult {
  return Object.freeze({
    accepted: false,
    reason,
    envelope: null,
    anchor: null,
  });
}

export async function attestGoalWorkQueueSnapshot(
  snapshotInput: unknown,
  entryId: string,
  previousLedgerDigest: string | null,
  digestProvider: IntegrityDigestProvider,
  signer: IntegritySigner,
): Promise<GoalWorkQueueAttestationResult> {
  const snapshot =
    parseGoalWorkQueueSnapshot(
      snapshotInput,
    );

  if (!snapshot) {
    return attestationFailure(
      'snapshot_invalid',
    );
  }

  let payloadDigest: string;

  try {
    payloadDigest =
      await digestProvider.sha256Utf8(
        canonicalSnapshot(snapshot),
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
    snapshot.sequence - 1;

  if (
    ledgerSequence === 0
      ? previousLedgerDigest !== null
      : (
          typeof previousLedgerDigest
            !== 'string'
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
            streamRef(
              snapshot.queueRef,
            ),
          sequence: ledgerSequence,
          previousDigest:
            previousLedgerDigest,
          payloadDigest,
          observedAtMs:
            snapshot.createdAtMs,
        },
        digestProvider,
        signer,
      );
  } catch {
    return attestationFailure(
      'ledger_creation_failed',
    );
  }

  return Object.freeze({
    accepted: true,
    reason: 'attested',
    envelope: Object.freeze({
      snapshot,
      ledgerEntry,
    }),
    anchor: Object.freeze({
      queueRef:
        snapshot.queueRef,
      snapshotId:
        snapshot.snapshotId,
      sequence:
        snapshot.sequence,
      chainDigest:
        ledgerEntry.chainDigest,
    }),
  });
}

function verificationFailure(
  reason:
    GoalWorkQueueVerificationResult['reason'],
): GoalWorkQueueVerificationResult {
  return Object.freeze({
    accepted: false,
    reason,
    snapshot: null,
  });
}

export async function verifyGoalWorkQueueSnapshotEnvelope(
  input: unknown,
  trustedNowMs: number,
  anchor: GoalWorkQueueIntegrityAnchor,
  digestProvider: IntegrityDigestProvider,
  verifier: IntegrityVerifier,
): Promise<GoalWorkQueueVerificationResult> {
  const envelope =
    exactObject(
      input,
      ENVELOPE_KEYS,
    );

  if (
    !envelope
    || !safeInteger(trustedNowMs)
    || !validAnchor(anchor)
  ) {
    return verificationFailure(
      'snapshot_invalid',
    );
  }

  const snapshot =
    parseGoalWorkQueueSnapshot(
      envelope.snapshot,
    );
  const ledgerEntry =
    parseIntegrityLedgerEntry(
      envelope.ledgerEntry,
    );

  if (
    !snapshot
    || snapshot.createdAtMs
      > trustedNowMs
  ) {
    return verificationFailure(
      'snapshot_invalid',
    );
  }

  if (!ledgerEntry) {
    return verificationFailure(
      'integrity_invalid',
    );
  }

  if (
    snapshot.queueRef !== anchor.queueRef
    || snapshot.snapshotId
      !== anchor.snapshotId
    || snapshot.sequence
      !== anchor.sequence
    || ledgerEntry.chainDigest
      !== anchor.chainDigest
  ) {
    return verificationFailure(
      'anchor_mismatch',
    );
  }

  if (
    ledgerEntry.streamRef
      !== streamRef(
        snapshot.queueRef,
      )
    || ledgerEntry.sequence
      !== snapshot.sequence - 1
    || ledgerEntry.observedAtMs
      !== snapshot.createdAtMs
  ) {
    return verificationFailure(
      'binding_mismatch',
    );
  }

  let payloadDigest: string;

  try {
    payloadDigest =
      await digestProvider.sha256Utf8(
        canonicalSnapshot(snapshot),
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
    snapshot,
  });
}
