import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  createInitialVoiceRuntimeState,
} = loadTypeScriptModule(
  'src/features/voice/runtime/voiceRuntimeTypes.ts',
);

const {
  transitionVoiceRuntime,
} = loadTypeScriptModule(
  'src/features/voice/runtime/voiceRuntimeReducer.ts',
);

function startEvent(overrides = {}) {
  return {
    type: 'start_requested',
    mode: 'press_to_talk',
    sessionId: 'voice-session-1',
    microphonePermission: 'granted',
    privacyAllowsMicrophone: true,
    ...overrides,
  };
}

test('voice runtime starts from a minimal private idle state', () => {
  assert.deepEqual(
    createInitialVoiceRuntimeState(),
    {
      phase: 'idle',
      activationMode: null,
      sessionId: null,
      turnId: null,
      pendingStopReason: null,
      lastFailure: null,
    },
  );
});

test('authorized start arms but does not falsely claim capture has started', () => {
  const result = transitionVoiceRuntime(
    createInitialVoiceRuntimeState(),
    startEvent(),
  );

  assert.equal(result.accepted, true);
  assert.equal(result.state.phase, 'arming');
  assert.equal(
    result.state.activationMode,
    'press_to_talk',
  );
  assert.equal(
    result.state.sessionId,
    'voice-session-1',
  );
});

test('privacy denial blocks voice before runtime activation', () => {
  const result = transitionVoiceRuntime(
    createInitialVoiceRuntimeState(),
    startEvent({
      privacyAllowsMicrophone: false,
    }),
  );

  assert.equal(result.accepted, true);
  assert.equal(result.state.phase, 'blocked');
  assert.equal(result.state.sessionId, null);
  assert.equal(result.state.activationMode, null);
  assert.deepEqual(
    result.state.lastFailure,
    {
      code: 'privacy_blocked',
      retryable: true,
    },
  );
});

test('unknown microphone permission fails closed instead of assuming permission', () => {
  const result = transitionVoiceRuntime(
    createInitialVoiceRuntimeState(),
    startEvent({
      microphonePermission: 'unknown',
    }),
  );

  assert.equal(result.state.phase, 'blocked');
  assert.equal(
    result.state.lastFailure.code,
    'microphone_permission_unverified',
  );
});

test('malformed or over-specified start events are rejected without mutating state', () => {
  const initial =
    createInitialVoiceRuntimeState();

  const snapshot =
    structuredClone(initial);

  const result = transitionVoiceRuntime(
    initial,
    startEvent({
      unexpectedAuthority: true,
    }),
  );

  assert.equal(result.accepted, false);
  assert.equal(
    result.reason,
    'malformed_start_request',
  );
  assert.deepEqual(initial, snapshot);
  assert.deepEqual(result.state, snapshot);
});

test('normal turn progression requires confirmed capture and exact turn binding', () => {
  let state = transitionVoiceRuntime(
    createInitialVoiceRuntimeState(),
    startEvent(),
  ).state;

  state = transitionVoiceRuntime(
    state,
    { type: 'capture_started' },
  ).state;
  assert.equal(state.phase, 'listening');

  state = transitionVoiceRuntime(
    state,
    {
      type: 'utterance_finalized',
      turnId: 'turn-1',
    },
  ).state;
  assert.equal(state.phase, 'processing');

  const mismatch = transitionVoiceRuntime(
    state,
    {
      type: 'output_prepared',
      turnId: 'turn-other',
    },
  );

  assert.equal(mismatch.accepted, false);
  assert.equal(
    mismatch.reason,
    'output_turn_mismatch',
  );

  state = transitionVoiceRuntime(
    state,
    {
      type: 'output_prepared',
      turnId: 'turn-1',
    },
  ).state;
  assert.equal(
    state.phase,
    'preparing_output',
  );

  state = transitionVoiceRuntime(
    state,
    {
      type: 'playback_started',
      turnId: 'turn-1',
    },
  ).state;
  assert.equal(state.phase, 'speaking');
});

test('barge-in enters interruption sequencing before listening resumes', () => {
  let state = transitionVoiceRuntime(
    createInitialVoiceRuntimeState(),
    startEvent(),
  ).state;

  state = transitionVoiceRuntime(
    state,
    { type: 'capture_started' },
  ).state;

  state = transitionVoiceRuntime(
    state,
    {
      type: 'utterance_finalized',
      turnId: 'turn-1',
    },
  ).state;

  state = transitionVoiceRuntime(
    state,
    {
      type: 'output_prepared',
      turnId: 'turn-1',
    },
  ).state;

  state = transitionVoiceRuntime(
    state,
    {
      type: 'playback_started',
      turnId: 'turn-1',
    },
  ).state;

  state = transitionVoiceRuntime(
    state,
    { type: 'barge_in_requested' },
  ).state;

  assert.equal(state.phase, 'interrupting');
  assert.equal(
    state.pendingStopReason,
    'barge_in',
  );

  state = transitionVoiceRuntime(
    state,
    { type: 'capture_started' },
  ).state;

  assert.equal(state.phase, 'listening');
  assert.equal(state.turnId, null);
  assert.equal(state.pendingStopReason, null);
});

test('privacy restriction forces an active runtime toward verified stop', () => {
  let state = transitionVoiceRuntime(
    createInitialVoiceRuntimeState(),
    startEvent(),
  ).state;

  state = transitionVoiceRuntime(
    state,
    { type: 'capture_started' },
  ).state;

  const restricted = transitionVoiceRuntime(
    state,
    { type: 'privacy_restricted' },
  );

  assert.equal(restricted.accepted, true);
  assert.equal(
    restricted.state.phase,
    'stopping',
  );
  assert.equal(
    restricted.state.pendingStopReason,
    'privacy_restriction',
  );

  const stopped = transitionVoiceRuntime(
    restricted.state,
    { type: 'stopped' },
  );

  assert.deepEqual(
    stopped.state,
    createInitialVoiceRuntimeState(),
  );
});

test('runtime failures preserve typed failure and require explicit reset', () => {
  let state = transitionVoiceRuntime(
    createInitialVoiceRuntimeState(),
    startEvent(),
  ).state;

  state = transitionVoiceRuntime(
    state,
    {
      type: 'failure',
      code: 'microphone_unavailable',
      retryable: true,
    },
  ).state;

  assert.equal(state.phase, 'error');
  assert.equal(
    state.pendingStopReason,
    'runtime_error',
  );
  assert.deepEqual(
    state.lastFailure,
    {
      code: 'microphone_unavailable',
      retryable: true,
    },
  );

  const reset = transitionVoiceRuntime(
    state,
    { type: 'reset' },
  );

  assert.deepEqual(
    reset.state,
    createInitialVoiceRuntimeState(),
  );
});

test('unknown events and invalid stop reasons are fail-closed', () => {
  const initial =
    createInitialVoiceRuntimeState();

  const unknown = transitionVoiceRuntime(
    initial,
    { type: 'become_ambient_forever' },
  );

  assert.equal(unknown.accepted, false);
  assert.equal(unknown.reason, 'unknown_event');

  const active = transitionVoiceRuntime(
    initial,
    startEvent(),
  ).state;

  const invalidStop = transitionVoiceRuntime(
    active,
    {
      type: 'stop_requested',
      reason: 'ignore_privacy',
    },
  );

  assert.equal(invalidStop.accepted, false);
  assert.equal(
    invalidStop.reason,
    'malformed_stop_request',
  );
});
