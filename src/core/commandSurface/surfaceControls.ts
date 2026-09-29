import type {
  CommandApprovalDecisionIntent,
  CommandTaskControlIntent,
} from './controlIntent';

import type {
  CommandTaskProjection,
} from './taskProjection';

export type CommandTextDirection =
  | 'ltr'
  | 'rtl';

export type CommandControlSemantic =
  | 'primary'
  | 'secondary'
  | 'destructive'
  | 'approval'
  | 'rejection';

export type CommandSurfaceControlPresentation =
  Readonly<{
    actionIdentity: string;
    labelKey: string;
    semantic:
      CommandControlSemantic;
    taskId: string;
    destinationDeviceId: string;
    approvalId: string | null;
    expectedRevision: number;
    direction:
      CommandTextDirection;
    minTouchTargetDp: number;
    keyboardReachable: true;
    screenReaderRole: 'button';
    immediateReachable: boolean;
    grantsAuthority: false;
  }>;

const ACTIVE_CANCELLABLE =
  new Set([
    'received',
    'authenticated',
    'awaiting_approval',
    'authorized',
    'queued',
    'delivered',
    'acknowledged',
    'running',
    'blocked',
  ]);

function safeDirection(
  value: unknown,
): value is CommandTextDirection {
  return (
    value === 'ltr'
    || value === 'rtl'
  );
}

function controlIdentity(
  intent:
    CommandTaskControlIntent,
): string {
  return [
    'task',
    intent.taskId,
    intent.destinationDeviceId,
    String(intent.expectedRevision),
    intent.action,
  ].join(':');
}

export function buildTaskControlPresentation(
  intent:
    CommandTaskControlIntent,
  task:
    CommandTaskProjection,
  direction:
    CommandTextDirection,
): CommandSurfaceControlPresentation | null {
  if (
    !safeDirection(direction)
    || intent.accountId
      !== task.accountId
    || intent.taskId
      !== task.taskId
    || intent.destinationDeviceId
      !== task.destinationDeviceId
    || intent.expectedRevision
      !== task.revision
  ) {
    return null;
  }

  if (
    intent.action === 'cancel'
    && !ACTIVE_CANCELLABLE.has(
      task.state,
    )
  ) {
    return null;
  }

  if (
    intent.action === 'pause'
    && task.state !== 'running'
  ) {
    return null;
  }

  if (
    intent.action === 'resume'
    && ![
      'blocked',
      'acknowledged',
    ].includes(task.state)
  ) {
    return null;
  }

  return Object.freeze({
    actionIdentity:
      controlIdentity(intent),
    labelKey:
      'command.task.'
      + intent.action,
    semantic:
      intent.action === 'cancel'
        ? 'destructive'
        : intent.action === 'resume'
          ? 'primary'
          : 'secondary',
    taskId: intent.taskId,
    destinationDeviceId:
      intent.destinationDeviceId,
    approvalId: null,
    expectedRevision:
      intent.expectedRevision,
    direction,
    minTouchTargetDp: 48,
    keyboardReachable: true,
    screenReaderRole: 'button',
    immediateReachable:
      intent.action === 'cancel',
    grantsAuthority: false,
  });
}

function approvalIdentity(
  intent:
    CommandApprovalDecisionIntent,
): string {
  return [
    'approval',
    intent.approvalId,
    intent.taskId,
    intent.destinationDeviceId,
    String(
      intent.expectedApprovalRevision,
    ),
    intent.decision,
  ].join(':');
}

export function buildApprovalDecisionPresentation(
  intent:
    CommandApprovalDecisionIntent,
  direction:
    CommandTextDirection,
): CommandSurfaceControlPresentation | null {
  if (!safeDirection(direction)) {
    return null;
  }

  return Object.freeze({
    actionIdentity:
      approvalIdentity(intent),
    labelKey:
      'command.approval.'
      + intent.decision,
    semantic:
      intent.decision === 'approve'
        ? 'approval'
        : 'rejection',
    taskId: intent.taskId,
    destinationDeviceId:
      intent.destinationDeviceId,
    approvalId:
      intent.approvalId,
    expectedRevision:
      intent.expectedApprovalRevision,
    direction,
    minTouchTargetDp: 48,
    keyboardReachable: true,
    screenReaderRole: 'button',
    immediateReachable: true,
    grantsAuthority: false,
  });
}
