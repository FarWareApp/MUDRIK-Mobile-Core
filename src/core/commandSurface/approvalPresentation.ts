import type {
  CommandApprovalProjection,
} from './approvalProjection';

import type {
  CommandDeviceProjection,
} from './deviceProjection';

import type {
  CommandTextDirection,
} from './surfaceControls';

export type CommandApprovalRequestPresentation =
  Readonly<{
    approvalId: string;
    taskId: string;
    destinationDeviceId: string;
    deviceDisplayName: string;
    capabilityLabelKeys:
      readonly string[];
    scopeSummary:
      readonly string[];
    riskLabelKey: string;
    modeLabelKey: string;
    expiresAtMs: number;
    decisionAvailable: boolean;
    direction:
      CommandTextDirection;
    minTouchTargetDp: 48;
    screenReaderGroupLabelKey:
      'command.approval.group';
    grantsAuthority: false;
  }>;

export function buildApprovalRequestPresentation(
  approval:
    CommandApprovalProjection,
  device:
    CommandDeviceProjection,
  direction:
    CommandTextDirection,
): CommandApprovalRequestPresentation | null {
  if (
    ![
      'ltr',
      'rtl',
    ].includes(direction)
    || approval.accountId
      !== device.accountId
    || approval.destinationDeviceId
      !== device.deviceId
  ) {
    return null;
  }

  const capabilityLabelKeys =
    approval.capabilities.map(
      (capability) =>
        'capability.'
        + capability,
    );

  return Object.freeze({
    approvalId:
      approval.approvalId,
    taskId:
      approval.taskId,
    destinationDeviceId:
      approval.destinationDeviceId,
    deviceDisplayName:
      device.displayName,
    capabilityLabelKeys:
      Object.freeze(
        capabilityLabelKeys,
      ),
    scopeSummary:
      Object.freeze([
        ...approval.scopeSummary,
      ]),
    riskLabelKey:
      'risk.' + approval.risk,
    modeLabelKey:
      'approval.mode.'
      + approval.mode,
    expiresAtMs:
      approval.expiresAtMs,
    decisionAvailable:
      approval.state === 'active',
    direction,
    minTouchTargetDp: 48,
    screenReaderGroupLabelKey:
      'command.approval.group',
    grantsAuthority: false,
  });
}
