import {
  isComputerControlCapability,
  type ComputerControlCapability,
} from './computerCapabilities';

import {
  isCommandSurfaceId,
} from './surfaceIds';

import type {
  CommandTaskRisk,
} from './taskProjection';

export type CommandApprovalMode =
  | 'single_use'
  | 'task_lifetime';

export type CommandApprovalState =
  | 'active'
  | 'consumed'
  | 'revoked';

export type CommandApprovalProjection =
  Readonly<{
    approvalId: string;
    accountId: string;
    taskId: string;
    destinationDeviceId: string;
    capabilities:
      readonly ComputerControlCapability[];
    scopeSummary: readonly string[];
    risk: CommandTaskRisk;
    mode: CommandApprovalMode;
    state: CommandApprovalState;
    createdAtMs: number;
    expiresAtMs: number;
    consumedAtMs: number | null;
    revision: number;
    grantsAuthority: false;
  }>;

const KEYS = new Set([
  'approvalId',
  'accountId',
  'taskId',
  'destinationDeviceId',
  'capabilities',
  'scopeSummary',
  'risk',
  'mode',
  'state',
  'createdAtMs',
  'expiresAtMs',
  'consumedAtMs',
  'revision',
  'grantsAuthority',
]);

const RISK =
  new Set([
    'low',
    'medium',
    'high',
    'critical',
  ]);

const MODE:
  readonly CommandApprovalMode[] = [
    'single_use',
    'task_lifetime',
  ];

const STATE:
  readonly CommandApprovalState[] = [
    'active',
    'consumed',
    'revoked',
  ];

function safeTime(
  value: unknown,
): value is number {
  return (
    Number.isSafeInteger(value)
    && (value as number) >= 0
  );
}

function safeSummary(
  value: unknown,
): readonly string[] | null {
  if (
    !Array.isArray(value)
    || value.length < 1
    || value.length > 32
    || value.some(
      (entry) =>
        typeof entry !== 'string'
        || entry.length < 1
        || entry.length > 240
        || /[\u0000-\u001F\u007F]/
          .test(entry),
    )
  ) {
    return null;
  }

  return Object.freeze([
    ...value,
  ]);
}

function capabilities(
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

export function parseCommandApprovalProjection(
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
): CommandApprovalProjection | null {
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
      'approval',
      record.approvalId,
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
    || typeof record.risk
      !== 'string'
    || !RISK.has(record.risk)
    || !MODE.includes(
      (record.mode as CommandApprovalMode),
    )
    || !STATE.includes(
      (record.state as CommandApprovalState),
    )
    || !safeTime(record.createdAtMs)
    || !safeTime(record.expiresAtMs)
    || record.expiresAtMs
      <= record.createdAtMs
    || (
      record.consumedAtMs !== null
      && !safeTime(
        record.consumedAtMs,
      )
    )
    || (
      record.state === 'consumed'
      && record.consumedAtMs
        === null
    )
    || (
      record.state !== 'consumed'
      && record.consumedAtMs
        !== null
    )
    || !safeTime(record.revision)
    || (
      record.risk === 'critical'
      && record.mode
        !== 'single_use'
    )
    || record.grantsAuthority
      !== false
  ) {
    return null;
  }

  const parsedCapabilities =
    capabilities(record.capabilities);
  const parsedScopeSummary =
    safeSummary(record.scopeSummary);

  if (
    !parsedCapabilities
    || !parsedScopeSummary
  ) {
    return null;
  }

  return Object.freeze({
    approvalId:
      record.approvalId,
    accountId:
      record.accountId,
    taskId:
      record.taskId,
    destinationDeviceId:
      record.destinationDeviceId,
    capabilities:
      parsedCapabilities,
    scopeSummary:
      parsedScopeSummary,
    risk:
      (record.risk as CommandTaskRisk),
    mode:
      (record.mode as CommandApprovalMode),
    state:
      (record.state as CommandApprovalState),
    createdAtMs:
      record.createdAtMs,
    expiresAtMs:
      record.expiresAtMs,
    consumedAtMs:
      (record.consumedAtMs as number | null),
    revision:
      record.revision,
    grantsAuthority: false,
  });
}
