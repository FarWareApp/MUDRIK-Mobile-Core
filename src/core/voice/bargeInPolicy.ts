export type VoiceEchoState =
  | 'clear'
  | 'possible_echo'
  | 'unknown';

export type BargeInDecisionReason =
  | 'interrupt'
  | 'invalid_input'
  | 'assistant_not_speaking'
  | 'input_not_authorized'
  | 'speech_inactive'
  | 'insufficient_speech'
  | 'insufficient_confidence'
  | 'echo_not_disambiguated';

export type BargeInDecision = Readonly<{
  interrupt: boolean;
  reason: BargeInDecisionReason;
}>;

export const BARGE_IN_BASELINE = Object.freeze({
  minimumSpeechMs: 120,
  uncertainEchoMinimumSpeechMs: 220,
  clearVadConfidence: 0.65,
  uncertainEchoVadConfidence: 0.78,
  uncertainEchoHypothesisStability: 0.72,
});

function finiteNonNegative(value: unknown): value is number {
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
  interrupt: boolean,
  reason: BargeInDecisionReason,
): BargeInDecision {
  return Object.freeze({ interrupt, reason });
}

export function qualifyBargeIn(input: unknown): BargeInDecision {
  if (
    typeof input !== 'object' ||
    input === null ||
    Array.isArray(input)
  ) {
    return result(false, 'invalid_input');
  }

  const record = input as Record<string, unknown>;
  const allowedKeys = new Set([
    'assistantSpeaking',
    'inputAuthorized',
    'speechActive',
    'speechDurationMs',
    'vadConfidence',
    'echoState',
    'hasLexicalEvidence',
    'hypothesisStability',
  ]);

  if (
    Object.keys(record).some((key) => !allowedKeys.has(key)) ||
    typeof record.assistantSpeaking !== 'boolean' ||
    typeof record.inputAuthorized !== 'boolean' ||
    typeof record.speechActive !== 'boolean' ||
    !finiteNonNegative(record.speechDurationMs) ||
    !probabilityOrNull(record.vadConfidence) ||
    (
      record.echoState !== 'clear' &&
      record.echoState !== 'possible_echo' &&
      record.echoState !== 'unknown'
    ) ||
    typeof record.hasLexicalEvidence !== 'boolean' ||
    !probabilityOrNull(record.hypothesisStability)
  ) {
    return result(false, 'invalid_input');
  }

  if (!record.assistantSpeaking) {
    return result(false, 'assistant_not_speaking');
  }

  if (!record.inputAuthorized) {
    return result(false, 'input_not_authorized');
  }

  if (!record.speechActive) {
    return result(false, 'speech_inactive');
  }

  if (record.speechDurationMs < BARGE_IN_BASELINE.minimumSpeechMs) {
    return result(false, 'insufficient_speech');
  }

  if (record.echoState === 'clear') {
    if (
      record.vadConfidence === null ||
      record.vadConfidence < BARGE_IN_BASELINE.clearVadConfidence
    ) {
      return result(false, 'insufficient_confidence');
    }

    return result(true, 'interrupt');
  }

  if (
    record.speechDurationMs <
      BARGE_IN_BASELINE.uncertainEchoMinimumSpeechMs
  ) {
    return result(false, 'echo_not_disambiguated');
  }

  if (
    !record.hasLexicalEvidence ||
    record.vadConfidence === null ||
    record.vadConfidence <
      BARGE_IN_BASELINE.uncertainEchoVadConfidence ||
    record.hypothesisStability === null ||
    record.hypothesisStability <
      BARGE_IN_BASELINE.uncertainEchoHypothesisStability
  ) {
    return result(false, 'echo_not_disambiguated');
  }

  return result(true, 'interrupt');
}
