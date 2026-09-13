import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  evaluateRefreshRotation,
} = loadTypeScriptModule('src/core/identity/refreshFamilyPolicy.ts');

const {
  evaluatePairing,
} = loadTypeScriptModule('src/core/identity/pairingPolicy.ts');

const NOW = 20_000_000;
const ACCOUNT_A = 'acct_aaaaaaaaaaaaaaaa';
const ACCOUNT_B = 'acct_bbbbbbbbbbbbbbbb';
const DEVICE_A = 'dev_aaaaaaaaaaaaaaaa';
const DEVICE_B = 'dev_bbbbbbbbbbbbbbbb';
const DEVICE_C = 'dev_cccccccccccccccc';
const KEY_B = 'dkey_bbbbbbbbbbbbbbbb';
const KEY_C = 'dkey_cccccccccccccccc';
const FAMILY_A = 'rfm_aaaaaaaaaaaaaaaa';
const PAIR_A = 'pair_aaaaaaaaaaaaaaaa';

function refreshFamily(overrides = {}) {
  return {
    refreshFamilyId: FAMILY_A,
    accountId: ACCOUNT_A,
    deviceId: DEVICE_A,
    currentGeneration: 4,
    state: 'active',
    ...overrides,
  };
}

function refreshInput(overrides = {}) {
  return {
    family: refreshFamily(),
    expectedAccountId: ACCOUNT_A,
    expectedDeviceId: DEVICE_A,
    expectedFamilyId: FAMILY_A,
    presentedGeneration: 4,
    ...overrides,
  };
}

function pairingChallenge(overrides = {}) {
  return {
    pairingChallengeId: PAIR_A,
    purpose: 'device_pairing',
    accountId: ACCOUNT_A,
    sourceDeviceId: DEVICE_A,
    targetDeviceId: DEVICE_B,
    targetDeviceKeyId: KEY_B,
    trustTier: 'standard',
    issuedAtMs: NOW - 30_000,
    expiresAtMs: NOW + 30_000,
    state: 'pending',
    ...overrides,
  };
}

function pairingInput(overrides = {}) {
  return {
    challenge: pairingChallenge(),
    nowMs: NOW,
    expectedAccountId: ACCOUNT_A,
    sourceDeviceId: DEVICE_A,
    sourceDeviceAccountId: ACCOUNT_A,
    sourceDeviceState: 'active',
    targetDeviceId: DEVICE_B,
    targetDeviceKeyId: KEY_B,
    authenticationAssurance: 'verified',
    authenticatedAtMs: NOW - 30_000,
    explicitApproval: true,
    ...overrides,
  };
}

test('current refresh generation rotates exactly once to the next generation', () => {
  assert.deepEqual(evaluateRefreshRotation(refreshInput()), {
    allowed: true,
    reason: 'rotate_allowed',
    nextGeneration: 5,
  });
});

test('older refresh generation is treated as suspected reuse', () => {
  assert.deepEqual(
    evaluateRefreshRotation(
      refreshInput({ presentedGeneration: 3 }),
    ),
    {
      allowed: false,
      reason: 'suspected_reuse',
    },
  );
});

test('future refresh generation and explicit suspected-reuse state fail closed', () => {
  assert.equal(
    evaluateRefreshRotation(
      refreshInput({ presentedGeneration: 5 }),
    ).reason,
    'generation_mismatch',
  );

  assert.equal(
    evaluateRefreshRotation(
      refreshInput({
        family: refreshFamily({ state: 'suspected_reuse' }),
      }),
    ).reason,
    'suspected_reuse',
  );
});

test('revoked refresh family and cross-account/cross-device use are rejected', () => {
  assert.equal(
    evaluateRefreshRotation(
      refreshInput({
        family: refreshFamily({ state: 'revoked' }),
      }),
    ).reason,
    'revoked',
  );

  assert.equal(
    evaluateRefreshRotation(
      refreshInput({
        family: refreshFamily({ accountId: ACCOUNT_B }),
      }),
    ).reason,
    'account_mismatch',
  );

  assert.equal(
    evaluateRefreshRotation(
      refreshInput({
        family: refreshFamily({ deviceId: DEVICE_B }),
      }),
    ).reason,
    'device_mismatch',
  );
});

test('malformed refresh family payloads never widen authority or throw', () => {
  for (const input of [
    null,
    [],
    refreshInput({ family: null }),
    refreshInput({ family: { ...refreshFamily(), currentGeneration: -1 } }),
    refreshInput({ family: { ...refreshFamily(), root: true } }),
    { ...refreshInput(), bypass: true },
  ]) {
    assert.equal(
      evaluateRefreshRotation(input).allowed,
      false,
    );
  }
});

