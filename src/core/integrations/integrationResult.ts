import {
  INTEGRATION_ADAPTER_ID,
  INTEGRATION_BINDING_ID,
  INTEGRATION_COMMAND_ID,
  INTEGRATION_DEVICE_ID,
  INTEGRATION_ID,
  exactObject,
  safeInteger,
  safeReference,
} from './integrationSecurity';

export type IntegrationResultStatus =
  | 'succeeded'
  | 'failed';

export type IntegrationResultEnvelope =
  Readonly<{
    protocolVersion: '1.0';
    commandId: string;
    bindingId: string;
    deviceId: string;
    adapterId: string;
    integrationId: string;
    status: IntegrationResultStatus;
    reasonCode: string;
    resultRef: string | null;
    completedAtMs: number;
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
    'deviceId',
    'adapterId',
    'integrationId',
    'status',
    'reasonCode',
    'resultRef',
    'completedAtMs',
    'grantsExecutionAuthority',
    'grantsSensorAuthority',
    'grantsApprovalAuthority',
    'grantsCapabilityAuthority',
  ]);

const REASON =
  /^[a-z][a-z0-9_-]{0,95}$/;

export function parseIntegrationResultEnvelope(
  input: unknown,
): IntegrationResultEnvelope | null {
  const record =
    exactObject(input, KEYS);

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
    || (
      record.status !== 'succeeded'
      && record.status !== 'failed'
    )
    || typeof record.reasonCode !== 'string'
    || !REASON.test(record.reasonCode)
    || (
      record.resultRef !== null
      && !safeReference(
        record.resultRef,
        240,
      )
    )
    || !safeInteger(record.completedAtMs)
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
    deviceId: record.deviceId as string,
    adapterId: record.adapterId as string,
    integrationId:
      record.integrationId as string,
    status:
      record.status as
        IntegrationResultStatus,
    reasonCode:
      record.reasonCode as string,
    resultRef:
      record.resultRef as string | null,
    completedAtMs:
      record.completedAtMs as number,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}
