import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  evaluateRevocation: evaluateRevocationPolicy,
} = loadTypeScriptModule('src/core/identity/revocationPolicy.ts');

const NOW = 30_000_000;
const ACCOUNT_A = 'acct_aaaaaaaaaaaaaaaa';
const ACCOUNT_B = 'acct_bbbbbbbbbbbbbbbb';
const SESSION_A = 'sess_aaaaaaaaaaaaaaaa';
const SESSION_B = 'sess_bbbbbbbbbbbbbbbb';
const DEVICE_A = 'dev_aaaaaaaaaaaaaaaa';
const DEVICE_B = 'dev_bbbbbbbbbbbbbbbb';

function evaluateRevocation(input, trustedEvaluationTimeMs = NOW) {
  return evaluateRevocationPolicy(input, trustedEvaluationTimeMs);
}

function base(overrides = {}) {
  return {
    operation: 'sign_out_session',
    actorAccountId: ACCOUNT_A,
    targetAccountId: ACCOUNT_A,
    actorSessionId: SESSION_A,
    actorDeviceId: DEVICE_A,
    targetSessionId: SESSION_A,
    nowMs: NOW,
    authenticationAssurance: 'session',
    authenticatedAtMs: NOW - 1_000,
    explicitApproval: false,
    ...overrides,
  };
}

test('self sign-out is allowed without privileged step-up', () => {
  assert.deepEqual(evaluateRevocationPolicy(base()), {
    allowed: true,
    reason: 'allowed',
  });
});

test('remote session sign-out requires fresh verified authentication', () => {
  assert.equal(
    evaluateRevocation(
      base({ targetSessionId: SESSION_B }),
    ).reason,
    'authentication_required',
  );

  assert.equal(
    evaluateRevocation(
      base({
        targetSessionId: SESSION_B,
        authenticationAssurance: 'verified',
      }),
    ).allowed,
    true,
  );
});

test('device revocation requires approval and fresh verified authentication', () => {
  assert.equal(
    evaluateRevocation(
      base({
        operation: 'revoke_device',
        targetSessionId: undefined,
        targetDeviceId: DEVICE_B,
        authenticationAssurance: 'verified',
        explicitApproval: false,
      }),
    ).reason,
    'approval_required',
  );

  assert.equal(
    evaluateRevocation(
      base({
        operation: 'revoke_device',
        targetSessionId: undefined,
        targetDeviceId: DEVICE_B,
        authenticationAssurance: 'verified',
        explicitApproval: true,
      }),
    ).allowed,
    true,
  );
});

test('global revocation requires fresh phishing-resistant authentication', () => {
  for (const operation of [
    'revoke_all_other_sessions',
    'revoke_all_devices',
  ]) {
    assert.equal(
      evaluateRevocation(
        base({
          operation,
          targetSessionId: undefined,
          authenticationAssurance: 'verified',
          explicitApproval: true,
        }),
      ).reason,
      'authentication_required',
    );

    assert.equal(
      evaluateRevocation(
        base({
          operation,
          targetSessionId: undefined,
          authenticationAssurance: 'phishing_resistant',
          authenticatedAtMs: NOW - 1_000,
          explicitApproval: true,
        }),
      ).allowed,
      true,
    );
  }
});

test('untrusted request time cannot make stale revocation authentication fresh', () => {
  const staleAuthentication = NOW - (16 * 60 * 1000);

  assert.equal(
    evaluateRevocationPolicy(
      base({
        targetSessionId: SESSION_B,
        authenticationAssurance: 'verified',
        authenticatedAtMs: staleAuthentication,
        nowMs: staleAuthentication + 1_000,
      }),
      NOW,
    ).reason,
    'authentication_required',
  );

  assert.equal(
    evaluateRevocationPolicy(
      base({
        targetSessionId: SESSION_B,
        authenticationAssurance: 'verified',
      }),
    ).reason,
    'invalid_evaluation_time',
  );
});

test('revocation never crosses account boundary', () => {
  assert.equal(
    evaluateRevocation(
      base({ targetAccountId: ACCOUNT_B }),
    ).reason,
    'account_mismatch',
  );
});

test('target identifiers are mandatory for scoped revocation operations', () => {
  assert.equal(
    evaluateRevocation(
      base({ targetSessionId: undefined }),
    ).reason,
    'target_required',
  );

  assert.equal(
    evaluateRevocation(
      base({
        operation: 'revoke_device',
        targetSessionId: undefined,
        targetDeviceId: undefined,
        explicitApproval: true,
      }),
    ).reason,
    'target_required',
  );
});

test('malformed revocation requests fail closed', () => {
  for (const input of [
    null,
    [],
    { ...base(), operation: 'delete_everything' },
    { ...base(), root: true },
    { ...base(), actorAccountId: 'acct_short' },
    { ...base(), explicitApproval: 'yes' },
  ]) {
    assert.equal(evaluateRevocation(input).allowed, false);
  }
});

test('revocation policy is deterministic and does not mutate the request', () => {
  const request = base({
    operation: 'revoke_device',
    targetSessionId: undefined,
    targetDeviceId: DEVICE_B,
    authenticationAssurance: 'verified',
    explicitApproval: true,
  });
  const before = structuredClone(request);

  assert.deepEqual(evaluateRevocation(request), evaluateRevocation(request));
  assert.deepEqual(request, before);
});
