const PROJECT_ID_PATTERN =
  /^project-[0-9]{10,16}-[a-z0-9]{6,16}$/;

const MAX_PROJECT_ID_LENGTH = 64;

export function normalizeProjectId(
  value: unknown,
): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();

  if (
    normalized.length === 0 ||
    normalized.length > MAX_PROJECT_ID_LENGTH ||
    !PROJECT_ID_PATTERN.test(normalized)
  ) {
    return null;
  }

  return normalized;
}
