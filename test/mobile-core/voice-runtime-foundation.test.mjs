import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const speech = loadTypeScriptModule(
  'src/core/voice/streamingSpeech.ts',
);
const registryModule = loadTypeScriptModule(
  'src/core/voice/speechSegmentRegistry.ts',
);
const sessionModule = loadTypeScriptModule(
  'src/core/voice/voiceSessionState.ts',
);
const laneModule = loadTypeScriptModule(
  'src/core/voice/voiceLanePolicy.ts',
);
const endTurnModule = loadTypeScriptModule(
  'src/core/voice/endOfTurnPolicy.ts',
);
const latencyModule = loadTypeScriptModule(
  'src/core/voice/voiceLatencyTrace.ts',
);
const providerModule = loadTypeScriptModule(
  'src/core/voice/voiceProviderContracts.ts',
);

const SESSION = 'voice_0123456789abcdef';
const OTHER_SESSION = 'voice_fedcba9876543210';
const SEGMENT = 'seg_0123456789abcdef';

function segment(overrides = {}) {
  return {
    sessionId: SESSION,
    segmentId: SEGMENT,
    sequence: 0,
    kind: 'partial',
    text: 'شغل الضوء',
    confidence: 0.96,
    stability: 0.9,
    languageTags: ['ar', 'de'],
    startedAtMs: 100,
    endedAtMs: null,
    ...overrides,
  };
}

function acceptedSegment(overrides = {}) {
  const result = speech.validateStreamingSpeechSegment(
    segment(overrides),
  );
  assert.equal(result.accepted, true);
  return result.segment;
}

test('streaming STT accepts bounded multilingual partial and final segments', () => {
  const partial = speech.validateStreamingSpeechSegment(segment());
  assert.equal(partial.accepted, true);
  assert.equal(speech.isExecutableSpeechSegment(partial.segment), false);
  assert.deepEqual(partial.segment.languageTags, ['ar', 'de']);

  const final = speech.validateStreamingSpeechSegment(
    segment({
      sequence: 1,
      kind: 'final',
      endedAtMs: 900,
      text: 'شغّل الضوء في Küche',
    }),
  );
  assert.equal(final.accepted, true);
  assert.equal(speech.isExecutableSpeechSegment(final.segment), true);
});

test('partial transcript can never masquerade as finalized executable speech', () => {
  const badPartial = speech.validateStreamingSpeechSegment(
    segment({ endedAtMs: 500 }),
  );
  assert.equal(badPartial.accepted, false);
  assert.equal(badPartial.reason, 'invalid_timing');

  const badFinal = speech.validateStreamingSpeechSegment(
    segment({ kind: 'final', endedAtMs: null }),
  );
  assert.equal(badFinal.accepted, false);
  assert.equal(badFinal.reason, 'invalid_timing');
});

test('streaming speech rejects malformed confidence sequence identity and hidden fields', () => {
  const invalid = [
    segment({ confidence: Number.NaN }),
    segment({ confidence: 1.1 }),
    segment({ stability: -0.1 }),
    segment({ sequence: -1 }),
    segment({ sessionId: 'wrong' }),
    segment({ text: '   ' }),
    { ...segment(), hiddenAuthority: true },
  ];

  for (const value of invalid) {
    assert.equal(
      speech.validateStreamingSpeechSegment(value).accepted,
      false,
    );
  }
});

