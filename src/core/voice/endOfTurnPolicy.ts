export type EndOfTurnDecision =
  | 'wait'
  | 'finalize'
  | 'force_finalize';

export type EndOfTurnReason =
  | 'speech_active'
  | 'insufficient_speech'
  | 'insufficient_silence'
  | 'unstable_hypothesis'
  | 'silence_threshold_met'
  | 'maximum_utterance_reached'
  | 'maximum_segment_age_reached'
  | 'invalid_input';

export type EndOfTurnResult = Readonly<{
  decision: EndOfTurnDecision;
  reason: EndOfTurnReason;
}>;

export const END_OF_TURN_BASELINE = Object.freeze({
  minimumSpeechMs: 160,
  stableSilenceMs: 650,
  unstableSilenceMs: 1100,
  stableHypothesisMin: 0.82,
  maximumUtteranceMs: 60_000,
  maximumSegmentAgeMs: 75_000,
});

function nonNegativeFinite(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0
  );
}

function probabilityOrNull(value: unknown): value is number | null {
  return (
    value === null ||
    (
      typeof value === 'number' &&
      Number.isFinite(value) &&
      value >= 0 &&
      value <= 1
    )
  );
}

function result(
  decision: EndOfTurnDecision,
  reason: EndOfTurnReason,
): EndOfTurnResult {
  return Object.freeze({ decision, reason });
}

export function decideEndOfTurn(input: unknown): EndOfTurnResult {
  if (
    typeof input !== 'object' ||
    input === null ||
    Array.isArray(input)
  ) {
    return result('wait', 'invalid_input');
  }

  const record = input as Record<string, unknown>;
  const allowedKeys = new Set([
    'vadSpeechActive',
    'speechDurationMs',
    'silenceDurationMs',
    'segmentAgeMs',
    'hasLexicalContent',
    'hypothesisStability',
  ]);

  if (
    Object.keys(record).some((key) => !allowedKeys.has(key)) ||
    typeof record.vadSpeechActive !== 'boolean' ||
    !nonNegativeFinite(record.speechDurationMs) ||
    !nonNegativeFinite(record.silenceDurationMs) ||
    !nonNegativeFinite(record.segmentAgeMs) ||
    typeof record.hasLexicalContent !== 'boolean' ||
    !probabilityOrNull(record.hypothesisStability)
  ) {
    return result('wait', 'invalid_input');
  }

  if (
    record.segmentAgeMs >=
    END_OF_TURN_BASELINE.maximumSegmentAgeMs
  ) {
    return result(
      'force_finalize',
      'maximum_segment_age_reached',
    );
  }

  if (
    record.speechDurationMs >=
    END_OF_TURN_BASELINE.maximumUtteranceMs
  ) {
    return result(
      'force_finalize',
      'maximum_utterance_reached',
    );
  }

  if (record.vadSpeechActive) {
    return result('wait', 'speech_active');
  }

  if (
    !record.hasLexicalContent ||
    record.speechDurationMs <
      END_OF_TURN_BASELINE.minimumSpeechMs
  ) {
    return result('wait', 'insufficient_speech');
  }

  const stable =
    record.hypothesisStability !== null &&
    record.hypothesisStability >=
      END_OF_TURN_BASELINE.stableHypothesisMin;

  const requiredSilence = stable
    ? END_OF_TURN_BASELINE.stableSilenceMs
    : END_OF_TURN_BASELINE.unstableSilenceMs;

  if (record.silenceDurationMs < requiredSilence) {
    return result(
      'wait',
      stable
        ? 'insufficient_silence'
        : 'unstable_hypothesis',
    );
  }

  return result('finalize', 'silence_threshold_met');
}
