import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  evaluateAuthenticationChallenge: evaluateAuthenticationChallengePolicy,
  MAX_AUTH_CHALLENGE_LIFETIME_MS,
} = loadTypeScriptModule('src/core/identity/authChallengePolicy.ts');

const {
  buildSessionInventory,
} = loadTypeScriptModule('src/core/identity/sessionInventory.ts');

const NOW = 50_000_000;
const ACCOUNT = 'acct_aaaaaaaaaaaaaaaa';
const SESSION_A = 'sess_aaaaaaaaaaaaaaaa';
const SESSION_B = 'sess_bbbbbbbbbbbbbbbb';
const DEVICE_A = 'dev_aaaaaaaaaaaaaaaa';
const DEVICE_B = 'dev_bbbbbbbbbbbbbbbb';
const CHALLENGE = 'ach_aaaaaaaaaaaaaaaa';
const NONCE = 'N'.repeat(43);
const OTHER_NONCE = 'O'.repeat(43);

function evaluateAuthenticationChallenge(input, trustedEvaluationTimeMs = NOW) {
  return evaluateAuthenticationChallengePolicy(input, trustedEvaluationTimeMs);
}

function challenge(overrides = {}) {
  return {
    challengeId: CHALLENGE,
    purpose: 'step_up',
    accountId: ACCOUNT,
    sessionId: SESSION_A,
    challengeNonce: NONCE,
    issuedAtMs: NOW - 30_000,
    expiresAtMs: NOW + 30_000,
    state: 'pending',
    nowMs: NOW,
    expectedPurpose: 'step_up',
    expectedAccountId: ACCOUNT,
    expectedSessionId: SESSION_A,
    presentedChallengeNonce: NONCE,
    ...overrides,
  };
}

function inventoryEntry(overrides = {}) {
  return {
    sessionId: SESSION_A,
    deviceId: DEVICE_A,
    deviceLabel: 'Galaxy S21 Ultra',
    platform: 'android',
    createdAtMs: NOW - 10_000,
    lastActiveAtMs: NOW - 1_000,
    state: 'active',
    isCurrent: true,
    ...overrides,
  };
}

test('authentication challenge allows exact pending one-time binding', () => {
  assert.deepEqual(evaluateAuthenticationChallenge(challenge()), {
    allowed: true,
    reason: 'allowed',
  });
});

test('authentication challenge rejects purpose account session and nonce substitution', () => {
  assert.equal(
    evaluateAuthenticationChallenge(
      challenge({ expectedPurpose: 'recovery_change' }),
    ).reason,
    'purpose_mismatch',
  );

  assert.equal(
    evaluateAuthenticationChallenge(
      challenge({ expectedAccountId: 'acct_bbbbbbbbbbbbbbbb' }),
    ).reason,
    'account_mismatch',
  );

  assert.equal(
    evaluateAuthenticationChallenge(
      challenge({ expectedSessionId: SESSION_B }),
    ).reason,
    'session_mismatch',
  );

  assert.equal(
    evaluateAuthenticationChallenge(
      challenge({ presentedChallengeNonce: OTHER_NONCE }),
    ).reason,
    'nonce_mismatch',
  );
});

test('consumed revoked expired and overlong authentication challenges fail closed', () => {
  assert.equal(
    evaluateAuthenticationChallenge(
      challenge({ state: 'consumed' }),
    ).reason,
    'challenge_consumed',
  );

  assert.equal(
    evaluateAuthenticationChallenge(
      challenge({ state: 'revoked' }),
    ).reason,
    'challenge_revoked',
  );

  assert.equal(
    evaluateAuthenticationChallenge(
      challenge({ expiresAtMs: NOW }),
    ).reason,
    'challenge_expired',
  );

  assert.equal(
    evaluateAuthenticationChallenge(
      challenge({
        issuedAtMs: NOW,
        expiresAtMs: NOW + MAX_AUTH_CHALLENGE_LIFETIME_MS + 1,
        nowMs: NOW + 1,
      }),
      NOW + 1,
    ).reason,
    'challenge_lifetime_exceeded',
  );
});

