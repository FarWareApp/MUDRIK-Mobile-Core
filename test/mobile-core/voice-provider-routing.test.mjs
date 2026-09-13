import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const routing = loadTypeScriptModule(
  'src/core/voice/voiceProviderRouting.ts',
);
const failover = loadTypeScriptModule(
  'src/core/voice/voiceProviderFailoverPolicy.ts',
);

function provider(overrides = {}) {
  return {
    providerRef: 'vp_primary01',
    service: 'stt',
    status: 'ready',
    supportsStreaming: true,
    languageTags: ['ar', 'de', 'en'],
    priority: 10,
    estimatedFirstResultMs: 180,
    ...overrides,
  };
}

test('voice routing prefers healthy streaming provider before degraded alternatives', () => {
  const selection = routing.selectVoiceProvider({
    service: 'stt',
    languageHints: ['ar', 'de'],
    candidates: [
      provider({
        providerRef: 'vp_degraded1',
        status: 'degraded',
        priority: 0,
        estimatedFirstResultMs: 50,
      }),
      provider({
        providerRef: 'vp_ready0001',
        status: 'ready',
        priority: 20,
        estimatedFirstResultMs: 300,
      }),
    ],
  });

  assert.equal(selection.reason, 'selected');
  assert.equal(selection.selected.providerRef, 'vp_ready0001');
});

test('voice routing ranks priority then evidenced latency deterministically', () => {
  const selection = routing.selectVoiceProvider({
    service: 'tts',
    languageHints: ['en'],
    candidates: [
      provider({
        providerRef: 'vp_slow00001',
        service: 'tts',
        priority: 5,
        estimatedFirstResultMs: 300,
      }),
      provider({
        providerRef: 'vp_fast00001',
        service: 'tts',
        priority: 5,
        estimatedFirstResultMs: 120,
      }),
      provider({
        providerRef: 'vp_priority1',
        service: 'tts',
        priority: 2,
        estimatedFirstResultMs: 900,
      }),
    ],
  });

  assert.equal(selection.selected.providerRef, 'vp_priority1');
});

test('multilingual descriptor can satisfy code-switched language hints', () => {
  const selection = routing.selectVoiceProvider({
    service: 'stt',
    languageHints: ['ar-SY', 'de-DE', 'en'],
    candidates: [
      provider({
        providerRef: 'vp_multi0001',
        languageTags: ['mul'],
      }),
    ],
  });

  assert.equal(selection.reason, 'selected');
  assert.equal(selection.selected.providerRef, 'vp_multi0001');
});

test('routing excludes unavailable non-streaming wrong-service and language-incompatible providers', () => {
  const selection = routing.selectVoiceProvider({
    service: 'stt',
    languageHints: ['ar', 'de'],
    candidates: [
      provider({ providerRef: 'vp_unavail01', status: 'unavailable' }),
      provider({ providerRef: 'vp_batch0001', supportsStreaming: false }),
      provider({ providerRef: 'vp_wrong0001', service: 'tts' }),
      provider({ providerRef: 'vp_lang00001', languageTags: ['en'] }),
    ],
  });

  assert.equal(selection.selected, null);
  assert.equal(selection.reason, 'no_eligible_provider');
});

test('routing rejects duplicate refs hidden fields and malformed descriptors', () => {
  const invalidInputs = [
    {
      service: 'stt',
      languageHints: ['ar'],
      candidates: [
        provider(),
        provider(),
      ],
    },
    {
      service: 'stt',
      languageHints: ['ar'],
      candidates: [
        { ...provider(), apiKey: 'forbidden' },
      ],
    },
    {
      service: 'stt',
      languageHints: ['ar'],
      candidates: [
        provider({ priority: -1 }),
      ],
    },
  ];

  for (const input of invalidInputs) {
    assert.equal(
      routing.selectVoiceProvider(input).reason,
      'invalid_input',
    );
  }
});

