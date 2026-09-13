import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const lifecycleModule = loadTypeScriptModule(
  'src/core/voice/TtsStreamLifecycle.ts',
);

const SESSION = 'voice_0123456789abcdef';
const UTTERANCE = 'utt_0123456789abcdef';

function chunk(overrides = {}) {
  return {
    sessionId: SESSION,
    generation: 0,
    utteranceId: UTTERANCE,
    sequence: 0,
    payloadRef: 'audio_local:chunk-001',
    isFinal: false,
    ...overrides,
  };
}

test('TTS lifecycle separates first chunk receipt playback start and playback completion', () => {
  const lifecycle = new lifecycleModule.TtsStreamLifecycle(
    SESSION,
    0,
    UTTERANCE,
  );

  assert.equal(
    lifecycle.confirmPlaybackStarted().reason,
    'first_audio_required',
  );

  const first = lifecycle.acceptChunk(chunk());
  assert.equal(first.accepted, true);
  assert.equal(first.state.phase, 'streaming');
  assert.equal(first.state.playbackStarted, false);

  const started = lifecycle.confirmPlaybackStarted();
  assert.equal(started.accepted, true);
  assert.equal(started.state.phase, 'playback_started');

  const prematureComplete = lifecycle.confirmPlaybackComplete();
  assert.equal(prematureComplete.accepted, false);
  assert.equal(prematureComplete.reason, 'final_chunk_required');

  const final = lifecycle.acceptChunk(
    chunk({
      sequence: 1,
      payloadRef: 'audio_local:chunk-002',
      isFinal: true,
    }),
  );
  assert.equal(final.accepted, true);
  assert.equal(final.state.phase, 'stream_received');

  const completed = lifecycle.confirmPlaybackComplete();
  assert.equal(completed.accepted, true);
  assert.equal(completed.state.phase, 'playback_complete');
});

test('single final TTS chunk still requires explicit playback-start evidence', () => {
  const lifecycle = new lifecycleModule.TtsStreamLifecycle(
    SESSION,
    0,
    UTTERANCE,
  );

  const final = lifecycle.acceptChunk(
    chunk({ isFinal: true }),
  );
  assert.equal(final.state.phase, 'stream_received');
  assert.equal(final.state.playbackStarted, false);

  assert.equal(
    lifecycle.confirmPlaybackComplete().reason,
    'first_audio_required',
  );

  lifecycle.confirmPlaybackStarted();
  assert.equal(
    lifecycle.confirmPlaybackComplete().state.phase,
    'playback_complete',
  );
});

test('TTS lifecycle rejects stale generation wrong utterance and conflicting chunks', () => {
  const lifecycle = new lifecycleModule.TtsStreamLifecycle(
    SESSION,
    2,
    UTTERANCE,
  );

  const stale = lifecycle.acceptChunk(
    chunk({ generation: 1 }),
  );
  assert.equal(stale.accepted, false);
  assert.equal(stale.chunkDecision.reason, 'wrong_generation');

  const wrongUtterance = lifecycle.acceptChunk(
    chunk({
      generation: 2,
      utteranceId: 'utt_fedcba9876543210',
    }),
  );
  assert.equal(wrongUtterance.accepted, false);
  assert.equal(wrongUtterance.chunkDecision.reason, 'wrong_utterance');

  const good = lifecycle.acceptChunk(
    chunk({ generation: 2 }),
  );
  assert.equal(good.accepted, true);

  const conflict = lifecycle.acceptChunk(
    chunk({
      generation: 2,
      payloadRef: 'audio_local:changed-001',
    }),
  );
  assert.equal(conflict.accepted, false);
  assert.equal(conflict.chunkDecision.reason, 'sequence_conflict');
});

test('TTS cancellation closes lifecycle against late network chunks', () => {
  const lifecycle = new lifecycleModule.TtsStreamLifecycle(
    SESSION,
    0,
    UTTERANCE,
  );

  lifecycle.acceptChunk(chunk());
  lifecycle.confirmPlaybackStarted();
  assert.equal(lifecycle.cancel().accepted, true);
  assert.equal(lifecycle.cancel().reason, 'idempotent');

  const late = lifecycle.acceptChunk(
    chunk({
      sequence: 1,
      payloadRef: 'audio_local:chunk-002',
      isFinal: true,
    }),
  );
  assert.equal(late.accepted, false);
  assert.equal(late.reason, 'lifecycle_closed');
});

test('TTS lifecycle validates stream identity at construction', () => {
  assert.throws(
    () => new lifecycleModule.TtsStreamLifecycle('bad', 0, UTTERANCE),
    /Invalid TTS stream identity/,
  );
  assert.throws(
    () => new lifecycleModule.TtsStreamLifecycle(SESSION, -1, UTTERANCE),
    /Invalid TTS stream identity/,
  );
  assert.throws(
    () => new lifecycleModule.TtsStreamLifecycle(SESSION, 0, 'bad'),
    /Invalid TTS stream identity/,
  );
});
