import type { DiagnosticEvent } from '../../contracts/Diagnostics';

export const DIAGNOSTIC_EVENT_LIMIT = 100;

export function mergeDiagnosticEvents(
  stored: readonly DiagnosticEvent[],
  runtime: readonly DiagnosticEvent[],
  limit = DIAGNOSTIC_EVENT_LIMIT,
): DiagnosticEvent[] {
  const safeLimit = Math.max(0, Math.trunc(limit));
  const merged = new Map<string, DiagnosticEvent>();

  for (const event of stored) {
    merged.set(event.id, event);
  }

  for (const event of runtime) {
    merged.set(event.id, event);
  }

  return [...merged.values()]
    .sort((left, right) => {
      const byTimestamp = right.timestamp - left.timestamp;

      if (byTimestamp !== 0) {
        return byTimestamp;
      }

      return left.id.localeCompare(right.id);
    })
    .slice(0, safeLimit);
}
