export type VoiceActivationMode =
  | 'wake_word'
  | 'press_to_talk'
  | 'open_session'
  | 'headset_button';

export type VoiceRuntimePhase =
  | 'idle'
  | 'arming'
  | 'listening'
  | 'processing'
  | 'preparing_output'
  | 'speaking'
  | 'interrupting'
  | 'stopping'
  | 'blocked'
  | 'error';

export type VoiceRuntimeStopReason =
  | 'user_cancel'
  | 'barge_in'
  | 'privacy_restriction'
  | 'session_end'
  | 'runtime_error';

export type VoiceRuntimeFailureCode =
  | 'microphone_permission_denied'
  | 'microphone_permission_unverified'
  | 'privacy_blocked'
  | 'microphone_unavailable'
  | 'recognition_failed'
  | 'synthesis_failed'
  | 'playback_failed'
  | 'network_unavailable'
  | 'internal_error';

export type VoiceRuntimeFailure = {
  code: VoiceRuntimeFailureCode;
  retryable: boolean;
};

export type VoiceRuntimeState = {
  phase: VoiceRuntimePhase;
  activationMode: VoiceActivationMode | null;
  sessionId: string | null;
  turnId: string | null;
  pendingStopReason: VoiceRuntimeStopReason | null;
  lastFailure: VoiceRuntimeFailure | null;
};

export type VoiceRuntimeTransition = {
  accepted: boolean;
  reason: string;
  state: VoiceRuntimeState;
};

export function createInitialVoiceRuntimeState(): VoiceRuntimeState {
  return {
    phase: 'idle',
    activationMode: null,
    sessionId: null,
    turnId: null,
    pendingStopReason: null,
    lastFailure: null,
  };
}
