import {
  INTEGRATION_ADAPTER_ID,
  INTEGRATION_BINDING_ID,
  INTEGRATION_COMMAND_ID,
  INTEGRATION_DEVICE_ID,
  INTEGRATION_ID,
  exactObject,
  safeInteger,
} from './integrationSecurity';

import {
  isIntegrationCapabilityId,
  type IntegrationCapabilityId,
} from './integrationCapability';

import {
  commandValueValid,
  type IntegrationCommandValue,
} from './integrationCommand';

export type IntegrationAdapterInvocation =
  Readonly<{
    protocolVersion: '1.0';
    commandId: string;
    bindingId: string;
    bindingRevision: number;
    deviceId: string;
    adapterId: string;
    integrationId: string;
    capability: IntegrationCapabilityId;
    value: IntegrationCommandValue;
    issuedAtMs: number;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

const KEYS =
  new Set([
    'protocolVersion',
    'commandId',
    'bindingId',
    'bindingRevision',
    'deviceId',
    'adapterId',
    'integrationId',
    'capability',
    'value',
    'issuedAtMs',
    'grantsExecutionAuthority',
    'grantsSensorAuthority',
    'grantsApprovalAuthority',
    'grantsCapabilityAuthority',
  ]);

function parseValue(
  value: unknown,
): IntegrationCommandValue | undefined {
  if (value === null) return null;
  if (typeof value === 'boolean') {
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
    && value.length >= 1
    && value.length <= 80
    && !/[\u0000-\u001F\u007F]/.test(
      value,
    )
  ) {
    return value;
  }
  return undefined;
}

export function parseIntegrationAdapterInvocation(
  input: unknown,
): IntegrationAdapterInvocation | null {
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
    || typeof record.bindingId !== 'string'
    || !INTEGRATION_BINDING_ID.test(
      record.bindingId,
    )
    || !safeInteger(record.bindingRevision)
    || Number(record.bindingRevision) < 1
    || typeof record.deviceId !== 'string'
    || !INTEGRATION_DEVICE_ID.test(
      record.deviceId,
    )
    || typeof record.adapterId !== 'string'
    || !INTEGRATION_ADAPTER_ID.test(
      record.adapterId,
    )
    || typeof record.integrationId
      !== 'string'
    || !INTEGRATION_ID.test(
      record.integrationId,
    )
    || !isIntegrationCapabilityId(
      record.capability,
    )
    || value === undefined
    || !commandValueValid(
      record.capability,
      value,
    )
    || !safeInteger(record.issuedAtMs)
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
    bindingId: record.bindingId as string,
    bindingRevision:
      record.bindingRevision as number,
    deviceId: record.deviceId as string,
    adapterId: record.adapterId as string,
    integrationId:
      record.integrationId as string,
    capability:
      record.capability as
        IntegrationCapabilityId,
    value,
    issuedAtMs:
      record.issuedAtMs as number,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}
