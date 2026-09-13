export type SpeechStreamKind = 'partial' | 'final';

export type SpeechLanguageTag = string;

export type StreamingSpeechSegment = Readonly<{
  sessionId: string;
  generation: number;
  segmentId: string;
  sequence: number;
  kind: SpeechStreamKind;
  text: string;
  confidence: number | null;
  stability: number | null;
  languageTags: readonly SpeechLanguageTag[];
  startedAtMs: number;
  endedAtMs: number | null;
}>;

export type SpeechSegmentValidation = Readonly<{
  accepted: boolean;
  segment: StreamingSpeechSegment | null;
  reason:
    | 'accepted'
    | 'invalid_shape'
    | 'invalid_identity'
    | 'invalid_generation'
    | 'invalid_sequence'
    | 'invalid_text'
    | 'invalid_confidence'
    | 'invalid_language'
    | 'invalid_timing';
}>;

const SESSION_ID = /^voice_[A-Za-z0-9_-]{16,80}$/;
const SEGMENT_ID = /^seg_[A-Za-z0-9_-]{16,80}$/;
const LANGUAGE_TAG = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8}){0,3}$/;
const MAX_TEXT_LENGTH = 12_000;
const MAX_LANGUAGE_TAGS = 8;

function isFiniteProbability(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1
  );
}

function parseNullableProbability(value: unknown): number | null | undefined {
  if (value === null) {
    return null;
  }

  return isFiniteProbability(value)
    ? value
    : undefined;
}

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

function parseLanguageTags(value: unknown): readonly string[] | null {
  if (!Array.isArray(value) || value.length > MAX_LANGUAGE_TAGS) {
    return null;
  }

  const tags: string[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    if (
      typeof item !== 'string' ||
      !LANGUAGE_TAG.test(item)
    ) {
      return null;
    }

    const normalized = item.toLowerCase();
    if (seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    tags.push(item);
  }

  return Object.freeze(tags);
}

export function validateStreamingSpeechSegment(
  input: unknown,
): SpeechSegmentValidation {
  const reject = (
    reason: Exclude<SpeechSegmentValidation['reason'], 'accepted'>,
  ): SpeechSegmentValidation => ({
    accepted: false,
    segment: null,
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
    'segmentId',
    'sequence',
    'kind',
    'text',
    'confidence',
    'stability',
    'languageTags',
    'startedAtMs',
    'endedAtMs',
  ]);

  if (
    Object.keys(record).some(
      (key) => !allowedKeys.has(key),
    )
  ) {
    return reject('invalid_shape');
  }

  if (
    typeof record.sessionId !== 'string' ||
    !SESSION_ID.test(record.sessionId) ||
    typeof record.segmentId !== 'string' ||
    !SEGMENT_ID.test(record.segmentId)
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
    record.kind !== 'partial' &&
    record.kind !== 'final'
  ) {
    return reject('invalid_shape');
  }

  if (
    typeof record.text !== 'string' ||
    record.text.length === 0 ||
    record.text.length > MAX_TEXT_LENGTH ||
    record.text.trim().length === 0 ||
    /\u0000/.test(record.text)
  ) {
    return reject('invalid_text');
  }

  const confidence =
    parseNullableProbability(record.confidence);
  const stability =
    parseNullableProbability(record.stability);

  if (
    confidence === undefined ||
    stability === undefined
  ) {
    return reject('invalid_confidence');
  }

  const languageTags =
    parseLanguageTags(record.languageTags);

  if (languageTags === null) {
    return reject('invalid_language');
  }

  if (
    typeof record.startedAtMs !== 'number' ||
    !Number.isFinite(record.startedAtMs) ||
    record.startedAtMs < 0
  ) {
    return reject('invalid_timing');
  }

  if (
    record.endedAtMs !== null &&
    (
      typeof record.endedAtMs !== 'number' ||
      !Number.isFinite(record.endedAtMs) ||
      record.endedAtMs < record.startedAtMs
    )
  ) {
    return reject('invalid_timing');
  }

  if (
    record.kind === 'partial' &&
    record.endedAtMs !== null
  ) {
    return reject('invalid_timing');
  }

  if (
    record.kind === 'final' &&
    record.endedAtMs === null
  ) {
    return reject('invalid_timing');
  }

  const segment: StreamingSpeechSegment = Object.freeze({
    sessionId: record.sessionId,
    generation,
    segmentId: record.segmentId,
    sequence: record.sequence,
    kind: record.kind,
    text: record.text,
    confidence,
    stability,
    languageTags,
    startedAtMs: record.startedAtMs,
    endedAtMs: record.endedAtMs,
  });

  return {
    accepted: true,
    segment,
    reason: 'accepted',
  };
}

export function isExecutableSpeechSegment(
  segment: StreamingSpeechSegment,
): boolean {
  return segment.kind === 'final';
}