test('speech registry rejects wrong-session stale conflict and post-final replay', () => {
  const registry = new registryModule.SpeechSegmentRegistry(SESSION);
  const first = acceptedSegment();
  assert.equal(registry.apply(first).accepted, true);

  const duplicate = acceptedSegment();
  assert.equal(registry.apply(duplicate).idempotent, true);

  const conflict = acceptedSegment({ text: 'different text' });
  assert.equal(registry.apply(conflict).reason, 'sequence_conflict');

  const next = acceptedSegment({ sequence: 1, text: 'شغل الضوء الآن' });
  assert.equal(registry.apply(next).accepted, true);

  const stale = acceptedSegment({ sequence: 0 });
  assert.equal(registry.apply(stale).reason, 'stale_sequence');

  const final = acceptedSegment({
    sequence: 2,
    kind: 'final',
    endedAtMs: 800,
  });
  assert.equal(registry.apply(final).accepted, true);
  assert.equal(registry.getFinal(SEGMENT).kind, 'final');

  const afterFinal = acceptedSegment({
    sequence: 3,
    kind: 'final',
    endedAtMs: 900,
  });
  assert.equal(registry.apply(afterFinal).reason, 'already_finalized');

  const wrongSession = acceptedSegment({
    sessionId: OTHER_SESSION,
    segmentId: 'seg_fedcba9876543210',
  });
  assert.equal(registry.apply(wrongSession).reason, 'wrong_session');
});

test('voice session follows listening speech finalization processing and TTS lifecycle', () => {
  let state = sessionModule.INITIAL_VOICE_SESSION_STATE;

  const apply = (event) => {
    const transition = sessionModule.transitionVoiceSession({ state, event });
    assert.equal(transition.accepted, true);
    state = transition.next;
    return transition;
  };

  assert.deepEqual(apply('start').actions, ['start_input']);
  assert.equal(state.phase, 'listening');
  apply('speech_start');
  assert.equal(state.phase, 'user_speaking');
  assert.deepEqual(apply('speech_end').actions, ['finalize_input']);
  assert.equal(state.phase, 'finalizing');
  apply('transcript_final');
  assert.equal(state.phase, 'processing');
  apply('response_ready');
  assert.equal(state.phase, 'processing');
  apply('tts_start');
  assert.equal(state.phase, 'assistant_speaking');
  assert.deepEqual(apply('response_complete').actions, ['start_input']);
  assert.equal(state.phase, 'listening');
});

test('barge-in stops TTS before returning to listening and increments generation', () => {
  const speaking = {
    phase: 'assistant_speaking',
    generation: 3,
    cancellationTarget: null,
  };

  const interrupted = sessionModule.transitionVoiceSession({
    state: speaking,
    event: 'barge_in',
  });
  assert.equal(interrupted.accepted, true);
  assert.equal(interrupted.next.phase, 'cancelling');
  assert.equal(interrupted.next.cancellationTarget, 'listening');
  assert.deepEqual(interrupted.actions, [
    'stop_tts',
    'discard_pending_response',
  ]);

  const resumed = sessionModule.transitionVoiceSession({
    state: interrupted.next,
    event: 'cancel_complete',
  });
  assert.equal(resumed.next.phase, 'listening');
  assert.equal(resumed.next.generation, 4);
  assert.deepEqual(resumed.actions, ['start_input']);
});

test('voice cancellation is idempotent and invalid transitions are rejected', () => {
  const listening = {
    phase: 'listening',
    generation: 0,
    cancellationTarget: null,
  };

  const cancelling = sessionModule.transitionVoiceSession({
    state: listening,
    event: 'cancel',
  });
  assert.equal(cancelling.next.phase, 'cancelling');
  assert.equal(cancelling.next.cancellationTarget, 'ended');

  const duplicate = sessionModule.transitionVoiceSession({
    state: cancelling.next,
    event: 'cancel',
  });
  assert.equal(duplicate.reason, 'idempotent');

  const invalid = sessionModule.transitionVoiceSession({
    state: listening,
    event: 'tts_start',
  });
  assert.equal(invalid.accepted, false);
});

test('malformed voice session state fails without widening runtime state', () => {
  for (const state of [
    null,
    { phase: 'admin', generation: 0, cancellationTarget: null },
    { phase: 'listening', generation: -1, cancellationTarget: null },
    { phase: 'listening', generation: 0, cancellationTarget: 'ended' },
    {
      phase: 'listening',
      generation: 0,
      cancellationTarget: null,
      hiddenAuthority: true,
    },
  ]) {
    const result = sessionModule.transitionVoiceSession({
      state,
      event: 'start',
    });
    assert.equal(result.accepted, false);
    assert.equal(result.next.phase, 'idle');
  }
});

