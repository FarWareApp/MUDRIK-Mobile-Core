import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  isIdentityId,
  isPublicKeyThumbprint,
} = loadTypeScriptModule('src/core/identity/identityIds.ts');

const {
  evaluateAuthenticationAssurance,
  getStepUpRequirement,
} = loadTypeScriptModule('src/core/identity/authAssurance.ts');

const {
  evaluateSession,
} = loadTypeScriptModule('src/core/identity/sessionPolicy.ts');

const {
  evaluateDeviceTrust,
} = loadTypeScriptModule('src/core/identity/deviceTrust.ts');

const NOW = 10_000_000;
const ACCOUNT_A = 'acct_aaaaaaaaaaaaaaaa';
const ACCOUNT_B = 'acct_bbbbbbbbbbbbbbbb';
const DEVICE_A = 'dev_aaaaaaaaaaaaaaaa';
const DEVICE_B = 'dev_bbbbbbbbbbbbbbbb';
const KEY_A = 'dkey_aaaaaaaaaaaaaaaa';
const KEY_B = 'dkey_bbbbbbbbbbbbbbbb';
const SESSION_A = 'sess_aaaaaaaaaaaaaaaa';
const THUMB_A = 'A'.repeat(43);
const THUMB_B = 'B'.repeat(43);

function activeSession(overrides = {}) {
  return {
    sessionId: SESSION_A,
    accountId: ACCOUNT_A,
    deviceId: DEVICE_A,
    deviceKeyId: KEY_A,
    issuedAtMs: NOW - 60_000,
    expiresAtMs: NOW + 60_000,
    authenticatedAtMs: NOW - 60_000,
    assurance: 'verified',
    state: 'active',
    ...overrides,
  };
}

function sessionInput(session, overrides = {}) {
  return {
    session,
    nowMs: NOW,
    expectedAccountId: ACCOUNT_A,
    expectedDeviceId: DEVICE_A,
    expectedDeviceKeyId: KEY_A,
    ...overrides,
  };
}

function activeDevice(overrides = {}) {
  return {
    deviceId: DEVICE_A,
    accountId: ACCOUNT_A,
    deviceKeyId: KEY_A,
    publicKeyThumbprint: THUMB_A,
    state: 'active',
    hardwareBacked: true,
    ...overrides,
  };
}

test('identity identifiers are typed by prefix and reject malformed or cross-kind values', () => {
  assert.equal(isIdentityId('account', ACCOUNT_A), true);
  assert.equal(isIdentityId('device', DEVICE_A), true);
  assert.equal(isIdentityId('device_key', KEY_A), true);
  assert.equal(isIdentityId('session', SESSION_A), true);

  assert.equal(isIdentityId('account', DEVICE_A), false);
  assert.equal(isIdentityId('device', 'dev_short'), false);
  assert.equal(isIdentityId('device', 'dev_AAAAAAAAAAAAAAAA'), false);
  assert.equal(isIdentityId('session', `${SESSION_A}\0evil`), false);
  assert.equal(isIdentityId('account', null), false);

  assert.equal(isPublicKeyThumbprint(THUMB_A), true);
  assert.equal(isPublicKeyThumbprint('A'.repeat(42)), false);
  assert.equal(isPublicKeyThumbprint(`${'A'.repeat(42)}=`), false);
});

test('baseline step-up policy becomes stronger as risk increases', () => {
  assert.equal(getStepUpRequirement('low').minimumAssurance, 'session');
  assert.equal(getStepUpRequirement('medium').minimumAssurance, 'session');
  assert.equal(getStepUpRequirement('high').minimumAssurance, 'verified');
  assert.equal(
    getStepUpRequirement('critical').minimumAssurance,
    'phishing_resistant',
  );
  assert.equal(getStepUpRequirement('critical').requiresExplicitApproval, true);
});

test('high risk rejects a session-only claim and accepts fresh verified authentication', () => {
  assert.equal(
    evaluateAuthenticationAssurance({
      risk: 'high',
      assurance: 'session',
      nowMs: NOW,
      authenticatedAtMs: NOW - 1_000,
    }).reason,
    'insufficient_assurance',
  );

  assert.equal(
    evaluateAuthenticationAssurance({
      risk: 'high',
      assurance: 'verified',
      nowMs: NOW,
      authenticatedAtMs: NOW - 1_000,
    }).allowed,
    true,
  );
});

test('critical risk requires fresh phishing-resistant authentication', () => {
  assert.equal(
    evaluateAuthenticationAssurance({
      risk: 'critical',
      assurance: 'verified',
      nowMs: NOW,
      authenticatedAtMs: NOW - 1_000,
    }).reason,
    'insufficient_assurance',
  );

  assert.equal(
    evaluateAuthenticationAssurance({
      risk: 'critical',
      assurance: 'phishing_resistant',
      nowMs: NOW,
      authenticatedAtMs: NOW - 1_000,
    }).allowed,
    true,
  );

  assert.equal(
    evaluateAuthenticationAssurance({
      risk: 'critical',
      assurance: 'phishing_resistant',
      nowMs: NOW,
      authenticatedAtMs: NOW - (6 * 60 * 1000),
    }).reason,
    'stale_authentication',
  );
});

