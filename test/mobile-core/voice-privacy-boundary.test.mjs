import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const voiceInputPolicy = loadTypeScriptModule(
  'src/core/voice/voiceInputActivationPolicy.ts',
);
const providerModule = loadTypeScriptModule(
  'src/core/voice/voiceProviderContracts.ts',
);
const ttsRegistryModule = loadTypeScriptModule(
  'src/core/voice/ttsChunkRegistry.ts',
);
const speechModule = loadTypeScriptModule(
  'src/core/voice/streamingSpeech.ts',
);
const speechRegistryModule = loadTypeScriptModule(
  'src/core/voice/speechSegmentRegistry.ts',
);

const SESSION = 'voice_0123456789abcdef';
const UTTERANCE = 'utt_0123456789abcdef';
const SEGMENT = 'seg_0123456789abcdef';

function baseVoiceActivation(overrides = {}) {
  return {
    privacyState: 'active',
    runtimeAvailability: 'available',
    permission: 'granted',
    deviceTrust: 'trusted',
    activationMode: 'press_to_talk',
    explicitUserRequest: true,
    ...overrides,
  };
}

function baseSpeech(overrides = {}) {
  return {
    sessionId: SESSION,
    segmentId: SEGMENT,
    sequence: 0,
    kind: 'partial',
    text: 'شغّل الضوء',
    confidence: 0.95,
    stability: 0.9,
    languageTags: ['ar'],
    startedAtMs: 100,
    endedAtMs: null,
    ...overrides,
  };
}

test('explicit direct voice interaction remains possible without unlocking privacy lock', () => {
  for (const activationMode of [
    'press_to_talk',
    'open_voice_session',
    'headset_button',
  ]) {
    const decision = voiceInputPolicy.evaluateVoiceInputActivation(
      baseVoiceActivation({
        privacyState: 'privacy_lock',
        activationMode,
      }),
    );

    assert.equal(decision.allowed, true);
    assert.equal(decision.usage, 'direct_interaction');
    assert.equal(decision.changesPrivacyPolicy, false);
  }
});

test('direct voice interaction requires explicit request permission trust and runtime availability', () => {
  const cases = [
    [
      { explicitUserRequest: false },
      'explicit_user_request_required',
    ],
    [
      { permission: 'denied' },
      'permission_required',
    ],
    [
      { deviceTrust: 'untrusted' },
      'trusted_device_required',
    ],
    [
      { runtimeAvailability: 'unavailable' },
      'runtime_unavailable',
    ],
  ];

  for (const [overrides, reason] of cases) {
    const decision = voiceInputPolicy.evaluateVoiceInputActivation(
      baseVoiceActivation(overrides),
    );
    assert.equal(decision.allowed, false);
    assert.equal(decision.reason, reason);
  }
});

test('wake word and hands-free modes are passive and obey privacy lock', () => {
  for (const activationMode of ['wake_word', 'hands_free']) {
    const blocked = voiceInputPolicy.evaluateVoiceInputActivation(
      baseVoiceActivation({
        privacyState: 'privacy_lock',
        activationMode,
        explicitUserRequest: false,
      }),
    );
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.usage, 'passive_observation');
    assert.equal(blocked.reason, 'passive_observation_blocked');

    const allowed = voiceInputPolicy.evaluateVoiceInputActivation(
      baseVoiceActivation({
        privacyState: 'active',
        activationMode,
        explicitUserRequest: false,
      }),
    );
    assert.equal(allowed.allowed, true);
    assert.equal(allowed.usage, 'passive_observation');
  }
});

test('visual-off never blocks an otherwise authorized microphone', () => {
  const passiveMic = voiceInputPolicy.evaluateVoiceInputActivation(
    baseVoiceActivation({
      privacyState: 'visual_off',
      activationMode: 'wake_word',
      explicitUserRequest: false,
    }),
  );

  assert.equal(passiveMic.allowed, true);
  assert.equal(passiveMic.reason, 'allowed');
});

test('voice activation rejects malformed modes and hidden fields', () => {
  for (const value of [
    baseVoiceActivation({ activationMode: 'admin_listen' }),
    {
      ...baseVoiceActivation(),
      hiddenAuthority: true,
    },
    null,
  ]) {
    const decision = voiceInputPolicy.evaluateVoiceInputActivation(value);
    assert.equal(decision.allowed, false);
    assert.equal(decision.changesPrivacyPolicy, false);
  }
});

test('generationless first-generation TTS chunks normalize to generation zero only', () => {
  const legacy = providerModule.validateStreamingTtsChunkMetadata({
    sessionId: SESSION,
    utteranceId: UTTERANCE,
    sequence: 0,
    payloadRef: 'audio_local:chunk-001',
    isFinal: false,
  });

  assert.ok(legacy);
  assert.equal(legacy.generation, 0);

  for (const generation of [-1, 1.5, Number.NaN, '1']) {
    const invalid = providerModule.validateStreamingTtsChunkMetadata({
      sessionId: SESSION,
      generation,
      utteranceId: UTTERANCE,
      sequence: 0,
      payloadRef: 'audio_local:chunk-001',
      isFinal: false,
    });
    assert.equal(invalid, null);
  }
});

test('barge-in generation rejects old TTS chunks even when legacy adapter omitted generation', () => {
  const legacy = providerModule.validateStreamingTtsChunkMetadata({
    sessionId: SESSION,
    utteranceId: UTTERANCE,
    sequence: 0,
    payloadRef: 'audio_local:chunk-001',
    isFinal: false,
  });
  assert.ok(legacy);

  const registry = new ttsRegistryModule.TtsChunkRegistry(
    SESSION,
    1,
    UTTERANCE,
  );
  assert.equal(registry.apply(legacy).reason, 'wrong_generation');

  const current = providerModule.validateStreamingTtsChunkMetadata({
    sessionId: SESSION,
    generation: 1,
    utteranceId: UTTERANCE,
    sequence: 0,
    payloadRef: 'audio_local:chunk-002',
    isFinal: false,
  });
  assert.ok(current);
  assert.equal(registry.apply(current).accepted, true);
});

test('barge-in generation rejects old STT transcript events', () => {
  const legacyValidation = speechModule.validateStreamingSpeechSegment(
    baseSpeech(),
  );
  assert.equal(legacyValidation.accepted, true);
  assert.equal(legacyValidation.segment.generation, 0);

  const registry = new speechRegistryModule.SpeechSegmentRegistry(
    SESSION,
    1,
  );
  assert.equal(
    registry.apply(legacyValidation.segment).reason,
    'stale_generation',
  );

  const currentValidation = speechModule.validateStreamingSpeechSegment(
    baseSpeech({ generation: 1 }),
  );
  assert.equal(currentValidation.accepted, true);
  assert.equal(registry.apply(currentValidation.segment).accepted, true);
});
