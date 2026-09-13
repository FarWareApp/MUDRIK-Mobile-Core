export type VoiceActivityEvent = Readonly<{
  sessionId: string;
  generation: number;
  sequence: number;
  atMs: number;
  speechActive: boolean;
  confidence: number | null;
}>;

export type VoiceActivityValidation = Readonly<{
  accepted: boolean;
  event: VoiceActivityEvent | null;
  reason:
    | 'accepted'
    | 'invalid_shape'
    | 'invalid_identity'
    | 'invalid_generation'
    | 'invalid_sequence'
    | 'invalid_timing'
    | 'invalid_confidence';
}>;

const SESSION_ID = /^voice_[A-Za-z0-9_-]{16,80}$/;

function parseGeneration(value: unknown): number | null {
  if (value === undefined) {
    return 0;
  }

  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    return null;
  }

  return value;
}

function parseConfidence(value: unknown): number | null | undefined {
  if (value === null) {
    return null;
  }

  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 1
  ) {
    return undefined;
  }

  return value;
}

export function validateVoiceActivityEvent(
  input: unknown,
): VoiceActivityValidation {
  const reject = (
    reason: Exclude<VoiceActivityValidation['reason'], 'accepted'>,
  ): VoiceActivityValidation => ({
    accepted: false,
    event: null,
    reason,
  });

  if (
    typeof input !== 'object' ||
    input === null ||
    Array.isArray(input)
  ) {
    return reject('invalid_shape');
  }

  const record = input as Record<string, unknown>;
  const allowedKeys = new Set([
    'sessionId',
    'generation',
    'sequence',
    'atMs',
    'speechActive',
    'confidence',
  ]);

  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return reject('invalid_shape');
  }

  if (
    typeof record.sessionId !== 'string' ||
    !SESSION_ID.test(record.sessionId)
  ) {
    return reject('invalid_identity');
  }

  const generation = parseGeneration(record.generation);
  if (generation === null) {
    return reject('invalid_generation');
  }

  if (
    typeof record.sequence !== 'number' ||
    !Number.isSafeInteger(record.sequence) ||
    record.sequence < 0
  ) {
    return reject('invalid_sequence');
  }

  if (
    typeof record.atMs !== 'number' ||
    !Number.isFinite(record.atMs) ||
    record.atMs < 0
  ) {
    return reject('invalid_timing');
  }

  if (typeof record.speechActive !== 'boolean') {
    return reject('invalid_shape');
  }

  const confidence = parseConfidence(record.confidence);
  if (confidence === undefined) {
    return reject('invalid_confidence');
  }

  return {
    accepted: true,
    event: Object.freeze({
      sessionId: record.sessionId,
      generation,
      sequence: record.sequence,
      atMs: record.atMs,
      speechActive: record.speechActive,
      confidence,
    }),
    reason: 'accepted',
  };
}