test('authentication assurance rejects forged fields future timestamps and malformed risk', () => {
  for (const input of [
    null,
    [],
    { risk: 'critical', assurance: 'root', nowMs: NOW },
    { risk: 'extreme', assurance: 'phishing_resistant', nowMs: NOW },
    {
      risk: 'high',
      assurance: 'verified',
      nowMs: NOW,
      authenticatedAtMs: NOW + 1,
    },
    {
      risk: 'high',
      assurance: 'verified',
      nowMs: NOW,
      authenticatedAtMs: NOW - 1,
      bypass: true,
    },
  ]) {
    assert.equal(evaluateAuthenticationAssurance(input).allowed, false);
  }
});

test('active session is accepted only for exact account device and key binding', () => {
  assert.deepEqual(evaluateSession(sessionInput(activeSession())), {
    allowed: true,
    reason: 'allowed',
  });

  assert.equal(
    evaluateSession(
      sessionInput(activeSession({ accountId: ACCOUNT_B })),
    ).reason,
    'account_mismatch',
  );

  assert.equal(
    evaluateSession(
      sessionInput(activeSession({ deviceId: DEVICE_B })),
    ).reason,
    'device_mismatch',
  );

  assert.equal(
    evaluateSession(
      sessionInput(activeSession({ deviceKeyId: KEY_B })),
    ).reason,
    'device_key_mismatch',
  );
});

test('expired revoked reauth and suspected-reuse sessions fail closed', () => {
  assert.equal(
    evaluateSession(
      sessionInput(activeSession({ expiresAtMs: NOW })),
    ).reason,
    'expired',
  );

  assert.equal(
    evaluateSession(
      sessionInput(activeSession({ state: 'revoked' })),
    ).reason,
    'revoked',
  );

  assert.equal(
    evaluateSession(
      sessionInput(activeSession({ state: 'reauth_required' })),
    ).reason,
    'reauthentication_required',
  );

  assert.equal(
    evaluateSession(
      sessionInput(activeSession({ state: 'suspected_reuse' })),
    ).reason,
    'suspected_reuse',
  );
});

test('future-issued and structurally hostile session inputs are rejected', () => {
  assert.equal(
    evaluateSession(
      sessionInput(activeSession({ issuedAtMs: NOW + 1 })),
    ).reason,
    'issued_in_future',
  );

  for (const session of [
    null,
    [],
    { ...activeSession(), state: 'admin' },
    { ...activeSession(), expiresAtMs: activeSession().issuedAtMs },
    { ...activeSession(), unexpectedAuthority: true },
  ]) {
    assert.equal(
      evaluateSession(sessionInput(session)).reason,
      'invalid_session',
    );
  }
});

test('device trust requires exact account device key and public-key thumbprint', () => {
  const baseInput = {
    device: activeDevice(),
    expectedAccountId: ACCOUNT_A,
    expectedDeviceId: DEVICE_A,
    expectedDeviceKeyId: KEY_A,
    expectedPublicKeyThumbprint: THUMB_A,
  };

  assert.deepEqual(evaluateDeviceTrust(baseInput), {
    trusted: true,
    reason: 'trusted',
  });

  assert.equal(
    evaluateDeviceTrust({
      ...baseInput,
      device: activeDevice({ accountId: ACCOUNT_B }),
    }).reason,
    'account_mismatch',
  );

  assert.equal(
    evaluateDeviceTrust({
      ...baseInput,
      device: activeDevice({ deviceId: DEVICE_B }),
    }).reason,
    'device_mismatch',
  );

  assert.equal(
    evaluateDeviceTrust({
      ...baseInput,
      device: activeDevice({ deviceKeyId: KEY_B }),
    }).reason,
    'device_key_mismatch',
  );

  assert.equal(
    evaluateDeviceTrust({
      ...baseInput,
      device: activeDevice({ publicKeyThumbprint: THUMB_B }),
    }).reason,
    'thumbprint_mismatch',
  );
});

test('hardware-backed metadata never overrides revoked suspended or pending state', () => {
  const baseInput = {
    expectedAccountId: ACCOUNT_A,
    expectedDeviceId: DEVICE_A,
    expectedDeviceKeyId: KEY_A,
    expectedPublicKeyThumbprint: THUMB_A,
  };

  for (const [state, reason] of [
    ['pending_pairing', 'pending_pairing'],
    ['rotation_required', 'rotation_required'],
    ['suspended', 'suspended'],
    ['revoked', 'revoked'],
  ]) {
    assert.deepEqual(
      evaluateDeviceTrust({
        ...baseInput,
        device: activeDevice({ state, hardwareBacked: true }),
      }),
      { trusted: false, reason },
    );
  }
});

test('device key provider contract exposes no private-key export API', () => {
  const source = fs.readFileSync(
    'src/core/identity/deviceKeyProvider.ts',
    'utf8',
  );

  const interfaceBody = source.match(
    /export interface DeviceKeyProvider\s*\{([\s\S]*?)\n\}/,
  )?.[1] ?? '';

  assert.match(interfaceBody, /signChallenge/);
  assert.match(interfaceBody, /rotateDeviceSigningKey/);
  assert.doesNotMatch(interfaceBody, /exportPrivateKey/);
  assert.doesNotMatch(interfaceBody, /getPrivateKey/);
  assert.doesNotMatch(interfaceBody, /serializePrivateKey/);
});