test('standard pairing requires exact bindings fresh verified auth and explicit approval', () => {
  assert.deepEqual(evaluatePairing(pairingInput()), {
    allowed: true,
    reason: 'allowed',
  });

  assert.equal(
    evaluatePairing(
      pairingInput({ explicitApproval: false }),
    ).reason,
    'approval_required',
  );

  assert.equal(
    evaluatePairing(
      pairingInput({ authenticationAssurance: 'session' }),
    ).reason,
    'insufficient_authentication',
  );
});

test('privileged pairing requires fresh phishing-resistant authentication', () => {
  const privileged = pairingChallenge({ trustTier: 'privileged' });

  assert.equal(
    evaluatePairing(
      pairingInput({ challenge: privileged }),
    ).reason,
    'insufficient_authentication',
  );

  assert.equal(
    evaluatePairing(
      pairingInput({
        challenge: privileged,
        authenticationAssurance: 'phishing_resistant',
        authenticatedAtMs: NOW - 30_000,
      }),
    ).allowed,
    true,
  );

  assert.equal(
    evaluatePairing(
      pairingInput({
        challenge: privileged,
        authenticationAssurance: 'phishing_resistant',
        authenticatedAtMs: NOW - (6 * 60 * 1000),
      }),
    ).reason,
    'insufficient_authentication',
  );
});

test('pairing challenge is one-time and expires fail-closed', () => {
  assert.equal(
    evaluatePairing(
      pairingInput({
        challenge: pairingChallenge({ state: 'consumed' }),
      }),
    ).reason,
    'challenge_consumed',
  );

  assert.equal(
    evaluatePairing(
      pairingInput({
        challenge: pairingChallenge({ state: 'revoked' }),
      }),
    ).reason,
    'challenge_revoked',
  );

  assert.equal(
    evaluatePairing(
      pairingInput({
        challenge: pairingChallenge({ expiresAtMs: NOW }),
      }),
    ).reason,
    'challenge_expired',
  );
});

test('pairing rejects account source target and key substitution', () => {
  assert.equal(
    evaluatePairing(
      pairingInput({
        challenge: pairingChallenge({ accountId: ACCOUNT_B }),
      }),
    ).reason,
    'account_mismatch',
  );

  assert.equal(
    evaluatePairing(
      pairingInput({
        challenge: pairingChallenge({ sourceDeviceId: DEVICE_C }),
      }),
    ).reason,
    'source_device_mismatch',
  );

  assert.equal(
    evaluatePairing(
      pairingInput({
        challenge: pairingChallenge({ targetDeviceId: DEVICE_C }),
      }),
    ).reason,
    'target_device_mismatch',
  );

  assert.equal(
    evaluatePairing(
      pairingInput({
        challenge: pairingChallenge({ targetDeviceKeyId: KEY_C }),
      }),
    ).reason,
    'target_key_mismatch',
  );
});

test('revoked source device and source-target identity collision cannot pair', () => {
  assert.equal(
    evaluatePairing(
      pairingInput({ sourceDeviceState: 'revoked' }),
    ).reason,
    'source_device_not_active',
  );

  assert.equal(
    evaluatePairing(
      pairingInput({
        challenge: pairingChallenge({ targetDeviceId: DEVICE_A }),
        targetDeviceId: DEVICE_A,
      }),
    ).reason,
    'source_target_collision',
  );
});

test('pairing runtime parser rejects hostile fields and wrong purpose', () => {
  for (const input of [
    null,
    [],
    { ...pairingInput(), bypass: true },
    pairingInput({
      challenge: { ...pairingChallenge(), purpose: 'session_recovery' },
    }),
    pairingInput({
      challenge: { ...pairingChallenge(), hiddenAuthority: true },
    }),
  ]) {
    assert.equal(evaluatePairing(input).allowed, false);
  }
});

test('pairing and refresh policy are deterministic and do not mutate caller objects', () => {
  const pair = pairingInput();
  const refresh = refreshInput();
  const pairBefore = structuredClone(pair);
  const refreshBefore = structuredClone(refresh);

  assert.deepEqual(evaluatePairing(pair), evaluatePairing(pair));
  assert.deepEqual(
    evaluateRefreshRotation(refresh),
    evaluateRefreshRotation(refresh),
  );

  assert.deepEqual(pair, pairBefore);
  assert.deepEqual(refresh, refreshBefore);
});
