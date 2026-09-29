import {
  isCommandSurfaceId,
} from './surfaceIds';

import {
  isSafeSurfaceText,
} from './surfaceDisclosure';

export type CommandHistoryOutcome =
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'revoked'
  | 'expired';

export type CommandHistoryEntry =
  Readonly<{
    taskId: string;
    destinationDeviceId: string;
    taskRevision: number;
    outcome:
      CommandHistoryOutcome;
    summary: string;
    completedAtMs: number;
    resultAvailable: boolean;
    grantsAuthority: false;
  }>;

export type CommandHistoryProjection =
  Readonly<{
    accountId: string;
    revision: number;
    generatedAtMs: number;
    entries:
      readonly CommandHistoryEntry[];
    truncated: boolean;
    grantsAuthority: false;
  }>;

const OUTCOMES =
  new Set([
    'succeeded',
    'failed',
    'cancelled',
    'revoked',
    'expired',
  ]);

const PROJECTION_KEYS =
  new Set([
    'accountId',
    'revision',
    'generatedAtMs',
    'entries',
    'truncated',
    'grantsAuthority',
  ]);

const ENTRY_KEYS =
  new Set([
    'taskId',
    'destinationDeviceId',
    'taskRevision',
    'outcome',
    'summary',
    'completedAtMs',
    'resultAvailable',
    'grantsAuthority',
  ]);

function safeInteger(
  value: unknown,
): value is number {
  return (
    Number.isSafeInteger(value)
    && (value as number) >= 0
  );
}

function parseEntry(
  input: unknown,
): CommandHistoryEntry | null {
  if (
    typeof input !== 'object'
    || input === null
    || Array.isArray(input)
  ) {
    return null;
  }

  const record =
    input as Record<string, unknown>;

  if (
    Object.keys(record).length
      !== ENTRY_KEYS.size
    || Object.keys(record).some(
      (key) => !ENTRY_KEYS.has(key),
    )
    || !isCommandSurfaceId(
      'task',
      record.taskId,
    )
    || !isCommandSurfaceId(
      'device',
      record.destinationDeviceId,
    )
    || !safeInteger(
      record.taskRevision,
    )
    || typeof record.outcome
      !== 'string'
    || !OUTCOMES.has(
      record.outcome,
    )
    || !isSafeSurfaceText(
      record.summary,
      1000,
    )
    || record.summary.length < 1
    || !safeInteger(
      record.completedAtMs,
    )
    || typeof record.resultAvailable
      !== 'boolean'
    || record.grantsAuthority
      !== false
  ) {
    return null;
  }

  return Object.freeze({
    taskId: record.taskId,
    destinationDeviceId:
      record.destinationDeviceId,
    taskRevision:
      record.taskRevision,
    outcome:
      (record.outcome as CommandHistoryOutcome),
    summary: record.summary,
    completedAtMs:
      record.completedAtMs,
    resultAvailable:
      record.resultAvailable,
    grantsAuthority: false,
  });
}

export function parseCommandHistoryProjection(
  input: unknown,
  expectedAccountId?: string,
): CommandHistoryProjection | null {
  if (
    typeof input !== 'object'
    || input === null
    || Array.isArray(input)
  ) {
    return null;
  }

  const record =
    input as Record<string, unknown>;

  if (
    Object.keys(record).length
      !== PROJECTION_KEYS.size
    || Object.keys(record).some(
      (key) =>
        !PROJECTION_KEYS.has(key),
    )
    || !isCommandSurfaceId(
      'account',
      record.accountId,
    )
    || (
      expectedAccountId !== undefined
      && record.accountId
        !== expectedAccountId
    )
    || !safeInteger(
      record.revision,
    )
    || !safeInteger(
      record.generatedAtMs,
    )
    || !Array.isArray(
      record.entries,
    )
    || record.entries.length > 128
    || typeof record.truncated
      !== 'boolean'
    || record.grantsAuthority
      !== false
  ) {
    return null;
  }

  const entries:
    CommandHistoryEntry[] = [];
  const taskIds =
    new Set<string>();

  for (const value of record.entries) {
    const parsed =
      parseEntry(value);

    if (
      !parsed
      || taskIds.has(parsed.taskId)
    ) {
      return null;
    }

    taskIds.add(parsed.taskId);
    entries.push(parsed);
  }

  entries.sort(
    (left, right) =>
      right.completedAtMs
        - left.completedAtMs
      || left.taskId.localeCompare(
        right.taskId,
      ),
  );

  return Object.freeze({
    accountId:
      record.accountId,
    revision:
      record.revision,
    generatedAtMs:
      record.generatedAtMs,
    entries:
      Object.freeze(entries),
    truncated:
      record.truncated,
    grantsAuthority: false,
  });
}

export type CommandHistoryUpdate =
  Readonly<{
    accepted: boolean;
    duplicate: boolean;
    reason:
      | 'accepted'
      | 'duplicate'
      | 'stale_revision'
      | 'revision_conflict'
      | 'time_regression';
    projection:
      CommandHistoryProjection;
  }>;

export function applyCommandHistoryProjection(
  current:
    CommandHistoryProjection,
  next:
    CommandHistoryProjection,
): CommandHistoryUpdate {
  if (next.revision < current.revision) {
    return Object.freeze({
      accepted: false,
      duplicate: false,
      reason: 'stale_revision',
      projection: current,
    });
  }

  if (
    next.revision
      === current.revision
  ) {
    const duplicate =
      JSON.stringify(current)
        === JSON.stringify(next);

    return Object.freeze({
      accepted: duplicate,
      duplicate,
      reason:
        duplicate
          ? 'duplicate'
          : 'revision_conflict',
      projection: current,
    });
  }

  if (
    next.generatedAtMs
      < current.generatedAtMs
  ) {
    return Object.freeze({
      accepted: false,
      duplicate: false,
      reason: 'time_regression',
      projection: current,
    });
  }

  return Object.freeze({
    accepted: true,
    duplicate: false,
    reason: 'accepted',
    projection: next,
  });
}
