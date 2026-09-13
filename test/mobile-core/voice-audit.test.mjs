import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const audit = loadTypeScriptModule(
  'src/core/voice/voiceAudit.ts',
);

function base(overrides = {}) {
  return {
    eventId: 'evt_voice_0123456789',
    kind: 'provider_failure',
    occurredAtMs: 1000,
    deviceRef: 'device_local_1',
    sessionRef: 'voice_0123456789abcdef',
    generation: 2,
    phase: 'processing',
    reason: 'provider_unavailable',
    providerRef: 'vp_primary01',
    service: 'stt',
    ...overrides,
  };
}

test('voice audit maps high-value failures to explicit security event types', () => {
  const expected = new Map([
    ['input_activation_denied', 'voice.input_activation_denied'],
    ['stream_replay_rejected', 'voice.stream_replay_rejected'],
    ['barge_in_rejected', 'voice.barge_in_rejected'],
    ['provider_failure', 'voice.provider_failure'],
    ['lifecycle_violation', 'voice.lifecycle_violation'],
  ]);

  for (const [kind, type] of expected) {
    const event = audit.createVoiceAuditEvent(base({ kind }));
    assert.ok(event);
    assert.equal(event.type, type);
  }
});

test('voice audit stores references and bounded state metadata only', () => {
  const event = audit.createVoiceAuditEvent(base());
  assert.ok(event);
  assert.deepEqual(event.metadata, {
    sessionRef: 'voice_0123456789abcdef',
    generation: 2,
    phase: 'processing',
    reason: 'provider_unavailable',
    providerRef: 'vp_primary01',
    service: 'stt',
  });
});

test('voice audit structurally rejects raw transcript audio payload and provider response fields', () => {
  const forbidden = [
    { transcript: 'private spoken words' },
    { rawAudio: 'base64-audio' },
    { payloadRef: 'audio_local:chunk-001' },
    { providerResponse: { text: 'private' } },
    { apiKey: 'forbidden' },
  ];

  for (const extra of forbidden) {
    assert.equal(
      audit.createVoiceAuditEvent({
        ...base(),
        ...extra,
      }),
      null,
    );
  }
});

test('voice audit rejects malformed references generation phase reason and provider identity', () => {
  const invalid = [
    base({ eventId: '' }),
    base({ occurredAtMs: Number.NaN }),
    base({ sessionRef: 'bad ref with spaces' }),
    base({ generation: -1 }),
    base({ phase: 'admin' }),
    base({ reason: 'bad\u0000reason' }),
    base({ providerRef: 'provider-secret' }),
    base({ service: 'reasoning' }),
    base({ kind: 'raw_audio_saved' }),
  ];

  for (const value of invalid) {
    assert.equal(audit.createVoiceAuditEvent(value), null);
  }
});

test('voice audit permits sparse non-content events without inventing metadata', () => {
  const event = audit.createVoiceAuditEvent({
    eventId: 'evt_voice_sparse_01',
    kind: 'barge_in_rejected',
    occurredAtMs: 2000,
    reason: 'echo_not_disambiguated',
  });

  assert.ok(event);
  assert.deepEqual(event.metadata, {
    reason: 'echo_not_disambiguated',
  });
});
