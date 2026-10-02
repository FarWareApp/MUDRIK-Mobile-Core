const DIGEST =
  /^[a-f0-9]{64}$/;

const SIGNATURE =
  /^[A-Za-z0-9_-]{32,1024}$/;

const SAFE_REF =
  /^[A-Za-z0-9][A-Za-z0-9._:@/+\-]{2,239}$/;

const BODY =
  '[a-z0-9][a-z0-9_-]{15,127}';

const ENTRY_ID =
  new RegExp(
    '^integrity_entry_' + BODY + '$',
  );

function safeInteger(
  value: unknown,
): value is number {
  return (
    Number.isSafeInteger(value)
    && Number(value) >= 0
  );
}

function exactObject(
  value: unknown,
  keys: ReadonlySet<string>,
): Record<string, unknown> | null {
  if (
    typeof value !== 'object'
    || value === null
    || Array.isArray(value)
    || Object.getPrototypeOf(value)
      !== Object.prototype
  ) {
    return null;
  }

  const record =
    value as Record<string, unknown>;
  const actual = Object.keys(record);

  return (
    actual.length === keys.size
    && actual.every((key) => keys.has(key))
  )
    ? record
    : null;
}

export interface IntegrityDigestProvider {
  sha256Utf8(
    value: string,
  ): Promise<string>;
}

export interface IntegritySigner {
  readonly keyRef: string;
  signDigest(
    digestHex: string,
  ): Promise<string>;
}

export interface IntegrityVerifier {
  verifyDigest(
    keyRef: string,
    digestHex: string,
    signature: string,
  ): Promise<boolean>;
}

export type IntegrityLedgerEntry =
  Readonly<{
    protocolVersion: '1.0';
    entryId: string;
    streamRef: string;
    sequence: number;
    previousDigest: string | null;
    payloadDigest: string;
    chainDigest: string;
    keyRef: string;
    signature: string;
    observedAtMs: number;
  }>;

export type IntegrityLedgerDraft =
  Readonly<{
    entryId: string;
    streamRef: string;
    sequence: number;
    previousDigest: string | null;
    payloadDigest: string;
    observedAtMs: number;
  }>;

const ENTRY_KEYS =
  new Set([
    'protocolVersion',
    'entryId',
    'streamRef',
    'sequence',
    'previousDigest',
    'payloadDigest',
    'chainDigest',
    'keyRef',
    'signature',
    'observedAtMs',
  ]);

function canonicalPayload(
  draft: IntegrityLedgerDraft,
  keyRef: string,
): string {
  return JSON.stringify([
    '1.0',
    draft.entryId,
    draft.streamRef,
    draft.sequence,
    draft.previousDigest,
    draft.payloadDigest,
    keyRef,
    draft.observedAtMs,
  ]);
}

function validDraft(
  draft: IntegrityLedgerDraft,
): boolean {
  return (
    ENTRY_ID.test(draft.entryId)
    && SAFE_REF.test(draft.streamRef)
    && safeInteger(draft.sequence)
    && (
      draft.previousDigest === null
      || DIGEST.test(draft.previousDigest)
    )
    && DIGEST.test(draft.payloadDigest)
    && safeInteger(draft.observedAtMs)
    && (
      draft.sequence === 0
        ? draft.previousDigest === null
        : draft.previousDigest !== null
    )
  );
}

export async function createIntegrityLedgerEntry(
  draft: IntegrityLedgerDraft,
  digestProvider: IntegrityDigestProvider,
  signer: IntegritySigner,
): Promise<IntegrityLedgerEntry> {
  if (
    !validDraft(draft)
    || !SAFE_REF.test(signer.keyRef)
  ) {
    throw new TypeError(
      'Invalid integrity ledger draft.',
    );
  }

  const chainDigest =
    await digestProvider.sha256Utf8(
      canonicalPayload(
        draft,
        signer.keyRef,
      ),
    );

  if (!DIGEST.test(chainDigest)) {
    throw new Error(
      'Integrity digest provider returned invalid SHA-256.',
    );
  }

  const signature =
    await signer.signDigest(chainDigest);

  if (!SIGNATURE.test(signature)) {
    throw new Error(
      'Integrity signer returned invalid signature encoding.',
    );
  }

  return Object.freeze({
    protocolVersion: '1.0',
    ...draft,
    chainDigest,
    keyRef: signer.keyRef,
    signature,
  });
}

