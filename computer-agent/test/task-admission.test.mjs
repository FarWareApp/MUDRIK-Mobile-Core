import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';

import {
  TaskAdmissionRegistry,
} from '../src/task-admission.mjs';

import {
  canonicalTaskPayload,
  parseComputerTaskEnvelope,
  verifyComputerTaskSignature,
} from '../src/task-envelope.mjs';

const ACCOUNT =
  'acct_0123456789abcdef';
const DEVICE =
  'dev_0123456789abcdef';
const SIGNER =
  'skey_0123456789abcdef';
const NOW =
  Date.parse('2026-09-27T20:00:00.000Z');

const {
  publicKey,
  privateKey,
} = crypto.generateKeyPairSync(
  'ed25519',
);

function envelope(overrides = {}) {
  return {
    protocolVersion: '1.0',
    taskId:
      'ctask_0123456789abcdef',
    accountId: ACCOUNT,
    deviceId: DEVICE,    source: 'web',
    intent: 'Run bounded tests',
    workspace: '/tmp/mudrik',
    risk: 'medium',
    requestedCapabilities: [
      'terminal.execute',
    ],
    approval: null,
    createdAt:
      '2026-09-27T20:00:00.000Z',
    expiresAt:
      '2026-09-27T21:00:00.000Z',
    nonce:
      'nonce_0123456789abcdef',
    steps: [{
      stepId:
        'cstep_0123456789abcdef',
      tool: 'terminal',
      summary: 'Run tests',
      requiredCapabilities: [
        'terminal.execute',
      ],
      input: {
        executable: process.execPath,
        args: ['--version'],
        cwd: '/tmp/mudrik',
      },
      continueOnError: false,
    }],
    metadata: {},
    signerKeyId: SIGNER,
    signature: 'A'.repeat(86),
    ...overrides,
  };
}

function signed(
  overrides = {},
  key = privateKey,
) {
  const value = envelope(overrides);
  const payload =
    canonicalTaskPayload(value);
  assert.ok(payload);

  return {
    ...value,
    signature: crypto
      .sign(
        null,
        payload,
        key,
      )
      .toString('base64url'),
  };
}

function registry(overrides = {}) {
  return new TaskAdmissionRegistry({
    accountId: ACCOUNT,
    deviceId: DEVICE,
    trustedSigners: [{
      signerKeyId: SIGNER,
      accountId: ACCOUNT,
      publicKey,
    }],
    ...overrides,
  });
}

test(
  'strict signed envelope parses and verifies',
  () => {
    const task = signed();
    const parsed =
      parseComputerTaskEnvelope(task);

    assert.ok(parsed);
    assert.equal(
      verifyComputerTaskSignature(
        task,
        publicKey,
      ),
      true,
    );
    assert.equal(
      parsed.accountId,
      ACCOUNT,
    );
    assert.equal(
      parsed.deviceId,
      DEVICE,
    );
  },
);

test(
  'signature verification detects any signed field tampering',
  () => {
    const task = signed();

    assert.equal(
      verifyComputerTaskSignature(
        {
          ...task,
          intent: 'Tampered intent',
        },
        publicKey,
      ),
      false,
    );
  },
);

test(
  'unknown top level step and approval fields fail closed',
  () => {
    const base = signed();

    assert.equal(
      parseComputerTaskEnvelope({
        ...base,
        admin: true,
      }),
      null,
    );

    assert.equal(
      parseComputerTaskEnvelope({
        ...base,
        steps: [{
          ...base.steps[0],
          shell: true,
        }],
      }),
      null,
    );
    assert.equal(
      parseComputerTaskEnvelope({
        ...base,
        approval: {
          mode: 'automatic',
          force: true,
        },
      }),
      null,
    );
  },
);

test(
  'raw credential-like fields are rejected from signed persisted input',
  () => {
    for (const input of [
      {
        token: 'secret-value',
      },
      {
        credentials: {
          user: 'x',
        },
      },
      {
        nested: {
          apiKey: 'secret-value',
        },
      },
    ]) {
      const value = signed({
        steps: [{
          ...envelope().steps[0],
          input,
        }],
      });

      assert.equal(
        parseComputerTaskEnvelope(
          value,
        ),
        null,
      );
    }
  },
);

