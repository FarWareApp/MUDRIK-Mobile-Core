export type VoiceRecorderPhase =
  | 'idle'
  | 'preparing'
  | 'recording'
  | 'paused'
  | 'stopped'
  | 'error';

export type VoiceRecorderErrorCode =
  | 'microphone-permission-denied'
  | 'recording-start-failed'
  | 'recording-stop-failed'
  | 'recording-uri-unavailable';

export type VoiceRecordingDraft = {
  uri: string;
  durationMs: number;
  createdAt: number;
};

export type MicrophonePermissionState =
  | 'unknown'
  | 'granted'
  | 'denied';
