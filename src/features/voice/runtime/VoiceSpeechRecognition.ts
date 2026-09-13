export type VoiceRecognitionAlternative = {
  text: string;
  confidence: number | null;
};

export type VoiceRecognitionEvent =
  | {
      type: 'partial';
      text: string;
      confidence: number | null;
    }
  | {
      type: 'final';
      text: string;
      confidence: number | null;
      alternatives: VoiceRecognitionAlternative[];
    }
  | {
      type: 'end_of_turn';
    }
  | {
      type: 'error';
      code:
        | 'audio_unavailable'
        | 'network_unavailable'
        | 'provider_unavailable'
        | 'recognition_failed';
      retryable: boolean;
    };

export type VoiceRecognitionStart = {
  localeHints: string[];
  customVocabulary: string[];
  allowCodeSwitching: boolean;
};

export interface VoiceRecognitionSession {
  subscribe(
    listener: (
      event: VoiceRecognitionEvent,
    ) => void,
  ): () => void;

  stop(): Promise<void>;
  cancel(): Promise<void>;
}

export interface VoiceSpeechRecognizer {
  start(
    request: VoiceRecognitionStart,
  ): Promise<VoiceRecognitionSession>;
}
