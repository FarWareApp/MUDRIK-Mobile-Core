export const MEMORY_CATEGORIES =
  Object.freeze([
    'communication_preference',
    'language_preference',
    'routine',
    'project',
    'device_alias',
    'smart_home_preference',
    'recurring_task',
    'companion_style_preference',
  ] as const);

export type MemoryCategory =
  typeof MEMORY_CATEGORIES[number];

export function isMemoryCategory(
  value: unknown,
): value is MemoryCategory {
  return (
    typeof value === 'string'
    && (
      (MEMORY_CATEGORIES as readonly string[])
    ).includes(value)
  );
}
