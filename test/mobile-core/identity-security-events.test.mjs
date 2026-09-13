import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  SECURITY_EVENT_TYPES,
  createSecurityEvent,
  sanitizeSecurityMetadata,
} = loadTypeScriptModule('src/core/security/securityEvent.ts');

const NOW = 60_000_000;

test('identity lifecycle security event types are registered', () => {
  for (const type of [
    'authentication.succeeded',
    'authentication.failed',
    'authentication.step_up_required',
    'session.suspected_reuse',
    'device.paired',
    'device.pairing_rejected',
    'device.key_rotated',
    'recovery.requested',
    'recovery.completed',
    'recovery.denied',
  ]) {
    assert.equal(SECURITY_EVENT_TYPES.includes(type), true);
  }
});

test('identity security metadata redacts challenge assertions and recovery secrets', () => {
  const sanitized = sanitizeSecurityMetadata({
    result: 'denied',
    assertion: 'opaque-passkey-assertion',
    challengeNonce: 'opaque-one-time-challenge',
    recoveryCode: 'opaque-recovery-code',
    recoverySecret: 'opaque-recovery-secret',
    sessionKey: 'opaque-session-key',
  });

  assert.equal(sanitized.result, 'denied');
  assert.equal(sanitized.assertion, '[REDACTED]');
  assert.equal(sanitized.challengeNonce, '[REDACTED]');
  assert.equal(sanitized.recoveryCode, '[REDACTED]');
  assert.equal(sanitized.recoverySecret, '[REDACTED]');
  assert.equal(sanitized.sessionKey, '[REDACTED]');
});

test('identity audit event stores references and safe outcome metadata only', () => {
  const event = createSecurityEvent({
    eventId: 'evt-identity-1',
    type: 'device.pairing_rejected',
    severity: 'warning',
    occurredAtMs: NOW,
    actorRef: 'acct_aaaaaaaaaaaaaaaa',
    deviceRef: 'dev_aaaaaaaaaaaaaaaa',
    metadata: {
      reason: 'challenge_consumed',
      challengeNonce: 'must-not-appear',
    },
  });

  assert.equal(event.metadata.reason, 'challenge_consumed');
  assert.equal(event.metadata.challengeNonce, '[REDACTED]');
  assert.equal(Object.isFrozen(event), true);
  assert.equal(Object.isFrozen(event.metadata), true);
});