test('provider failover before output does not require generation rotation', () => {
  const selected = failover.evaluateVoiceProviderFailover({
    service: 'tts',
    currentProviderRef: 'vp_primary01',
    nextProviderRef: 'vp_backup001',
    attemptPhase: 'selected',
    bufferedInputReplayAvailable: false,
    explicitRestart: false,
    generationWillRotate: false,
  });
  assert.equal(selected.allowed, true);
  assert.equal(selected.requiresGenerationRotation, false);

  const startedTts = failover.evaluateVoiceProviderFailover({
    service: 'tts',
    currentProviderRef: 'vp_primary01',
    nextProviderRef: 'vp_backup001',
    attemptPhase: 'started',
    bufferedInputReplayAvailable: false,
    explicitRestart: false,
    generationWillRotate: false,
  });
  assert.equal(startedTts.allowed, true);
});

test('started STT failover requires replayable buffered input', () => {
  const denied = failover.evaluateVoiceProviderFailover({
    service: 'stt',
    currentProviderRef: 'vp_primary01',
    nextProviderRef: 'vp_backup001',
    attemptPhase: 'started',
    bufferedInputReplayAvailable: false,
    explicitRestart: false,
    generationWillRotate: false,
  });
  assert.equal(denied.allowed, false);
  assert.equal(denied.reason, 'input_replay_required');

  const allowed = failover.evaluateVoiceProviderFailover({
    service: 'stt',
    currentProviderRef: 'vp_primary01',
    nextProviderRef: 'vp_backup001',
    attemptPhase: 'started',
    bufferedInputReplayAvailable: true,
    explicitRestart: false,
    generationWillRotate: false,
  });
  assert.equal(allowed.allowed, true);
});

test('provider output can never be mixed across failover in the same generation', () => {
  const noRestart = failover.evaluateVoiceProviderFailover({
    service: 'tts',
    currentProviderRef: 'vp_primary01',
    nextProviderRef: 'vp_backup001',
    attemptPhase: 'output_observed',
    bufferedInputReplayAvailable: false,
    explicitRestart: false,
    generationWillRotate: false,
  });
  assert.equal(noRestart.allowed, false);
  assert.equal(noRestart.reason, 'explicit_restart_required');
  assert.equal(noRestart.requiresGenerationRotation, true);

  const sameGeneration = failover.evaluateVoiceProviderFailover({
    service: 'tts',
    currentProviderRef: 'vp_primary01',
    nextProviderRef: 'vp_backup001',
    attemptPhase: 'output_observed',
    bufferedInputReplayAvailable: false,
    explicitRestart: true,
    generationWillRotate: false,
  });
  assert.equal(sameGeneration.allowed, false);
  assert.equal(sameGeneration.reason, 'output_mixing_forbidden');

  const rotated = failover.evaluateVoiceProviderFailover({
    service: 'tts',
    currentProviderRef: 'vp_primary01',
    nextProviderRef: 'vp_backup001',
    attemptPhase: 'output_observed',
    bufferedInputReplayAvailable: false,
    explicitRestart: true,
    generationWillRotate: true,
  });
  assert.equal(rotated.allowed, true);
  assert.equal(rotated.reason, 'allowed_with_generation_rotation');
});

test('failover rejects same provider closed attempt and hostile fields', () => {
  const same = failover.evaluateVoiceProviderFailover({
    service: 'tts',
    currentProviderRef: 'vp_primary01',
    nextProviderRef: 'vp_primary01',
    attemptPhase: 'selected',
    bufferedInputReplayAvailable: false,
    explicitRestart: false,
    generationWillRotate: false,
  });
  assert.equal(same.reason, 'same_provider');

  const closed = failover.evaluateVoiceProviderFailover({
    service: 'tts',
    currentProviderRef: 'vp_primary01',
    nextProviderRef: 'vp_backup001',
    attemptPhase: 'closed',
    bufferedInputReplayAvailable: false,
    explicitRestart: true,
    generationWillRotate: true,
  });
  assert.equal(closed.reason, 'attempt_closed');

  const hostile = failover.evaluateVoiceProviderFailover({
    service: 'tts',
    currentProviderRef: 'vp_primary01',
    nextProviderRef: 'vp_backup001',
    attemptPhase: 'selected',
    bufferedInputReplayAvailable: false,
    explicitRestart: false,
    generationWillRotate: false,
    providerToken: 'forbidden',
  });
  assert.equal(hostile.reason, 'invalid_input');
});
