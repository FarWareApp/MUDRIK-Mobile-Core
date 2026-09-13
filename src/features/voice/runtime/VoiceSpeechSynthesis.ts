export type VoiceSynthesisRequest = {
  text: string;
  locale: string;
  voiceId: string | null;
  speakingRate: number | null;
  volume: number | null;
};

export type VoiceSynthesisEvent =
  | {
      type: 'audio_started';
      startedAt: number;
    }
  | {
      type: 'audio_progress';
      playedMs: number;
    }
  | {
      type: 'completed';
      completedAt: number;
    }
  | {
      type: 'error';
      code:
        | 'network_unavailable'
        | 'provider_unavailable'
        | 'synthesis_failed'
        | 'playback_failed';
      retryable: boolean;
    };

export interface VoiceSynthesisSession {
  subscribe(
    listener: (
      event: VoiceSynthesisEvent,
    ) => void,
  ): () => void;

  cancel(): Promise<void>;
}

export interface VoiceSpeechSynthesizer {
  speak(
    request: VoiceSynthesisRequest,
  ): Promise<VoiceSynthesisSession>;
}