test('clear low and medium risk speech may be an instant candidate but never self-authorizes', () => {
  for (const capabilityRisk of ['low', 'medium']) {
    const decision = laneModule.chooseVoiceLane({
      transcriptFinal: true,
      intentConfidence: 0.97,
      ambiguous: false,
      targetResolved: true,
      hasActionCandidate: true,
      capabilityRisk,
    });

    assert.equal(decision.lane, 'instant_candidate');
    assert.equal(decision.mayExecuteDirectly, false);
  }
});

test('voice lane escalates partial ambiguous unresolved low-confidence and high-risk input', () => {
  assert.equal(
    laneModule.chooseVoiceLane({
      transcriptFinal: false,
      intentConfidence: 0.99,
      ambiguous: false,
      targetResolved: true,
      hasActionCandidate: true,
      capabilityRisk: 'low',
    }).lane,
    'reasoning',
  );

  assert.equal(
    laneModule.chooseVoiceLane({
      transcriptFinal: true,
      intentConfidence: 0.99,
      ambiguous: true,
      targetResolved: true,
      hasActionCandidate: true,
      capabilityRisk: 'low',
    }).lane,
    'clarify',
  );

  assert.equal(
    laneModule.chooseVoiceLane({
      transcriptFinal: true,
      intentConfidence: 0.99,
      ambiguous: false,
      targetResolved: false,
      hasActionCandidate: true,
      capabilityRisk: 'low',
    }).lane,
    'clarify',
  );

  assert.equal(
    laneModule.chooseVoiceLane({
      transcriptFinal: true,
      intentConfidence: 0.4,
      ambiguous: false,
      targetResolved: true,
      hasActionCandidate: true,
      capabilityRisk: 'low',
    }).lane,
    'clarify',
  );

  for (const capabilityRisk of ['high', 'critical']) {
    const decision = laneModule.chooseVoiceLane({
      transcriptFinal: true,
      intentConfidence: 1,
      ambiguous: false,
      targetResolved: true,
      hasActionCandidate: true,
      capabilityRisk,
    });
    assert.equal(decision.lane, 'reasoning');
    assert.equal(decision.mayExecuteDirectly, false);
  }
});

test('malformed lane input is rejected instead of guessed', () => {
  const malformed = laneModule.chooseVoiceLane({
    transcriptFinal: true,
    intentConfidence: Number.NaN,
    ambiguous: false,
    targetResolved: true,
    hasActionCandidate: true,
    capabilityRisk: 'low',
  });
  assert.equal(malformed.lane, 'reject');
  assert.equal(malformed.reason, 'invalid_input');
});

test('end-of-turn waits through speech and short noise then finalizes only after bounded silence', () => {
  const base = {
    vadSpeechActive: false,
    speechDurationMs: 1200,
    silenceDurationMs: 700,
    segmentAgeMs: 2000,
    hasLexicalContent: true,
    hypothesisStability: 0.9,
  };

  assert.equal(
    endTurnModule.decideEndOfTurn({
      ...base,
      vadSpeechActive: true,
    }).reason,
    'speech_active',
  );

  assert.equal(
    endTurnModule.decideEndOfTurn({
      ...base,
      speechDurationMs: 80,
    }).reason,
    'insufficient_speech',
  );

  assert.equal(
    endTurnModule.decideEndOfTurn(base).decision,
    'finalize',
  );

  assert.equal(
    endTurnModule.decideEndOfTurn({
      ...base,
      hypothesisStability: 0.4,
      silenceDurationMs: 700,
    }).decision,
    'wait',
  );

  assert.equal(
    endTurnModule.decideEndOfTurn({
      ...base,
      hypothesisStability: 0.4,
      silenceDurationMs: 1200,
    }).decision,
    'finalize',
  );
});