test(
  'valid task admission binds account device signer expiry and signature',
  () => {
    const accepted =
      registry().admit(
        signed(),
        NOW + 1_000,
      );

    assert.equal(accepted.accepted, true);
    assert.equal(
      accepted.idempotent,
      false,
    );
    assert.equal(
      accepted.reason,
      'accepted',
    );
    assert.equal(
      accepted.grantsAuthority,
      false,
    );
    assert.equal(
      accepted.performsExternalAction,
      false,
    );
  },
);

test(
  'exact duplicate delivery is idempotent',
  () => {
    const value = signed();
    const store = registry();

    const first =
      store.admit(
        value,
        NOW + 1_000,
      );
    const second =
      store.admit(
        value,
        NOW + 2_000,
      );
    assert.equal(first.accepted, true);
    assert.equal(second.accepted, true);
    assert.equal(
      second.idempotent,
      true,
    );
    assert.equal(
      second.reason,
      'duplicate',
    );
    assert.equal(
      second.task,
      first.task,
    );
  },
);

test(
  'task id conflict and nonce replay fail closed',
  () => {
    const store = registry();

    assert.equal(
      store.admit(
        signed(),
        NOW + 1_000,
      ).accepted,
      true,
    );

    const conflict =
      store.admit(
        signed({
          intent: 'Different',
          nonce:
            'nonce_1111111111111111',
        }),
        NOW + 2_000,
      );

    assert.equal(
      conflict.accepted,
      false,
    );
    assert.equal(
      conflict.reason,
      'task_conflict',
    );

    const replay =
      store.admit(
        signed({
          taskId:
            'ctask_1111111111111111',
        }),
        NOW + 2_000,
      );

    assert.equal(replay.accepted, false);
    assert.equal(
      replay.reason,
      'nonce_replay',
    );
  },
);

test(
  'wrong account device signer and signature are rejected',
  () => {
    const cases = [
      [
        signed({
          accountId:
            'acct_1111111111111111',
        }),
        'binding_mismatch',
      ],
      [
        signed({
          deviceId:
            'dev_1111111111111111',
        }),
        'binding_mismatch',
      ],
      [
        signed({
          signerKeyId:
            'skey_1111111111111111',
        }),
        'untrusted_signer',
      ],
      [
        {
          ...signed(),
          signature: 'B'.repeat(86),
        },
        'invalid_signature',
      ],
    ];    for (const [value, reason] of cases) {
      const result =
        registry().admit(
          value,
          NOW + 1_000,
        );

      assert.equal(
        result.accepted,
        false,
      );
      assert.equal(
        result.reason,
        reason,
      );
    }
  },
);

test(
  'trusted time rejects expired and excessively future tasks',
  () => {
    const expired =
      registry().admit(
        signed({
          expiresAt:
            '2026-09-27T20:00:01.000Z',
        }),
        NOW + 1_000,
      );

    assert.equal(expired.accepted, false);
    assert.equal(
      expired.reason,
      'expired_task',
    );

    const future =
      registry({
        maxClockSkewMs: 1_000,
      }).admit(
        signed({
          createdAt:
            '2026-09-27T20:00:02.001Z',
        }),
        NOW + 1_000,
      );
    assert.equal(future.accepted, false);
    assert.equal(
      future.reason,
      'future_task',
    );
  },
);

test(
  'secret-like plaintext values are rejected from durable task content',
  () => {
    const hostile = [
      signed({
        intent:
          'token=supersecretvalue12345',
      }),
      signed({
        steps: [{
          ...envelope().steps[0],
          input: {
            executable: process.execPath,
            args: [
              '-e',
              'console.log("'
                + 's'
                + 'k-'
                + 'abcdefghijklmnopqrstuvwxyz123456'
                + '")',
            ],
            cwd: '/tmp/mudrik',
          },
        }],
      }),
      signed({
        metadata: {
          note:
            'Bearer abcdefghijklmnopqrstuvwxyz',
        },
      }),
    ];

    for (const value of hostile) {
      assert.equal(
        parseComputerTaskEnvelope(
          value,
        ),
        null,
      );
    }
  },
);

