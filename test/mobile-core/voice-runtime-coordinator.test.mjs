import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const coordinatorModule = loadTypeScriptModule(
  'src/core/voice/VoiceRuntimeCoordinator.ts',
);
const sessionModule = loadTypeScriptModule(
  'src/core/voice/voiceSessionState.ts',
);

const SESSION = 'voice_0123456789abcdef';
const SEGMENT = 'seg_0123456789abcdef';

function activity(overrides = {}) {
  return {
    sessionId: SESSION,
    sequence: 0,
    atMs: 100,
    speechActive: false,
    confidence: 0.95,
    ...overrides,
  };
}

function finalTranscript(overrides = {}) {
  return {
    sessionId: SESSION,
    segmentId: SEGMENT,
    sequence: 0,
    kind: 'final',
    text: 'شغّل الضوء',
    confidence: 0.97,
    stability: 0.96,
    languageTags: ['ar'],
    startedAtMs: 100,
    endedAtMs: 900,
    ...overrides,
  };
}

function bargeEvidence(overrides = {}) {
  return {
    inputAuthorized: true,
    speechActive: true,
    speechDurationMs: 280,
    vadConfidence: 0.95,
    echoState: 'clear',
    hasLexicalEvidence: true,
    hypothesisStability: 0.92,
    ...overrides,
  };
}

const finalizeMetrics = {
  vadSpeechActive: false,
  speechDurationMs: 800,
  silenceDurationMs: 800,
  segmentAgeMs: 1600,
  hasLexicalContent: true,
  hypothesisStability: 0.95,
};

test('coordinator drives validated VAD through listening speaking and finalizing', () => {
  const coordinator = new coordinatorModule.VoiceRuntimeCoordinator(SESSION);
  assert.equal(coordinator.start().state.phase, 'listening');

  const speechStart = coordinator.onActivity(
    activity({ speechActive: true }),
    finalizeMetrics,
  );
  assert.equal(speechStart.accepted, true);
  assert.equal(speechStart.state.phase, 'user_speaking');

  const earlySilence = coordinator.onActivity(
    activity({
      sequence: 1,
      atMs: 300,
      speechActive: false,
    }),
    {
      ...finalizeMetrics,
      speechDurationMs: 100,
      silenceDurationMs: 100,
    },
  );
  assert.equal(earlySilence.accepted, true);
  assert.equal(earlySilence.reason, 'waiting');
  assert.equal(earlySilence.state.phase, 'user_speaking');

  const finalized = coordinator.onActivity(
    activity({
      sequence: 2,
      atMs: 900,
      speechActive: false,
    }),
    finalizeMetrics,
  );
  assert.equal(finalized.accepted, true);
  assert.equal(finalized.state.phase, 'finalizing');
  assert.deepEqual(finalized.actions, ['finalize_input']);
});

test('coordinator never executes partial transcript and accepts current final only in finalizing', () => {
  const coordinator = new coordinatorModule.VoiceRuntimeCoordinator(SESSION);
  coordinator.start();
  coordinator.onActivity(
    activity({ speechActive: true }),
    finalizeMetrics,
  );
  coordinator.onActivity(
    activity({ sequence: 1, atMs: 900, speechActive: false }),
    finalizeMetrics,
  );

  const partial = coordinator.onTranscript({
    ...finalTranscript(),
    kind: 'partial',
    endedAtMs: null,
  });
  assert.equal(partial.accepted, false);
  assert.equal(partial.reason, 'partial_not_executable');
  assert.equal(partial.state.phase, 'finalizing');

  const final = coordinator.onTranscript(finalTranscript());
  assert.equal(final.accepted, true);
  assert.equal(final.state.phase, 'processing');

  const secondFinal = coordinator.onTranscript({
    ...finalTranscript(),
    segmentId: 'seg_fedcba9876543210',
    sequence: 1,
  });
  assert.equal(secondFinal.accepted, false);
  assert.equal(secondFinal.reason, 'wrong_phase');
  assert.equal(secondFinal.state.phase, 'processing');
  assert.equal(secondFinal.speechDecision, null);
});

test('wrong-phase final transcript cannot poison the speech registry', () => {
  const coordinator = new coordinatorModule.VoiceRuntimeCoordinator(SESSION);
  coordinator.start();

  const premature = coordinator.onTranscript(finalTranscript());
  assert.equal(premature.accepted, false);
  assert.equal(premature.reason, 'wrong_phase');
  assert.equal(premature.speechDecision, null);
  assert.equal(premature.state.phase, 'listening');

  coordinator.onActivity(
    activity({ speechActive: true }),
    finalizeMetrics,
  );
  coordinator.onActivity(
    activity({ sequence: 1, atMs: 900, speechActive: false }),
    finalizeMetrics,
  );

  const corrected = coordinator.onTranscript(
    finalTranscript({ text: 'شغّل الضوء الآن' }),
  );
  assert.equal(corrected.accepted, true);
  assert.equal(corrected.reason, 'applied');
  assert.equal(corrected.state.phase, 'processing');
  assert.equal(corrected.speechDecision.reason, 'accepted');
});

