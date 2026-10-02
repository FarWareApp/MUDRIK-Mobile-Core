import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  createIntegrityLedgerEntry,
  parseIntegrityLedgerEntry,
  IntegrityLedgerVerifier,
} = loadTypeScriptModule(
  'src/core/security/integrityLedger.ts',
);

const KEY_REF =
  'device_key_ref_1111111111111111';
const STREAM_REF =
  'integrity_stream_goal_111111111111';
const SECRET =
  'test-only-integrity-secret';

const digestProvider = {
  async sha256Utf8(value) {
    return crypto
      .createHash('sha256')
      .update(value, 'utf8')
      .digest('hex');
  },
};

const signer = {
  keyRef: KEY_REF,
  async signDigest(digestHex) {
    return crypto
      .createHmac('sha256', SECRET)
      .update(digestHex, 'utf8')
      .digest('base64url');
  },
};

const verifier = {
  async verifyDigest(
    keyRef,
    digestHex,
    signature,
  ) {
    if (keyRef !== KEY_REF) {
      return false;
    }

    const expected =
      await signer.signDigest(digestHex);

    return expected === signature;
  },
};

function payloadDigest(value) {
  return crypto
    .createHash('sha256')
    .update(value, 'utf8')
    .digest('hex');
}

async function entry(
  sequence,
  previousDigest,
  payload,
  overrides = {},
) {
  return createIntegrityLedgerEntry(
    {
      entryId:
        'integrity_entry_'
        + String(sequence + 1).repeat(16),
      streamRef: STREAM_REF,
      sequence,
      previousDigest,
      payloadDigest: payloadDigest(payload),
      observedAtMs: 2_000_000_000 + sequence,
      ...overrides,
    },
    digestProvider,
    signer,
  );
}

test('signed integrity chain accepts valid ordered entries', async () => {
  const first = await entry(
    0,
    null,
    'payload-one',
  );
  const second = await entry(
    1,
    first.chainDigest,
    'payload-two',
  );

  assert.ok(
    parseIntegrityLedgerEntry(first),
  );
  assert.ok(
    parseIntegrityLedgerEntry(second),
  );

  const ledger =
    new IntegrityLedgerVerifier(
      STREAM_REF,
      digestProvider,
      verifier,
    );

  assert.equal(
    (await ledger.accept(first)).accepted,
    true,
  );
  assert.equal(
    (await ledger.accept(second)).accepted,
    true,
  );

  assert.deepEqual(
    ledger.getHead(),
    {
      sequence: 1,
      chainDigest: second.chainDigest,
      observedAtMs: second.observedAtMs,
    },
  );
});

test('accepted entry replay is idempotent but mutation conflicts', async () => {
  const first = await entry(
    0,
    null,
    'payload-one',
  );

  const ledger =
    new IntegrityLedgerVerifier(
      STREAM_REF,
      digestProvider,
      verifier,
    );

  await ledger.accept(first);

  const replay =
    await ledger.accept(first);

  assert.equal(replay.accepted, true);
  assert.equal(replay.idempotent, true);

  const mutated = {
    ...first,
    payloadDigest:
      payloadDigest('mutated-payload'),
  };

  const conflict =
    await ledger.accept(mutated);

  assert.equal(conflict.accepted, false);
  assert.equal(
    conflict.reason,
    'sequence_conflict',
  );
});

test('chain substitution and sequence gaps fail closed', async () => {
  const first = await entry(
    0,
    null,
    'payload-one',
  );
  const badSecond = await entry(
    2,
    first.chainDigest,
    'payload-three',
  );

  const ledger =
    new IntegrityLedgerVerifier(
      STREAM_REF,
      digestProvider,
      verifier,
    );

  await ledger.accept(first);

  const gap =
    await ledger.accept(badSecond);

  assert.equal(gap.accepted, false);
  assert.equal(gap.reason, 'sequence_gap');
});

test('payload or signature tampering is detected cryptographically', async () => {
  const first = await entry(
    0,
    null,
    'payload-one',
  );

  const tamperedPayload = {
    ...first,
    payloadDigest:
      payloadDigest('different'),
  };

  const payloadLedger =
    new IntegrityLedgerVerifier(
      STREAM_REF,
      digestProvider,
      verifier,
    );

  const digestMismatch =
    await payloadLedger.accept(
      tamperedPayload,
    );

  assert.equal(
    digestMismatch.reason,
    'digest_mismatch',
  );

  const tamperedSignature = {
    ...first,
    signature: 'A'.repeat(43),
  };

  const signatureLedger =
    new IntegrityLedgerVerifier(
      STREAM_REF,
      digestProvider,
      verifier,
    );

  const signatureInvalid =
    await signatureLedger.accept(
      tamperedSignature,
    );

  assert.equal(
    signatureInvalid.reason,
    'signature_invalid',
  );
});
