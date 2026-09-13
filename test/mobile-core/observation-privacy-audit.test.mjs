import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  createPrivacyAuditEvent,
} = loadTypeScriptModule(
  'src/core/privacy/privacyAudit.ts',
);

test('privacy audit maps high-value privacy failures to explicit security events', () => {
  const stopFailure = createPrivacyAuditEvent({
    eventId: 'privacy-event-1',
    kind: 'sensor_stop_failed',
    occurredAtMs: 100,
    deviceRef: 'device:phone-1',
    state: 'privacy_lock',
    sensorId: 'camera:front',
    reason: 'runtime_stop_unconfirmed',
  });

  assert.equal(stopFailure.type, 'privacy.sensor_stop_failed');
  assert.equal(stopFailure.severity, 'high');
  assert.equal(stopFailure.metadata.state, 'privacy_lock');
  assert.equal(stopFailure.metadata.sensorId, 'camera:front');

  const violation = createPrivacyAuditEvent({
    eventId: 'privacy-event-2',
    kind: 'policy_violation',
    occurredAtMs: 101,
    state: 'visual_off',
    sensorId: 'camera:rear',
  });

  assert.equal(violation.type, 'privacy.policy_violation');
  assert.equal(violation.severity, 'high');
});

test('privacy audit supports normal state-change and denied-reactivation events', () => {
  const changed = createPrivacyAuditEvent({
    eventId: 'privacy-event-3',
    kind: 'state_changed',
    occurredAtMs: 200,
    previousState: 'active',
    state: 'privacy_lock',
    reason: 'user_stop_command',
  });

  assert.equal(changed.type, 'privacy.state_changed');
  assert.equal(changed.severity, 'info');
  assert.deepEqual(changed.metadata, {
    state: 'privacy_lock',
    previousState: 'active',
    reason: 'user_stop_command',
  });

  const denied = createPrivacyAuditEvent({
    eventId: 'privacy-event-4',
    kind: 'reactivation_denied',
    occurredAtMs: 201,
    state: 'privacy_lock',
    reason: 'os_permission_required',
  });

  assert.equal(denied.type, 'privacy.reactivation_denied');
  assert.equal(denied.severity, 'warning');
});

test('privacy audit rejects unknown fields so raw sensor payload cannot slip into telemetry', () => {
  for (const input of [
    {
      eventId: 'privacy-event-5',
      kind: 'policy_violation',
      occurredAtMs: 300,
      rawFrame: 'base64-image-content',
    },
    {
      eventId: 'privacy-event-6',
      kind: 'policy_violation',
      occurredAtMs: 301,
      audioTranscript: 'private conversation',
    },
    {
      eventId: 'privacy-event-7',
      kind: 'policy_violation',
      occurredAtMs: 302,
      token: 'not-allowed-here',
    },
  ]) {
    assert.equal(createPrivacyAuditEvent(input), null);
  }
});

test('privacy audit rejects malformed identifiers timestamps states and control characters', () => {
  const invalidInputs = [
    null,
    [],
    {
      eventId: '',
      kind: 'state_changed',
      occurredAtMs: 1,
    },
    {
      eventId: 'event-1',
      kind: 'not_real',
      occurredAtMs: 1,
    },
    {
      eventId: 'event-1',
      kind: 'state_changed',
      occurredAtMs: Number.NaN,
    },
    {
      eventId: 'event-1',
      kind: 'state_changed',
      occurredAtMs: 1,
      state: 'admin_override',
    },
    {
      eventId: 'event-1',
      kind: 'state_changed',
      occurredAtMs: 1,
      sensorId: 'camera front with spaces',
    },
    {
      eventId: 'event-1',
      kind: 'state_changed',
      occurredAtMs: 1,
      reason: 'bad\u0000reason',
    },
  ];

  for (const input of invalidInputs) {
    assert.equal(createPrivacyAuditEvent(input), null);
  }
});

test('privacy audit never stores objects arrays or arbitrary sensor content', () => {
  const event = createPrivacyAuditEvent({
    eventId: 'privacy-event-8',
    kind: 'observation_unverifiable',
    occurredAtMs: 400,
    deviceRef: 'device:display-1',
    state: 'ambient_off',
    sensorId: 'presence:room',
    reason: 'registry_stale',
  });

  assert.ok(event);
  for (const value of Object.values(event.metadata)) {
    assert.ok(
      value === null ||
      ['string', 'number', 'boolean'].includes(typeof value),
    );
  }
  assert.equal(
    Object.prototype.hasOwnProperty.call(event.metadata, 'rawFrame'),
    false,
  );
});
