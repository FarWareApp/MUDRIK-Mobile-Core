import {
  ACCOUNT_ID,
  INTEGRATION_ADAPTER_ID,
  INTEGRATION_DEVICE_ID,
  INTEGRATION_DISCOVERY_ID,
  INTEGRATION_ID,
  WORKSPACE_ID,
  exactObject,
  safeLabel,
  safeReference,
} from './integrationSecurity';

import {
  isIntegrationCapabilityId,
  type IntegrationCapabilityId,
} from './integrationCapability';

export type IntegrationDiscoveryRecord =
  Readonly<{
    protocolVersion: '1.0';
    discoveryId: string;
    accountId: string;
    workspaceId: string;
    adapterId: string;
    integrationId: string;
    externalDeviceRef: string;
    proposedDeviceId: string;
    label: string;
    vendorCapabilities:
      readonly string[];
    mappedCapabilities:
      readonly IntegrationCapabilityId[];
    observedAtMs: number;
    expiresAtMs: number;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

const KEYS =
  new Set([
    'protocolVersion',
    'discoveryId',
    'accountId',
    'workspaceId',
    'adapterId',
    'integrationId',
    'externalDeviceRef',
    'proposedDeviceId',
    'label',
    'vendorCapabilities',
    'mappedCapabilities',
    'observedAtMs',
    'expiresAtMs',
    'grantsExecutionAuthority',
    'grantsSensorAuthority',
    'grantsApprovalAuthority',
    'grantsCapabilityAuthority',
  ]);

function uniqueStrings(
  input: unknown,
  max: number,
): readonly string[] | null {
  if (
    !Array.isArray(input)
    || input.length > max
  ) {
    return null;
  }

  const output: string[] = [];
  const seen = new Set<string>();

  for (const item of input) {
    if (
      !safeReference(item, 120)
      || seen.has(item)
    ) {
      return null;
    }
    seen.add(item);
    output.push(item);
  }

  return Object.freeze(output);
}

export function parseIntegrationDiscoveryRecord(
  input: unknown,
): IntegrationDiscoveryRecord | null {
  const record =
    exactObject(input, KEYS);

  if (
    !record
    || record.protocolVersion !== '1.0'
    || typeof record.discoveryId !== 'string'
    || !INTEGRATION_DISCOVERY_ID.test(
      record.discoveryId,
    )
    || typeof record.accountId !== 'string'
    || !ACCOUNT_ID.test(record.accountId)
    || typeof record.workspaceId !== 'string'
    || !WORKSPACE_ID.test(
      record.workspaceId,
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
    || !safeReference(
      record.externalDeviceRef,
      160,
    )
    || typeof record.proposedDeviceId
      !== 'string'
    || !INTEGRATION_DEVICE_ID.test(
      record.proposedDeviceId,
    )
    || !safeLabel(record.label)
    || !Number.isSafeInteger(
      record.observedAtMs,
    )
    || Number(record.observedAtMs) < 0
    || !Number.isSafeInteger(
      record.expiresAtMs,
    )
    || Number(record.expiresAtMs)
      <= Number(record.observedAtMs)
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

  const vendorCapabilities =
    uniqueStrings(
      record.vendorCapabilities,
      64,
    );
  const mappedRaw =
    uniqueStrings(
      record.mappedCapabilities,
      32,
    );

  if (
    !vendorCapabilities
    || !mappedRaw
    || mappedRaw.some(
      (item) =>
        !isIntegrationCapabilityId(item),
    )
  ) {
    return null;
  }

  return Object.freeze({
    protocolVersion: '1.0',
    discoveryId:
      record.discoveryId as string,
    accountId:
      record.accountId as string,
    workspaceId:
      record.workspaceId as string,
    adapterId: record.adapterId as string,
    integrationId:
      record.integrationId as string,
    externalDeviceRef:
      record.externalDeviceRef as string,
    proposedDeviceId:
      record.proposedDeviceId as string,
    label: record.label as string,
    vendorCapabilities,
    mappedCapabilities:
      Object.freeze(
        mappedRaw as
          IntegrationCapabilityId[],
      ),
    observedAtMs:
      record.observedAtMs as number,
    expiresAtMs:
      record.expiresAtMs as number,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}
