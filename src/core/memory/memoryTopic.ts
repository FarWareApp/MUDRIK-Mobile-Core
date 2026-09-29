import {
  freezeStrings,
  isSafeMemoryText,
} from './memorySecurity';

export function normalizeMemoryTopicTag(
  value: unknown,
): string | null {
  if (
    typeof value !== 'string'
    || value.length < 1
    || value.length > 80
    || /[\u0000-\u001F\u007F]/
      .test(value)
  ) {
    return null;
  }

  const normalized =
    value
      .normalize('NFKC')
      .trim()
      .toLowerCase();

  if (
    normalized.length < 1
    || normalized.length > 80
    || !isSafeMemoryText(
      normalized,
      80,
    )
  ) {
    return null;
  }

  return normalized;
}

export function parseMemoryTopicTags(
  value: unknown,
  {
    min = 1,
    max = 32,
  }: {
    min?: number;
    max?: number;
  } = {},
): readonly string[] | null {
  if (
    !Array.isArray(value)
    || !Number.isInteger(min)
    || !Number.isInteger(max)
    || min < 0
    || max < min
    || value.length < min
    || value.length > max
  ) {
    return null;
  }

  const tags:
    string[] = [];

  for (const entry of value) {
    const normalized =
      normalizeMemoryTopicTag(
        entry,
      );

    if (!normalized) {
      return null;
    }

    tags.push(normalized);
  }

  const unique =
    [...new Set(tags)].sort();

  if (unique.length !== tags.length) {
    return null;
  }

  return freezeStrings(unique);
}

export function parseCanonicalMemoryTopicTags(
  value: unknown,
): readonly string[] | null {
  const parsed =
    parseMemoryTopicTags(value);

  if (
    !parsed
    || !Array.isArray(value)
    || value.some(
      (entry, index) =>
        entry !== parsed[index],
    )
  ) {
    return null;
  }

  return parsed;
}
