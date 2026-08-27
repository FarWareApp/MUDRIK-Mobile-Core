const MAX_TITLE_LENGTH = 52;

export function deriveConversationTitle(
  text: string,
): string {
  const normalized = text
    .replace(/\s+/g, ' ')
    .trim();

  if (normalized.length <= MAX_TITLE_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, MAX_TITLE_LENGTH - 1).trim()}…`;
}
