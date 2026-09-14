export const MAX_MESSAGE_TEXT_LENGTH = 12_000;

export const MESSAGE_TEXT_COUNTER_REMAINING_THRESHOLD =
  1_000;

export function isMessageTextWithinLimit(
  value: string,
) {
  return value.length <= MAX_MESSAGE_TEXT_LENGTH;
}

export function shouldShowMessageTextCounter(
  value: string,
) {
  return value.length >=
    MAX_MESSAGE_TEXT_LENGTH
      - MESSAGE_TEXT_COUNTER_REMAINING_THRESHOLD;
}
