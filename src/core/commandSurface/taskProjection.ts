import {
  isComputerControlCapability,
  type ComputerControlCapability,
} from './computerCapabilities';

import {
  isCommandSurfaceId,
} from './surfaceIds';

export const COMMAND_TASK_STATES = [
  'received',
  'authenticated',
  'awaiting_approval',
  'authorized',
  'queued',
  'delivered',
  'acknowledged',
  'running',
  'blocked',
  'succeeded',
  'failed',
  'cancelled',
  'revoked',
  'expired',
] as const;

export type CommandTaskState =
  (typeof COMMAND_TASK_STATES)[number];

export type CommandTaskRisk =
  | 'low'
  | 'medium'
  | 'high'
  | 'critical';

export type CommandTaskProjection =
  Readonly<{
    accountId: string;
    taskId: string;
    destinationDeviceId: string;
    state: CommandTaskState;
    revision: number;
    risk: CommandTaskRisk;
    requestedCapabilities:
      readonly ComputerControlCapability[];
    approvalId: string | null;
    updatedAtMs: number;
    expiresAtMs: number;
    terminalReason: string | null;
    grantsAuthority: false;
  }>;

const KEYS = new Set([
  'accountId',
  'taskId',
  'destinationDeviceId',
  'state',
  'revision',
  'risk',
  'requestedCapabilities',
  'approvalId',
  'updatedAtMs',
  'expiresAtMs',
  'terminalReason',
  'grantsAuthority',
]);

const STATE_SET: ReadonlySet<string> =
  new Set(COMMAND_TASK_STATES);

const RISK_SET =
  new Set([
    'low',
    'medium',
    'high',
    'critical',
  ]);

const TERMINAL =
  new Set<CommandTaskState>([
    'blocked',
    'succeeded',
    'failed',
    'cancelled',
    'revoked',
    'expired',
  ]);

const REASON =
  /^[a-z][a-z0-9_.-]{0,127}$/;

function safeInteger(
  value: unknown,
): value is number {
  return (
    Number.isSafeInteger(value)
    && (value as number) >= 0
  );
}

function parseCapabilities(
  value: unknown,
): readonly ComputerControlCapability[] | null {
  if (
    !Array.isArray(value)
    || value.length < 1
    || value.length > 64
    || value.some(
      (entry) =>
        !isComputerControlCapability(
          entry,
        ),
    )
    || new Set(value).size
      !== value.length
  ) {
    return null;
  }

  return Object.freeze([
    ...value,
  ]) as readonly ComputerControlCapability[];
}

export function isTerminalCommandTaskState(
  state: CommandTaskState,
): boolean {
  return TERMINAL.has(state);
}

export function parseCommandTaskProjection(
  input: unknown,
  {
    expectedAccountId,
    expectedDeviceId,
  }: {
    expectedAccountId?: string;
    expectedDeviceId?: string;
  } = {},
): CommandTaskProjection | null {
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
      !== KEYS.size
    || Object.keys(record).some(
      (key) => !KEYS.has(key),
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
    || !isCommandSurfaceId(
      'device',
      record.destinationDeviceId,
    )
    || (
      expectedDeviceId !== undefined
      && record.destinationDeviceId
        !== expectedDeviceId
    )
    || typeof record.state
      !== 'string'
    || !STATE_SET.has(record.state)
    || !safeInteger(record.revision)
    || typeof record.risk
      !== 'string'
    || !RISK_SET.has(record.risk)
    || !safeInteger(record.updatedAtMs)
    || !safeInteger(record.expiresAtMs)
    || (
      record.approvalId !== null
      && !isCommandSurfaceId(
        'approval',
        record.approvalId,
      )
    )
    || (
      record.terminalReason !== null
      && (
        typeof record.terminalReason
          !== 'string'
        || !REASON.test(
          record.terminalReason,
        )
      )
    )
    || record.grantsAuthority
      !== false
  ) {
    return null;
  }

  const capabilities =
    parseCapabilities(
      record.requestedCapabilities,
    );

  if (!capabilities) {
    return null;
  }

  return Object.freeze({
    accountId:
      record.accountId,
    taskId:
      record.taskId,
    destinationDeviceId:
      record.destinationDeviceId,
    state:
      (record.state as CommandTaskState),
    revision:
      record.revision,
    risk:
      (record.risk as CommandTaskRisk),
    requestedCapabilities:
      capabilities,
    approvalId:
      (record.approvalId as string | null),
    updatedAtMs:
      record.updatedAtMs,
    expiresAtMs:
      record.expiresAtMs,
    terminalReason:
      (record.terminalReason as string | null),
    grantsAuthority: false,
  });
}

export type TaskProjectionUpdate =
  Readonly<{
    accepted: boolean;
    duplicate: boolean;
    reason:
      | 'accepted'
      | 'duplicate'
      | 'identity_mismatch'
      | 'stale_revision'
      | 'revision_conflict'
      | 'terminal_regression';
    projection:
      CommandTaskProjection;
  }>;

function sameProjection(
  left: CommandTaskProjection,
  right: CommandTaskProjection,
): boolean {
  return (
    JSON.stringify(left)
      === JSON.stringify(right)
  );
}

export function applyCommandTaskProjection(
  current: CommandTaskProjection,
  next: CommandTaskProjection,
): TaskProjectionUpdate {
  if (
    current.accountId
      !== next.accountId
    || current.taskId
      !== next.taskId
    || current.destinationDeviceId
      !== next.destinationDeviceId
  ) {
    return Object.freeze({
      accepted: false,
      duplicate: false,
      reason:
        'identity_mismatch',
      projection: current,
    });
  }

  if (next.revision < current.revision) {
    return Object.freeze({
      accepted: false,
      duplicate: false,
      reason: 'stale_revision',
      projection: current,
    });
  }

  if (
    next.revision === current.revision
  ) {
    const duplicate =
      sameProjection(current, next);

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
    isTerminalCommandTaskState(
      current.state,
    )
    && next.state !== current.state
  ) {
    return Object.freeze({
      accepted: false,
      duplicate: false,
      reason:
        'terminal_regression',
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
