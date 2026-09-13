import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const activity = loadTypeScriptModule(
  'src/core/voice/voiceActivityEvent.ts',
);
const registryModule = loadTypeScriptModule(
  'src/core/voice/voiceActivityRegistry.ts',
);

const SESSION = 'voice_0123456789abcdef';

function event(overrides = {}) {
  return {
    sessionId: SESSION,
    sequence: 0,
    atMs: 100,
    speechActive: false,
    confidence: 0.9,
    ...overrides,
  };
}

function accepted(overrides = {}) {
  const result = activity.validateVoiceActivityEvent(event(overrides));
  assert.equal(result.accepted, true);
  return result.event;
}

test('voice activity accepts bounded first-generation events without explicit generation', () => {
  const result = activity.validateVoiceActivityEvent(event());
  assert.equal(result.accepted, true);
  assert.equal(result.event.generation, 0);
});

test('voice activity rejects malformed timing confidence generation identity and hidden fields', () => {
  const invalid = [
    event({ sessionId: 'wrong' }),
    event({ generation: -1 }),
    event({ generation: 1.5 }),
    event({ sequence: -1 }),
    event({ atMs: Number.NaN }),
    event({ atMs: -1 }),
    event({ confidence: 1.1 }),
    event({ confidence: Number.NaN }),
    event({ speechActive: 'yes' }),
    { ...event(), rawAudio: 'forbidden' },
  ];

  for (const value of invalid) {
    assert.equal(
      activity.validateVoiceActivityEvent(value).accepted,
      false,
    );
  }
});

test('voice activity registry accepts monotonic events and exact duplicates only', () => {
  const registry = new registryModule.VoiceActivityRegistry(SESSION, 0);
  const first = accepted();
  assert.equal(registry.apply(first).accepted, true);

  assert.equal(registry.apply(first).idempotent, true);

  const second = accepted({
    sequence: 1,
    atMs: 180,
    speechActive: true,
  });
  assert.equal(registry.apply(second).accepted, true);
  assert.equal(registry.getLast().sequence, 1);
});

test('voice activity registry rejects stale conflicting and non-monotonic events', () => {
  const registry = new registryModule.VoiceActivityRegistry(SESSION, 0);
  assert.equal(registry.apply(accepted()).accepted, true);

  const conflict = accepted({
    speechActive: true,
  });
  assert.equal(registry.apply(conflict).reason, 'sequence_conflict');

  const next = accepted({
    sequence: 2,
    atMs: 250,
  });
  assert.equal(registry.apply(next).accepted, true);

  const stale = accepted({
    sequence: 1,
    atMs: 200,
  });
  assert.equal(registry.apply(stale).reason, 'stale_sequence');

  const backwardsTime = accepted({
    sequence: 3,
    atMs: 240,
  });
  assert.equal(
    registry.apply(backwardsTime).reason,
    'non_monotonic_time',
  );
});

test('generation boundary rejects VAD from before or after the current turn', () => {
  const registry = new registryModule.VoiceActivityRegistry(SESSION, 2);

  assert.equal(
    registry.apply(accepted({ generation: 1 })).reason,
    'stale_generation',
  );
  assert.equal(
    registry.apply(accepted({ generation: 3 })).reason,
    'future_generation',
  );
  assert.equal(
    registry.apply(accepted({ generation: 2 })).accepted,
    true,
  );
});
