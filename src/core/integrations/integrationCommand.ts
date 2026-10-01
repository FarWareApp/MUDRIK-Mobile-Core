import {
  ACCOUNT_ID,
  INTEGRATION_AUTOMATION_EXECUTION_ID,
  INTEGRATION_BINDING_ID,
  INTEGRATION_COMMAND_ID,
  INTEGRATION_DEVICE_ID,
  INTEGRATION_POLICY_ID,
  WORKSPACE_ID,
  exactObject,
  safeInteger,
  safeLabel,
} from './integrationSecurity';

import {
  isIntegrationCapabilityId,
  type IntegrationCapabilityId,
} from './integrationCapability';

export type IntegrationCommandMode =
  | 'instant'
  | 'approved'
  | 'automation'
  | 'specialized';

export type IntegrationCommandValue =
  string | number | boolean | null;

export type IntegrationCommand =
  Readonly<{
    protocolVersion: '1.0';
    commandId: string;
    accountId: string;
    workspaceId: string;
    policyId: string;
    policyRevision: number;
    bindingId: string;
    bindingRevision: number;
    deviceId: string;
    capability: IntegrationCapabilityId;
    value: IntegrationCommandValue;
    mode: IntegrationCommandMode;
    automationExecutionId:
      string | null;
    automationActionIndex:
      number | null;
    requestedAtMs: number;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

const MODES =
  new Set<IntegrationCommandMode>([
    'instant',
    'approved',
    'automation',
    'specialized',
  ]);

const KEYS =
  new Set([
    'protocolVersion',
    'commandId',
    'accountId',
    'workspaceId',
    'policyId',
    'policyRevision',
    'bindingId',
    'bindingRevision',
    'deviceId',
    'capability',
    'value',
    'mode',
    'automationExecutionId',
    'automationActionIndex',
    'requestedAtMs',
    'grantsExecutionAuthority',
    'grantsSensorAuthority',
    'grantsApprovalAuthority',
    'grantsCapabilityAuthority',
  ]);

function parseValue(
  value: unknown,
): IntegrationCommandValue | undefined {
  if (value === null) {
    return null;
  }

  if (
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (
    typeof value === 'number'
    && Number.isSafeInteger(value)
    && Math.abs(value) <= 1_000_000
  ) {
    return value;
  }

  if (
    typeof value === 'string'
    && safeLabel(value, 80)
  ) {
    return value;
  }

  return undefined;
}

export function commandValueValid(
  capability: IntegrationCapabilityId,
  value: IntegrationCommandValue,
): boolean {
  switch (capability) {
    case 'state.read':
    case 'access.lock':
    case 'access.unlock':
    case 'access.open':
    case 'security.arm':
    case 'security.disarm':
    case 'camera.observe':
    case 'microphone.listen':
    case 'commerce.purchase':
      return value === null;
    case 'power.set':
      return typeof value === 'boolean';
    case 'level.set':
      return (
        typeof value === 'number'
        && value >= 0
        && value <= 1000
      );
    case 'thermostat.set':
      return (
        typeof value === 'number'
        && value >= 5000
        && value <= 40000
      );
    case 'color.set':
      return (
        typeof value === 'string'
        && /^#[A-Fa-f0-9]{6}$/.test(value)
      );
    case 'media.control':
      return (
        typeof value === 'string'
        && [
          'play',
          'pause',
          'next',
          'previous',
          'stop',
        ].includes(value)
      );
  }
}

export function parseIntegrationCommand(
  input: unknown,
): IntegrationCommand | null {
  const record =
    exactObject(input, KEYS);
  const value =
    parseValue(record?.value);

  if (
    !record
    || record.protocolVersion !== '1.0'
    || typeof record.commandId !== 'string'
    || !INTEGRATION_COMMAND_ID.test(
      record.commandId,
    )
    || typeof record.accountId !== 'string'
    || !ACCOUNT_ID.test(record.accountId)
    || typeof record.workspaceId !== 'string'
    || !WORKSPACE_ID.test(
      record.workspaceId,
    )
    || typeof record.policyId !== 'string'
    || !INTEGRATION_POLICY_ID.test(
      record.policyId,
    )
    || !safeInteger(record.policyRevision)
    || Number(record.policyRevision) < 1
    || typeof record.bindingId !== 'string'
    || !INTEGRATION_BINDING_ID.test(
      record.bindingId,
    )
    || !safeInteger(
      record.bindingRevision,
    )
    || Number(record.bindingRevision) < 1
    || typeof record.deviceId !== 'string'
    || !INTEGRATION_DEVICE_ID.test(
      record.deviceId,
    )
    || !isIntegrationCapabilityId(
      record.capability,
    )
    || value === undefined
    || !commandValueValid(
      record.capability,
      value,
    )
    || typeof record.mode !== 'string'
    || !MODES.has(
      record.mode as
        IntegrationCommandMode,
    )
    || (
      record.mode === 'automation'
      ? (
          typeof record.automationExecutionId
            !== 'string'
          || !INTEGRATION_AUTOMATION_EXECUTION_ID.test(
            record.automationExecutionId,
          )
          || !safeInteger(
            record.automationActionIndex,
          )
          || Number(
            record.automationActionIndex,
          ) > 63
        )
      : (
          record.automationExecutionId
            !== null
          || record.automationActionIndex
            !== null
        )
    )
    || !safeInteger(record.requestedAtMs)
    || record.grantsExecutionAuthority
      !== false
    || record.grantsSensorAuthority
      !== false
    || record.grantsApprovalAuthority
      !== false
    || record.grantsCapabilityAuthority
      !== false
  ) {
    return null;
  }

  return Object.freeze({
    protocolVersion: '1.0',
    commandId: record.commandId as string,
    accountId: record.accountId as string,
    workspaceId:
      record.workspaceId as string,
    policyId: record.policyId as string,
    policyRevision:
      record.policyRevision as number,
    bindingId: record.bindingId as string,
    bindingRevision:
      record.bindingRevision as number,
    deviceId: record.deviceId as string,
    capability:
      record.capability as
        IntegrationCapabilityId,
    value,
    mode:
      record.mode as
        IntegrationCommandMode,
    automationExecutionId:
      record.automationExecutionId as
        string | null,
    automationActionIndex:
      record.automationActionIndex as
        number | null,
    requestedAtMs:
      record.requestedAtMs as number,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}
