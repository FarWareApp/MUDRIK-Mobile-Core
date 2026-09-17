import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const activity = loadTypeScriptModule(
  'src/core/voice/voiceActivityEvent.ts',
);
const speech = loadTypeScriptModule(
  'src/core/voice/streamingSpeech.ts',
);
const latency = loadTypeScriptModule(
  'src/core/voice/voiceLatencyTrace.ts',
);

const SESSION = 'voice_0123456789abcdef';
const SEGMENT = 'seg_0123456789abcdef';
const OVERSIZED_TIME = Number.MAX_SAFE_INTEGER + 1;

test('voice activity rejects finite timestamps outside safe integer bounds', () => {
  const result = activity.validateVoiceActivityEvent({
    sessionId: SESSION,
    generation: 0,
    sequence: 0,
    atMs: OVERSIZED_TIME,
    speechActive: true,
    confidence: 0.9,
  });

  assert.equal(result.accepted, false);
  assert.equal(result.reason, 'invalid_timing');
});

test('streaming speech rejects oversized finite start and end timestamps', () => {
  const partial = speech.validateStreamingSpeechSegment({
    sessionId: SESSION,
    generation: 0,
    segmentId: SEGMENT,
    sequence: 0,
    kind: 'partial',
    text: 'hello',
    confidence: 0.9,
    stability: 0.9,
    languageTags: ['en'],
    startedAtMs: OVERSIZED_TIME,
    endedAtMs: null,
  });
  assert.equal(partial.accepted, false);
  assert.equal(partial.reason, 'invalid_timing');

  const final = speech.validateStreamingSpeechSegment({
    sessionId: SESSION,
    generation: 0,
    segmentId: SEGMENT,
    sequence: 1,
    kind: 'final',
    text: 'hello',
    confidence: 0.9,
    stability: 0.9,
    languageTags: ['en'],
    startedAtMs: 100,
    endedAtMs: OVERSIZED_TIME,
  });
  assert.equal(final.accepted, false);
  assert.equal(final.reason, 'invalid_timing');
});

test('latency trace rejects oversized finite timestamps before they can poison ordering', () => {
  const trace = latency.buildVoiceLatencyTrace([
    { milestone: 'session_started', atMs: 100 },
    { milestone: 'speech_started', atMs: OVERSIZED_TIME },
  ]);

  assert.equal(trace, null);
});
