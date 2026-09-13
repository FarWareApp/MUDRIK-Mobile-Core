import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  evaluateSession,
  MAX_ACCESS_SESSION_LIFETIME_MS,
} = loadTypeScriptModule('src/core/identity/sessionPolicy.ts');

const NOW = 40_000_000;
const ACCOUNT = 'acct_aaaaaaaaaaaaaaaa';
const DEVICE = 'dev_aaaaaaaaaaaaaaaa';
const KEY = 'dkey_aaaaaaaaaaaaaaaa';
const SESSION = 'sess_aaaaaaaaaaaaaaaa';

function session(expiresAtMs) {
  return {
    sessionId: SESSION,
    accountId: ACCOUNT,
    deviceId: DEVICE,
    deviceKeyId: KEY,
    issuedAtMs: NOW,
    expiresAtMs,
    authenticatedAtMs: NOW,
    assurance: 'verified',
    state: 'active',
  };
}

function input(value, nowMs = NOW) {
  return {
    session: value,
    nowMs,
    expectedAccountId: ACCOUNT,
    expectedDeviceId: DEVICE,
    expectedDeviceKeyId: KEY,
  };
}

test('access session lifetime at the configured maximum is accepted before expiry', () => {
  const expiresAtMs = NOW + MAX_ACCESS_SESSION_LIFETIME_MS;

  assert.equal(
    evaluateSession(input(session(expiresAtMs), NOW + 1)).allowed,
    true,
  );
});

test('access session lifetime beyond the configured maximum is rejected', () => {
  const expiresAtMs = NOW + MAX_ACCESS_SESSION_LIFETIME_MS + 1;

  assert.deepEqual(
    evaluateSession(input(session(expiresAtMs), NOW + 1)),
    {
      allowed: false,
      reason: 'lifetime_exceeded',
    },
  );
});
