import {
  isCommandSurfaceId,
} from './surfaceIds';

import {
  isSafeSurfaceText,
} from './surfaceDisclosure';

export type CommandFileChangeType =
  | 'added'
  | 'modified'
  | 'deleted'
  | 'renamed';

export type CommandFileChangeProjection =
  Readonly<{
    path: string;
    changeType:
      CommandFileChangeType;
    additions: number | null;
    deletions: number | null;
    diffPreview: string | null;
    truncated: boolean;
  }>;

export type CommandTaskResultProjection =
  Readonly<{
    accountId: string;
    taskId: string;
    destinationDeviceId: string;
    taskRevision: number;
    outcome:
      | 'succeeded'
      | 'failed'
      | 'cancelled'
      | 'revoked'
      | 'expired';
    summary: string;
    outputExcerpt: string | null;
    fileChanges:
      readonly CommandFileChangeProjection[];
    completedAtMs: number;
    truncated: boolean;
    grantsAuthority: false;
  }>;

const RESULT_KEYS = new Set([
  'accountId',
  'taskId',
  'destinationDeviceId',
  'taskRevision',
  'outcome',
  'summary',
  'outputExcerpt',
  'fileChanges',
  'completedAtMs',
  'truncated',
  'grantsAuthority',
]);

const CHANGE_KEYS = new Set([
  'path',
  'changeType',
  'additions',
  'deletions',
  'diffPreview',
  'truncated',
]);

const OUTCOME = new Set([
  'succeeded',
  'failed',
  'cancelled',
  'revoked',
  'expired',
]);

const CHANGE =
  new Set([
    'added',
    'modified',
    'deleted',
    'renamed',
  ]);

function safeInteger(
  value: unknown,
): value is number {
  return (
    Number.isSafeInteger(value)
    && (value as number) >= 0
  );
}

function parseCount(
  value: unknown,
): number | null | undefined {
  if (value === null) {
    return null;
  }

  return (
    Number.isInteger(value)
    && (value as number) >= 0
    && (value as number)
      <= 10_000_000
  )
    ? value as number
    : undefined;
}

function parseChange(
  input: unknown,
): CommandFileChangeProjection | null {
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
      !== CHANGE_KEYS.size
    || Object.keys(record).some(
      (key) =>
        !CHANGE_KEYS.has(key),
    )
    || !isSafeSurfaceText(
      record.path,
      1024,
    )
    || record.path.length < 1
    || record.path.startsWith('/')
    || /^[A-Za-z]:\//.test(
      record.path,
    )
    || record.path.includes(
      String.fromCharCode(92),
    )
    || record.path
      .split('/')
      .includes('..')
    || typeof record.changeType
      !== 'string'
    || !CHANGE.has(
      record.changeType,
    )
    || typeof record.truncated
      !== 'boolean'
    || (
      record.diffPreview !== null
      && !isSafeSurfaceText(
        record.diffPreview,
        32 * 1024,
      )
    )
  ) {
    return null;
  }

  const additions =
    parseCount(record.additions);
  const deletions =
    parseCount(record.deletions);

  if (
    additions === undefined
    || deletions === undefined
  ) {
    return null;
  }

  return Object.freeze({
    path: record.path,
    changeType:
      (record.changeType as CommandFileChangeType),
    additions,
    deletions,
    diffPreview:
      (record.diffPreview as string | null),
    truncated:
      record.truncated,
  });
}

export function parseCommandTaskResultProjection(
  input: unknown,
  {
    expectedAccountId,
    expectedTaskId,
    expectedDeviceId,
  }: {
    expectedAccountId?: string;
    expectedTaskId?: string;
    expectedDeviceId?: string;
  } = {},
): CommandTaskResultProjection | null {
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
      !== RESULT_KEYS.size
    || Object.keys(record).some(
      (key) => !RESULT_KEYS.has(key),
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
    || !isCommandSurfaceId(
      'task',
      record.taskId,
    )
    || (
      expectedTaskId !== undefined
      && record.taskId
        !== expectedTaskId
    )
    || !isCommandSurfaceId(
      'device',
      record.destinationDeviceId,
    )
    || (
      expectedDeviceId !== undefined
      && record.destinationDeviceId
        !== expectedDeviceId
    )
    || !safeInteger(
      record.taskRevision,
    )
    || typeof record.outcome
      !== 'string'
    || !OUTCOME.has(record.outcome)
    || !isSafeSurfaceText(
      record.summary,
      4000,
    )
    || record.summary.length < 1
    || (
      record.outputExcerpt !== null
      && !isSafeSurfaceText(
        record.outputExcerpt,
        64 * 1024,
      )
    )
    || !Array.isArray(
      record.fileChanges,
    )
    || record.fileChanges.length > 128
    || !safeInteger(
      record.completedAtMs,
    )
    || typeof record.truncated
      !== 'boolean'
    || record.grantsAuthority
      !== false
  ) {
    return null;
  }

  const changes:
    CommandFileChangeProjection[] = [];

  for (
    const value of record.fileChanges
  ) {
    const parsed =
      parseChange(value);

    if (!parsed) {
      return null;
    }

    if (
      changes.some(
        (entry) =>
          entry.path === parsed.path,
      )
    ) {
      return null;
    }

    changes.push(parsed);
  }

  return Object.freeze({
    accountId:
      record.accountId,
    taskId:
      record.taskId,
    destinationDeviceId:
      record.destinationDeviceId,
    taskRevision:
      record.taskRevision,
    outcome:
      (record.outcome as CommandTaskResultProjection['outcome']),
    summary:
      record.summary,
    outputExcerpt:
      (record.outputExcerpt as string | null),
    fileChanges:
      Object.freeze(changes),
    completedAtMs:
      record.completedAtMs,
    truncated:
      record.truncated,
    grantsAuthority: false,
  });
}
