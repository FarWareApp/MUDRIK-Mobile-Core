export type VoiceRecorderPhase =
  | 'idle'
  | 'preparing'
  | 'recording'
  | 'paused'
  | 'stopped'
  | 'error';

export type VoiceRecordingDraft = {
  uri: string;
  durationMs: number;
  createdAt: number;
};

export type MicrophonePermissionState =
  | 'unknown'
  | 'granted'
  | 'denied';