export function parseIntegrityLedgerEntry(
  input: unknown,
): IntegrityLedgerEntry | null {
  const record =
    exactObject(input, ENTRY_KEYS);

  if (
    !record
    || record.protocolVersion !== '1.0'
    || typeof record.entryId !== 'string'
    || !ENTRY_ID.test(record.entryId)
    || typeof record.streamRef !== 'string'
    || !SAFE_REF.test(record.streamRef)
    || !safeInteger(record.sequence)
  ) {
    return null;
  }

  if (
    record.previousDigest !== null
    && (
      typeof record.previousDigest !== 'string'
      || !DIGEST.test(record.previousDigest)
    )
  ) {
    return null;
  }

  if (
    typeof record.payloadDigest !== 'string'
    || !DIGEST.test(record.payloadDigest)
    || typeof record.chainDigest !== 'string'
    || !DIGEST.test(record.chainDigest)
    || typeof record.keyRef !== 'string'
    || !SAFE_REF.test(record.keyRef)
  ) {
    return null;
  }

  if (
    typeof record.signature !== 'string'
    || !SIGNATURE.test(record.signature)
    || !safeInteger(record.observedAtMs)
  ) {
    return null;
  }

  if (
    Number(record.sequence) === 0
      ? record.previousDigest !== null
      : record.previousDigest === null
  ) {
    return null;
  }

  return Object.freeze({
    protocolVersion: '1.0',
    entryId: record.entryId as string,
    streamRef: record.streamRef as string,
    sequence: record.sequence as number,

    previousDigest:
      record.previousDigest as string | null,
    payloadDigest:
      record.payloadDigest as string,
    chainDigest:
      record.chainDigest as string,
    keyRef: record.keyRef as string,
    signature: record.signature as string,
    observedAtMs:
      record.observedAtMs as number,
  });
}

export type IntegrityAcceptResult =
  Readonly<{
    accepted: boolean;
    idempotent: boolean;
    reason:
      | 'accepted'
      | 'idempotent'
      | 'invalid_entry'
      | 'stream_mismatch'
      | 'sequence_gap'
      | 'sequence_conflict'
      | 'chain_mismatch'
      | 'time_rollback'
      | 'digest_mismatch'
      | 'signature_invalid';
  }>;

export type IntegrityCryptographicCheck =
  Readonly<{
    accepted: boolean;
    reason:
      | 'valid'
      | 'invalid_entry'
      | 'digest_mismatch'
      | 'signature_invalid';
    entry: IntegrityLedgerEntry | null;
  }>;

export async function verifyIntegrityLedgerEntryCryptographically(
  input: unknown,
  digestProvider: IntegrityDigestProvider,
  verifier: IntegrityVerifier,
): Promise<IntegrityCryptographicCheck> {
  const entry =
    parseIntegrityLedgerEntry(input);

  if (!entry) {
    return Object.freeze({
      accepted: false,
      reason: 'invalid_entry',
      entry: null,
    });
  }

  const draft: IntegrityLedgerDraft = {
    entryId: entry.entryId,
    streamRef: entry.streamRef,
    sequence: entry.sequence,
    previousDigest: entry.previousDigest,
    payloadDigest: entry.payloadDigest,
    observedAtMs: entry.observedAtMs,
  };

  let expectedDigest: string;

  try {
    expectedDigest =
      await digestProvider.sha256Utf8(
        canonicalPayload(
          draft,
          entry.keyRef,
        ),
      );
  } catch {
    return Object.freeze({
      accepted: false,
      reason: 'digest_mismatch',
      entry,
    });
  }

  if (
    !DIGEST.test(expectedDigest)
    || expectedDigest !== entry.chainDigest
  ) {
    return Object.freeze({
      accepted: false,
      reason: 'digest_mismatch',
      entry,
    });
  }

  let signatureValid = false;

  try {
    signatureValid =
      await verifier.verifyDigest(
        entry.keyRef,
        entry.chainDigest,
        entry.signature,
      );
  } catch {
    signatureValid = false;
  }

  if (!signatureValid) {
    return Object.freeze({
      accepted: false,
      reason: 'signature_invalid',
      entry,
    });
  }

  return Object.freeze({
    accepted: true,
    reason: 'valid',
    entry,
  });
}

