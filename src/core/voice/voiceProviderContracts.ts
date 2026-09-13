import { sanitizeSecurityMetadata } from '../security/securityEvent';
import type { StreamingSpeechSegment } from './streamingSpeech';

export type VoiceProviderStatus =
  | 'ready'
  | 'degraded'
  | 'unavailable';

export type VoiceProviderFailureCode =
  | 'permission_denied'
  | 'network_unavailable'
  | 'provider_unavailable'
  | 'timeout'
  | 'cancelled'
  | 'invalid_response'
  | 'unsupported_language'
  | 'unknown';

export type VoiceProviderFailure = Readonly<{
  code: VoiceProviderFailureCode;
  retryable: boolean;
  providerSafeMessage: string | null;
}>;

export type StreamingSttRequest = Readonly<{
  sessionId: string;
  generation: number;
  languageHints: readonly string[];
  customVocabulary: readonly string[];
}>;

export interface StreamingSttSession {
  readonly sessionId: string;
  readonly generation: number;
  pushAudioChunk(chunkRef: string): Promise<void>;
  finishInput(): Promise<void>;
  cancel(): Promise<void>;
}

export interface StreamingSttProvider {
  getStatus(): Promise<VoiceProviderStatus>;
  start(
    request: StreamingSttRequest,
    onSegment: (segment: StreamingSpeechSegment) => void,
    onFailure: (failure: VoiceProviderFailure) => void,
  ): Promise<StreamingSttSession>;
}

export type StreamingTtsRequest = Readonly<{
  sessionId: string;
  generation: number;
  utteranceId: string;
  text: string;
  languageHint: string | null;
  voicePreference: string | null;
  speakingRate: number | null;
}>;

export type StreamingTtsChunkMetadata = Readonly<{
  sessionId: string;
  generation: number;
  utteranceId: string;
  sequence: number;
  payloadRef: string;
  isFinal: boolean;
}>;

export interface StreamingTtsSession {
  readonly sessionId: string;
  readonly generation: number;
  readonly utteranceId: string;
  cancel(): Promise<void>;
}

export interface StreamingTtsProvider {
  getStatus(): Promise<VoiceProviderStatus>;
  synthesize(
    request: StreamingTtsRequest,
    onChunk: (chunk: StreamingTtsChunkMetadata) => void,
    onFailure: (failure: VoiceProviderFailure) => void,
  ): Promise<StreamingTtsSession>;
}

const SESSION_ID = /^voice_[A-Za-z0-9_-]{16,80}$/;
const UTTERANCE_ID = /^utt_[A-Za-z0-9_-]{16,80}$/;
const PAYLOAD_REF = /^audio_[A-Za-z0-9._:@\/-]{8,160}$/;

export function validateStreamingTtsChunkMetadata(
  input: unknown,
): StreamingTtsChunkMetadata | null {
  if (
    typeof input !== 'object' ||
    input === null ||
    Array.isArray(input)
  ) {
    return null;
  }

  const record = input as Record<string, unknown>;
  const allowedKeys = new Set([
    'sessionId',
    'generation',
    'utteranceId',
    'sequence',
    'payloadRef',
    'isFinal',
  ]);

  if (
    Object.keys(record).some((key) => !allowedKeys.has(key)) ||
    typeof record.sessionId !== 'string' ||
    !SESSION_ID.test(record.sessionId) ||
    typeof record.generation !== 'number' ||
    !Number.isSafeInteger(record.generation) ||
    record.generation < 0 ||
    typeof record.utteranceId !== 'string' ||
    !UTTERANCE_ID.test(record.utteranceId) ||
    typeof record.sequence !== 'number' ||
    !Number.isSafeInteger(record.sequence) ||
    record.sequence < 0 ||
    typeof record.payloadRef !== 'string' ||
    !PAYLOAD_REF.test(record.payloadRef) ||
    typeof record.isFinal !== 'boolean'
  ) {
    return null;
  }

  return Object.freeze({
    sessionId: record.sessionId,
    generation: record.generation,
    utteranceId: record.utteranceId,
    sequence: record.sequence,
    payloadRef: record.payloadRef,
    isFinal: record.isFinal,
  });
}

export function normalizeVoiceProviderFailure(
  input: unknown,
): VoiceProviderFailure {
  const fallback: VoiceProviderFailure = Object.freeze({
    code: 'unknown',
    retryable: false,
    providerSafeMessage: null,
  });

  if (
    typeof input !== 'object' ||
    input === null ||
    Array.isArray(input)
  ) {
    return fallback;
  }

  const record = input as Record<string, unknown>;
  const allowedKeys = new Set([
    'code',
    'retryable',
    'providerSafeMessage',
  ]);
  const codes: readonly VoiceProviderFailureCode[] = [
    'permission_denied',
    'network_unavailable',
    'provider_unavailable',
    'timeout',
    'cancelled',
    'invalid_response',
    'unsupported_language',
    'unknown',
  ];

  if (
    Object.keys(record).some((key) => !allowedKeys.has(key)) ||
    typeof record.code !== 'string' ||
    !codes.includes(record.code as VoiceProviderFailureCode) ||
    typeof record.retryable !== 'boolean' ||
    (
      record.providerSafeMessage !== null &&
      typeof record.providerSafeMessage !== 'string'
    )
  ) {
    return fallback;
  }

  const safeMessage =
    typeof record.providerSafeMessage === 'string'
      ? String(
          sanitizeSecurityMetadata({
            providerMessage:
              record.providerSafeMessage,
          }).providerMessage,
        ).slice(0, 240)
      : null;

  return Object.freeze({
    code: record.code as VoiceProviderFailureCode,
    retryable: record.retryable,
    providerSafeMessage: safeMessage,
  });
}