test(
  'parsed task deeply detaches and freezes nested execution input',
  () => {
    const raw = signed();
    const parsed =
      parseComputerTaskEnvelope(raw);

    assert.ok(parsed);
    assert.equal(
      Object.isFrozen(
        parsed.steps[0].input,
      ),
      true,
    );
    assert.equal(
      Object.isFrozen(
        parsed.steps[0].input.args,
      ),
      true,
    );

    const originalExecutable =
      parsed.steps[0].input.args[0];

    raw.steps[0].input.args[0] =
      'tampered-after-parse';

    assert.equal(
      parsed.steps[0].input.args[0],
      originalExecutable,
    );

    assert.throws(
      () => {
        parsed.steps[0].input.args.push(
          'tamper',
        );
      },
      TypeError,
    );
  },
);

test(
  'metadata remains flat bounded and schema-compatible',
  () => {
    const nested = signed({
      metadata: {
        nested: {
          value: true,
        },
      },
    });

    assert.equal(
      parseComputerTaskEnvelope(
        nested,
      ),
      null,
    );

    const flat = signed({
      metadata: {
        label: 'safe',
        attempt: 2,
        enabled: true,
        optional: null,
      },
    });

    const parsed =
      parseComputerTaskEnvelope(flat);

    assert.ok(parsed);
    assert.equal(
      Object.isFrozen(parsed.metadata),
      true,
    );
  },
);

test(
  'admission registry rejects malformed runtime trust configuration',
  () => {
    assert.throws(
      () =>
        new TaskAdmissionRegistry({
          accountId: 'acct_bad',
          deviceId: DEVICE,
          trustedSigners: [{
            signerKeyId: SIGNER,
            accountId: ACCOUNT,
            publicKey,
          }],
        }),
      TypeError,
    );

    assert.throws(
      () =>
        new TaskAdmissionRegistry({
          accountId: ACCOUNT,
          deviceId: DEVICE,
          trustedSigners: [],
        }),
      TypeError,
    );

    assert.throws(
      () =>
        new TaskAdmissionRegistry({
          accountId: ACCOUNT,
          deviceId: DEVICE,
          trustedSigners: [{
            signerKeyId: SIGNER,
            accountId: ACCOUNT,
            publicKey,
          }],
          maxClockSkewMs:
            3_600_001,
        }),
      TypeError,
    );
  },
);

test(
  'trusted signer ids account binding duplicates and key type are strict',
  () => {
    assert.throws(
      () =>
        new TaskAdmissionRegistry({
          accountId: ACCOUNT,
          deviceId: DEVICE,
          trustedSigners: [
            {
              signerKeyId: SIGNER,
              accountId: ACCOUNT,
              publicKey,
            },
            {
              signerKeyId: SIGNER,
              accountId: ACCOUNT,
              publicKey,
            },
          ],
        }),
      /duplicate trusted signer/i,
    );

    assert.throws(
      () =>
        new TaskAdmissionRegistry({
          accountId: ACCOUNT,
          deviceId: DEVICE,
          trustedSigners: [{
            signerKeyId: SIGNER,
            accountId:
              'acct_1111111111111111',
            publicKey,
          }],
        }),
      /trusted signer/i,
    );

    const rsa =
      crypto.generateKeyPairSync(
        'rsa',
        {
          modulusLength: 2048,
        },
      );

    assert.throws(
      () =>
        new TaskAdmissionRegistry({
          accountId: ACCOUNT,
          deviceId: DEVICE,
          trustedSigners: [{
            signerKeyId: SIGNER,
            accountId: ACCOUNT,
            publicKey:
              rsa.publicKey,
          }],
        }),
      /Ed25519/,
    );
  },
);