test('untrusted challenge time cannot revive an expired challenge', () => {
  assert.equal(
    evaluateAuthenticationChallengePolicy(
      challenge({
        expiresAtMs: NOW - 1,
        nowMs: NOW - 60_000,
      }),
      NOW,
    ).reason,
    'challenge_expired',
  );

  assert.equal(
    evaluateAuthenticationChallengePolicy(challenge()).reason,
    'invalid_evaluation_time',
  );
});

test('sign-in challenge must not smuggle a session binding', () => {
  const input = challenge({
    purpose: 'sign_in',
    expectedPurpose: 'sign_in',
    sessionId: undefined,
    expectedSessionId: undefined,
  });

  assert.equal(evaluateAuthenticationChallenge(input).allowed, true);

  assert.equal(
    evaluateAuthenticationChallenge({
      ...input,
      sessionId: SESSION_A,
    }).reason,
    'invalid_challenge',
  );
});

test('malformed authentication challenges fail closed', () => {
  for (const input of [
    null,
    [],
    { ...challenge(), bypass: true },
    challenge({ challengeId: 'ach_short' }),
    challenge({ challengeNonce: 'weak' }),
    challenge({ purpose: 'admin_override' }),
  ]) {
    assert.equal(evaluateAuthenticationChallenge(input).allowed, false);
  }
});

test('session inventory returns only explicitly allowed public security fields', () => {
  const result = buildSessionInventory([
    inventoryEntry(),
    inventoryEntry({
      sessionId: SESSION_B,
      deviceId: DEVICE_B,
      deviceLabel: 'Desktop',
      platform: 'linux',
      createdAtMs: NOW - 20_000,
      lastActiveAtMs: NOW - 5_000,
      isCurrent: false,
    }),
  ]);

  assert.equal(result.valid, true);
  assert.equal(result.entries.length, 2);
  assert.equal(result.entries[0].sessionId, SESSION_A);
  assert.deepEqual(
    Object.keys(result.entries[0]).sort(),
    [
      'createdAtMs',
      'deviceId',
      'deviceLabel',
      'isCurrent',
      'lastActiveAtMs',
      'platform',
      'sessionId',
      'state',
    ].sort(),
  );
});

test('session inventory rejects duplicate sessions multiple current sessions and secret-shaped extra fields', () => {
  assert.equal(
    buildSessionInventory([
      inventoryEntry(),
      inventoryEntry(),
    ]).valid,
    false,
  );

  assert.equal(
    buildSessionInventory([
      inventoryEntry(),
      inventoryEntry({
        sessionId: SESSION_B,
        deviceId: DEVICE_B,
      }),
    ]).valid,
    false,
  );

  assert.equal(
    buildSessionInventory([
      {
        ...inventoryEntry(),
        refreshToken: 'must-never-be-in-inventory',
      },
    ]).valid,
    false,
  );
});

test('session inventory rejects malformed ordering and excessive entries', () => {
  assert.equal(
    buildSessionInventory([
      inventoryEntry({ lastActiveAtMs: NOW - 20_000 }),
    ]).valid,
    false,
  );

  assert.equal(
    buildSessionInventory(
      Array.from({ length: 101 }, (_, index) =>
        inventoryEntry({
          sessionId: `sess_${String(index).padStart(16, '0')}`,
          deviceId: `dev_${String(index).padStart(16, '0')}`,
          isCurrent: false,
        }),
      ),
    ).valid,
    false,
  );
});


test('session inventory rejects negative and unsafe finite timestamps', () => {
  for (const value of [
    inventoryEntry({ createdAtMs: -1 }),
    inventoryEntry({ createdAtMs: Number.MAX_SAFE_INTEGER + 1 }),
    inventoryEntry({ lastActiveAtMs: Number.MAX_SAFE_INTEGER + 1 }),
  ]) {
    assert.equal(buildSessionInventory([value]).valid, false);
  }
});
