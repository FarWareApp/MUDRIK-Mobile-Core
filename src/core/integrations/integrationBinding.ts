import {
  ACCOUNT_ID,
  INTEGRATION_ADAPTER_ID,
  INTEGRATION_BINDING_ID,
  INTEGRATION_DEVICE_ID,
  INTEGRATION_ID,
  WORKSPACE_ID,
  exactObject,
  safeInteger,
  safeLabel,
  safeReference,
} from './integrationSecurity';

import {
  isIntegrationCapabilityId,
  type IntegrationCapabilityId,
} from './integrationCapability';

export type IntegrationBindingState =
  | 'active'
  | 'revoked';

export type IntegrationDeviceBinding =
  Readonly<{
    protocolVersion: '1.0';
    bindingId: string;
    accountId: string;
    workspaceId: string;
    integrationId: string;
    adapterId: string;
    deviceId: string;
    externalDeviceRef: string;
    capabilities:
      readonly IntegrationCapabilityId[];
    alias: string | null;
    room: string | null;
    revision: number;
    state: IntegrationBindingState;
    admittedAtMs: number;
    revokedAtMs: number | null;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

const KEYS =
  new Set([
    'protocolVersion',
    'bindingId',
    'accountId',
    'workspaceId',
    'integrationId',
    'adapterId',
    'deviceId',
    'externalDeviceRef',
    'capabilities',
    'alias',
    'room',
    'revision',
    'state',
    'admittedAtMs',
    'revokedAtMs',
    'grantsExecutionAuthority',
    'grantsSensorAuthority',
    'grantsApprovalAuthority',
    'grantsCapabilityAuthority',
  ]);

function parseCapabilities(
  input: unknown,
): readonly IntegrationCapabilityId[] | null {
  if (
    !Array.isArray(input)
    || input.length < 1
    || input.length > 32
  ) {
    return null;
  }

  const output:
    IntegrationCapabilityId[] = [];
  const seen = new Set<string>();

  for (const item of input) {
    if (
      !isIntegrationCapabilityId(item)
      || seen.has(item)
    ) {
      return null;
    }

    seen.add(item);
    output.push(item);
  }

  return Object.freeze(output);
}

function optionalLabel(
  input: unknown,
): string | null | undefined {
  if (input === null) {
    return null;
  }

  return safeLabel(input)
    ? input
    : undefined;
}

export function parseIntegrationDeviceBinding(
  input: unknown,
): IntegrationDeviceBinding | null {
  const record =
    exactObject(input, KEYS);

  if (
    !record
    || record.protocolVersion !== '1.0'
    || typeof record.bindingId !== 'string'
    || !INTEGRATION_BINDING_ID.test(
      record.bindingId,
    )
    || typeof record.accountId !== 'string'
    || !ACCOUNT_ID.test(record.accountId)
    || typeof record.workspaceId !== 'string'
    || !WORKSPACE_ID.test(
      record.workspaceId,
    )
    || typeof record.integrationId
      !== 'string'
    || !INTEGRATION_ID.test(
      record.integrationId,
    )
    || typeof record.adapterId !== 'string'
    || !INTEGRATION_ADAPTER_ID.test(
      record.adapterId,
    )
    || typeof record.deviceId !== 'string'
    || !INTEGRATION_DEVICE_ID.test(
      record.deviceId,
    )
    || !safeReference(
      record.externalDeviceRef,
      160,
    )
    || !safeInteger(record.revision)
    || Number(record.revision) < 1
    || (
      record.state !== 'active'
      && record.state !== 'revoked'
    )
    || !safeInteger(record.admittedAtMs)
    || (
      record.revokedAtMs !== null
      && (
        !safeInteger(record.revokedAtMs)
        || Number(record.revokedAtMs)
          < Number(record.admittedAtMs)
      )
    )
    || (
      record.state === 'active'
      && record.revokedAtMs !== null
    )
    || (
      record.state === 'revoked'
      && record.revokedAtMs === null
    )
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

  const capabilities =
    parseCapabilities(
      record.capabilities,
    );
  const alias =
    optionalLabel(record.alias);
  const room =
    optionalLabel(record.room);

  if (
    !capabilities
    || alias === undefined
    || room === undefined
  ) {
    return null;
  }

  return Object.freeze({
    protocolVersion: '1.0',
    bindingId: record.bindingId as string,
    accountId: record.accountId as string,
    workspaceId:
      record.workspaceId as string,
    integrationId:
      record.integrationId as string,
    adapterId: record.adapterId as string,
    deviceId: record.deviceId as string,
    externalDeviceRef:
      record.externalDeviceRef as string,
    capabilities,
    alias,
    room,
    revision: record.revision as number,
    state:
      record.state as
        IntegrationBindingState,
    admittedAtMs:
      record.admittedAtMs as number,
    revokedAtMs:
      record.revokedAtMs as number | null,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}