test('end-of-turn has hard bounded maximums and malformed timing never finalizes', () => {
  const forced = endTurnModule.decideEndOfTurn({
    vadSpeechActive: true,
    speechDurationMs: 60_000,
    silenceDurationMs: 0,
    segmentAgeMs: 60_000,
    hasLexicalContent: true,
    hypothesisStability: 0.9,
  });
  assert.equal(forced.decision, 'force_finalize');

  const malformed = endTurnModule.decideEndOfTurn({
    vadSpeechActive: false,
    speechDurationMs: Number.NaN,
    silenceDurationMs: 9999,
    segmentAgeMs: 9999,
    hasLexicalContent: true,
    hypothesisStability: 1,
  });
  assert.equal(malformed.decision, 'wait');
  assert.equal(malformed.reason, 'invalid_input');
});

test('latency trace accepts monotonic points and computes only evidenced durations', () => {
  const trace = latencyModule.buildVoiceLatencyTrace([
    { milestone: 'session_started', atMs: 100 },
    { milestone: 'speech_started', atMs: 200 },
    { milestone: 'speech_ended', atMs: 600 },
    { milestone: 'stt_final', atMs: 720 },
    { milestone: 'lane_decided', atMs: 740 },
    { milestone: 'tts_first_audio', atMs: 900 },
  ]);

  assert.ok(trace);
  assert.equal(trace.durationMs, 800);
  assert.equal(
    latencyModule.latencyBetween(
      trace,
      'speech_ended',
      'tts_first_audio',
    ),
    300,
  );
  assert.equal(
    latencyModule.latencyBetween(
      trace,
      'execution_started',
      'execution_completed',
    ),
    null,
  );
});

test('latency trace rejects duplicate non-monotonic and malformed timestamps', () => {
  for (const points of [
    [
      { milestone: 'session_started', atMs: 100 },
      { milestone: 'speech_started', atMs: 99 },
    ],
    [
      { milestone: 'session_started', atMs: 100 },
      { milestone: 'session_started', atMs: 200 },
    ],
    [
      { milestone: 'session_started', atMs: 100 },
      { milestone: 'speech_started', atMs: Number.NaN },
    ],
  ]) {
    assert.equal(latencyModule.buildVoiceLatencyTrace(points), null);
  }
});

test('TTS chunk metadata is runtime validated and rejects hidden provider fields', () => {
  const good = providerModule.validateStreamingTtsChunkMetadata({
    sessionId: SESSION,
    utteranceId: 'utt_0123456789abcdef',
    sequence: 0,
    payloadRef: 'audio_local:chunk-001',
    isFinal: false,
  });
  assert.ok(good);

  for (const value of [
    {
      sessionId: SESSION,
      utteranceId: 'utt_0123456789abcdef',
      sequence: -1,
      payloadRef: 'audio_local:chunk-001',
      isFinal: false,
    },
    {
      sessionId: SESSION,
      utteranceId: 'utt_0123456789abcdef',
      sequence: 0,
      payloadRef: 'bad',
      isFinal: false,
    },
    {
      sessionId: SESSION,
      utteranceId: 'utt_0123456789abcdef',
      sequence: 0,
      payloadRef: 'audio_local:chunk-001',
      isFinal: false,
      rawSecret: 'not allowed',
    },
  ]) {
    assert.equal(
      providerModule.validateStreamingTtsChunkMetadata(value),
      null,
    );
  }
});

test('voice provider failures normalize hostile payloads to safe unknown state', () => {
  const timeout = providerModule.normalizeVoiceProviderFailure({
    code: 'timeout',
    retryable: true,
    providerSafeMessage: 'temporary timeout',
  });
  assert.equal(timeout.code, 'timeout');
  assert.equal(timeout.retryable, true);

  const hostile = providerModule.normalizeVoiceProviderFailure({
    code: 'timeout',
    retryable: true,
    providerSafeMessage: 'x',
    providerToken: 'secret',
  });
  assert.deepEqual(hostile, {
    code: 'unknown',
    retryable: false,
    providerSafeMessage: null,
  });
});