function acceptResult(
  accepted: boolean,
  idempotent: boolean,
  reason: IntegrityAcceptResult['reason'],
): IntegrityAcceptResult {
  return Object.freeze({
    accepted,
    idempotent,
    reason,
  });
}

function sameEntry(
  left: IntegrityLedgerEntry,
  right: IntegrityLedgerEntry,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export class IntegrityLedgerVerifier {
  private readonly accepted =
    new Map<number, IntegrityLedgerEntry>();

  private nextSequence = 0;
  private lastDigest: string | null = null;
  private lastObservedAtMs: number | null = null;

  constructor(
    private readonly streamRef: string,
    private readonly digestProvider:
      IntegrityDigestProvider,
    private readonly verifier:
      IntegrityVerifier,
  ) {
    if (!SAFE_REF.test(streamRef)) {
      throw new TypeError(
        'Invalid integrity stream reference.',
      );
    }
  }

  async accept(
    input: unknown,
  ): Promise<IntegrityAcceptResult> {
    const entry =
      parseIntegrityLedgerEntry(input);

    if (!entry) {
      return acceptResult(
        false,
        false,
        'invalid_entry',
      );
    }

    if (entry.streamRef !== this.streamRef) {
      return acceptResult(
        false,
        false,
        'stream_mismatch',
      );
    }

    const previous =
      this.accepted.get(entry.sequence);

    if (previous) {
      return sameEntry(previous, entry)
        ? acceptResult(
            true,
            true,
            'idempotent',
          )
        : acceptResult(
            false,
            false,
            'sequence_conflict',
          );
    }

    if (entry.sequence !== this.nextSequence) {
      return acceptResult(
        false,
        false,
        'sequence_gap',
      );
    }

    if (entry.previousDigest !== this.lastDigest) {
      return acceptResult(
        false,
        false,
        'chain_mismatch',
      );
    }

    if (
      this.lastObservedAtMs !== null
      && entry.observedAtMs
        < this.lastObservedAtMs
    ) {
      return acceptResult(
        false,
        false,
        'time_rollback',
      );
    }

    const draft: IntegrityLedgerDraft = {
      entryId: entry.entryId,
      streamRef: entry.streamRef,
      sequence: entry.sequence,
      previousDigest: entry.previousDigest,
      payloadDigest: entry.payloadDigest,
      observedAtMs: entry.observedAtMs,
    };

    const expectedDigest =
      await this.digestProvider.sha256Utf8(
        canonicalPayload(
          draft,
          entry.keyRef,
        ),
      );

    if (
      !DIGEST.test(expectedDigest)
      || expectedDigest !== entry.chainDigest
    ) {
      return acceptResult(
        false,
        false,
        'digest_mismatch',
      );
    }

    let validSignature = false;

    try {
      validSignature =
        await this.verifier.verifyDigest(
          entry.keyRef,
          entry.chainDigest,
          entry.signature,
        );
    } catch {
      validSignature = false;
    }

    if (!validSignature) {
      return acceptResult(
        false,
        false,
        'signature_invalid',
      );
    }

    this.accepted.set(
      entry.sequence,
      entry,
    );
    this.nextSequence += 1;
    this.lastDigest = entry.chainDigest;
    this.lastObservedAtMs =
      entry.observedAtMs;

    return acceptResult(
      true,
      false,
      'accepted',
    );
  }

  getHead():
    Readonly<{
      sequence: number;
      chainDigest: string;
      observedAtMs: number;
    }> | null {
    const head =
      this.accepted.get(
        this.nextSequence - 1,
      );

    return head
      ? Object.freeze({
          sequence: head.sequence,
          chainDigest: head.chainDigest,
          observedAtMs: head.observedAtMs,
        })
      : null;
  }
}
