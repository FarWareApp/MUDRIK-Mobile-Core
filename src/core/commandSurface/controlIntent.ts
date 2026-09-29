import {
  isCommandSurfaceId,
} from './surfaceIds';

export type CommandTaskControlAction =
  | 'pause'
  | 'resume'
  | 'cancel';

export type CommandTaskControlIntent =
  Readonly<{
    protocolVersion: '1.0';
    accountId: string;
    taskId: string;
    destinationDeviceId: string;
    expectedRevision: number;
    action: CommandTaskControlAction;
    issuedAtMs: number;
    grantsAuthority: false;
  }>;

export type CommandApprovalDecisionIntent =
  Readonly<{
    protocolVersion: '1.0';
    accountId: string;
    approvalId: string;
    taskId: string;
    destinationDeviceId: string;
    expectedApprovalRevision: number;
    decision: 'approve' | 'reject';
    issuedAtMs: number;
    grantsAuthority: false;
  }>;

const CONTROL_KEYS = new Set([
  'protocolVersion',
  'accountId',
  'taskId',
  'destinationDeviceId',
  'expectedRevision',
  'action',
  'issuedAtMs',
  'grantsAuthority',
]);

const APPROVAL_KEYS = new Set([
  'protocolVersion',
  'accountId',
  'approvalId',
  'taskId',
  'destinationDeviceId',
  'expectedApprovalRevision',
  'decision',
  'issuedAtMs',
  'grantsAuthority',
]);

function safeTime(
  value: unknown,
): value is number {
  return (
    Number.isSafeInteger(value)
    && (value as number) >= 0
  );
}

function exactObject(
  input: unknown,
  keys: ReadonlySet<string>,
): Record<string, unknown> | null {
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
      !== keys.size
    || Object.keys(record).some(
      (key) => !keys.has(key),
    )
  ) {
    return null;
  }

  return record;
}

export function parseCommandTaskControlIntent(
  input: unknown,
): CommandTaskControlIntent | null {
  const record =
    exactObject(
      input,
      CONTROL_KEYS,
    );

  if (
    !record
    || record.protocolVersion
      !== '1.0'
    || !isCommandSurfaceId(
      'account',
      record.accountId,
    )
    || !isCommandSurfaceId(
      'task',
      record.taskId,
    )
    || !isCommandSurfaceId(
      'device',
      record.destinationDeviceId,
    )
    || !safeTime(
      record.expectedRevision,
    )
    || ![
      'pause',
      'resume',
      'cancel',
    ].includes(
      record.action as string,
    )
    || !safeTime(record.issuedAtMs)
    || record.grantsAuthority
      !== false
  ) {
    return null;
  }

  return Object.freeze({
    protocolVersion: '1.0',
    accountId:
      record.accountId,
    taskId:
      record.taskId,
    destinationDeviceId:
      record.destinationDeviceId,
    expectedRevision:
      record.expectedRevision,
    action:
      (record.action as CommandTaskControlAction),
    issuedAtMs:
      record.issuedAtMs,
    grantsAuthority: false,
  });
}

export function parseCommandApprovalDecisionIntent(
  input: unknown,
): CommandApprovalDecisionIntent | null {
  const record =
    exactObject(
      input,
      APPROVAL_KEYS,
    );

  if (
    !record
    || record.protocolVersion
      !== '1.0'
    || !isCommandSurfaceId(
      'account',
      record.accountId,
    )
    || !isCommandSurfaceId(
      'approval',
      record.approvalId,
    )
    || !isCommandSurfaceId(
      'task',
      record.taskId,
    )
    || !isCommandSurfaceId(
      'device',
      record.destinationDeviceId,
    )
    || !safeTime(
      record.expectedApprovalRevision,
    )
    || ![
      'approve',
      'reject',
    ].includes(
      record.decision as string,
    )
    || !safeTime(record.issuedAtMs)
    || record.grantsAuthority
      !== false
  ) {
    return null;
  }

  return Object.freeze({
    protocolVersion: '1.0',
    accountId:
      record.accountId,
    approvalId:
      record.approvalId,
    taskId:
      record.taskId,
    destinationDeviceId:
      record.destinationDeviceId,
    expectedApprovalRevision:
      record.expectedApprovalRevision,
    decision:
      (record.decision as 'approve' | 'reject'),
    issuedAtMs:
      record.issuedAtMs,
    grantsAuthority: false,
  });
}