test('coordinator rejects unqualified barge-in without changing TTS state', () => {
  const coordinator = new coordinatorModule.VoiceRuntimeCoordinator(SESSION);
  coordinator.start();
  coordinator.onActivity(
    activity({ speechActive: true }),
    finalizeMetrics,
  );
  coordinator.onActivity(
    activity({ sequence: 1, atMs: 900, speechActive: false }),
    finalizeMetrics,
  );
  coordinator.onTranscript(finalTranscript());
  coordinator.markResponseReady();
  coordinator.markTtsStarted();

  const echo = coordinator.bargeIn(
    bargeEvidence({
      echoState: 'possible_echo',
      hasLexicalEvidence: false,
    }),
  );
  assert.equal(echo.accepted, false);
  assert.equal(echo.reason, 'barge_in_rejected');
  assert.equal(echo.bargeInDecisionReason, 'echo_not_disambiguated');
  assert.equal(echo.state.phase, 'assistant_speaking');
  assert.deepEqual(echo.actions, ['none']);
});

test('barge-in invalidates old generation before listening resumes', () => {
  const coordinator = new coordinatorModule.VoiceRuntimeCoordinator(SESSION);
  coordinator.start();
  coordinator.onActivity(
    activity({ speechActive: true }),
    finalizeMetrics,
  );
  coordinator.onActivity(
    activity({ sequence: 1, atMs: 900, speechActive: false }),
    finalizeMetrics,
  );
  coordinator.onTranscript(finalTranscript());
  coordinator.markResponseReady();
  assert.equal(coordinator.markTtsStarted().state.phase, 'assistant_speaking');

  const barge = coordinator.bargeIn(bargeEvidence());
  assert.equal(barge.accepted, true);
  assert.equal(barge.bargeInDecisionReason, 'interrupt');
  assert.equal(barge.state.phase, 'cancelling');
  assert.deepEqual(barge.actions, [
    'stop_tts',
    'discard_pending_response',
  ]);

  const resumed = coordinator.completeCancellation();
  assert.equal(resumed.state.phase, 'listening');
  assert.equal(resumed.state.generation, 1);

  const staleVad = coordinator.onActivity(
    activity({
      generation: 0,
      sequence: 9,
      atMs: 2000,
      speechActive: true,
    }),
    finalizeMetrics,
  );
  assert.equal(staleVad.accepted, false);
  assert.equal(staleVad.reason, 'activity_rejected');
  assert.equal(staleVad.activityDecision.reason, 'stale_generation');

  const currentVad = coordinator.onActivity(
    activity({
      generation: 1,
      sequence: 0,
      atMs: 2100,
      speechActive: true,
    }),
    finalizeMetrics,
  );
  assert.equal(currentVad.accepted, true);
  assert.equal(currentVad.state.phase, 'user_speaking');
});

test('barge-in cannot be forged outside assistant speaking phase', () => {
  const coordinator = new coordinatorModule.VoiceRuntimeCoordinator(SESSION);
  coordinator.start();

  const forged = coordinator.bargeIn(bargeEvidence());
  assert.equal(forged.accepted, false);
  assert.equal(forged.reason, 'barge_in_rejected');
  assert.equal(forged.bargeInDecisionReason, 'assistant_not_speaking');
  assert.equal(forged.state.phase, 'listening');
});

test('reset increments generation so generation-zero events can never revive', () => {
  const state = {
    phase: 'processing',
    generation: 3,
    cancellationTarget: null,
  };

  const reset = sessionModule.transitionVoiceSession({
    state,
    event: 'reset',
  });
  assert.equal(reset.accepted, true);
  assert.equal(reset.next.phase, 'idle');
  assert.equal(reset.next.generation, 4);
});

test('coordinator reset rotates generation and rejects pre-reset events', () => {
  const coordinator = new coordinatorModule.VoiceRuntimeCoordinator(SESSION);
  coordinator.start();

  const reset = coordinator.reset();
  assert.equal(reset.accepted, true);
  assert.equal(reset.state.phase, 'idle');
  assert.equal(reset.state.generation, 1);

  coordinator.start();
  const stale = coordinator.onActivity(
    activity({ generation: 0, speechActive: true }),
    finalizeMetrics,
  );
  assert.equal(stale.accepted, false);
  assert.equal(stale.activityDecision.reason, 'stale_generation');
});

test('coordinator rejects malformed session identity at construction', () => {
  assert.throws(
    () => new coordinatorModule.VoiceRuntimeCoordinator('bad'),
    /Invalid voice session id/,
  );
});
