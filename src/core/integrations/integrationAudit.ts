import {
  ACCOUNT_ID,
  INTEGRATION_AUTOMATION_ID,
  INTEGRATION_BINDING_ID,
  INTEGRATION_COMMAND_ID,
  INTEGRATION_EVENT_ID,
  INTEGRATION_ROUTINE_ID,
  WORKSPACE_ID,
  exactObject,
  safeInteger,
} from './integrationSecurity';

import {
  isIntegrationCapabilityId,
  type IntegrationCapabilityId,
} from './integrationCapability';

export type IntegrationAuditKind =
  | 'discovery_recorded'
  | 'binding_admitted'
  | 'binding_revoked'
  | 'command_authorized'
  | 'command_denied'
  | 'routine_updated'
  | 'automation_updated'
  | 'automation_triggered'
  | 'result_received';

export type IntegrationAuditEvent =
  Readonly<{
    protocolVersion: '1.0';
    eventId: string;
    kind: IntegrationAuditKind;
    accountId: string;
    workspaceId: string;
    bindingId: string | null;
    commandId: string | null;
    routineId: string | null;
    automationId: string | null;
    capability:
      IntegrationCapabilityId | null;
    reasonCode: string;
    occurredAtMs: number;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

const KEYS =
  new Set([
    'protocolVersion',
    'eventId',
    'kind',
    'accountId',
    'workspaceId',
    'bindingId',
    'commandId',
    'routineId',
    'automationId',
    'capability',
    'reasonCode',
    'occurredAtMs',
    'grantsExecutionAuthority',
    'grantsSensorAuthority',
    'grantsApprovalAuthority',
    'grantsCapabilityAuthority',
  ]);

const KINDS =
  new Set<IntegrationAuditKind>([
    'discovery_recorded',
    'binding_admitted',
    'binding_revoked',
    'command_authorized',
    'command_denied',
    'routine_updated',
    'automation_updated',
    'automation_triggered',
    'result_received',
  ]);

const REASON =
  /^[a-z][a-z0-9_-]{0,95}$/;

function optionalId(
  value: unknown,
  pattern: RegExp,
): string | null | undefined {
  if (value === null) return null;
  return (
    typeof value === 'string'
    && pattern.test(value)
  )
    ? value
    : undefined;
}

export function parseIntegrationAuditEvent(
  input: unknown,
): IntegrationAuditEvent | null {
  const record =
    exactObject(input, KEYS);

  if (
    !record
    || record.protocolVersion !== '1.0'
    || typeof record.eventId !== 'string'
    || !INTEGRATION_EVENT_ID.test(
      record.eventId,
    )
    || typeof record.kind !== 'string'
    || !KINDS.has(
      record.kind as IntegrationAuditKind,
    )
    || typeof record.accountId !== 'string'
    || !ACCOUNT_ID.test(record.accountId)
    || typeof record.workspaceId !== 'string'
    || !WORKSPACE_ID.test(
      record.workspaceId,
    )
    || typeof record.reasonCode !== 'string'
    || !REASON.test(record.reasonCode)
    || !safeInteger(record.occurredAtMs)
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

  const bindingId =
    optionalId(
      record.bindingId,
      INTEGRATION_BINDING_ID,
    );
  const commandId =
    optionalId(
      record.commandId,
      INTEGRATION_COMMAND_ID,
    );
  const routineId =
    optionalId(
      record.routineId,
      INTEGRATION_ROUTINE_ID,
    );
  const automationId =
    optionalId(
      record.automationId,
      INTEGRATION_AUTOMATION_ID,
    );
  const capability =
    record.capability === null
      ? null
      : isIntegrationCapabilityId(
          record.capability,
        )
        ? record.capability
        : undefined;

  if (
    bindingId === undefined
    || commandId === undefined
    || routineId === undefined
    || automationId === undefined
    || capability === undefined
  ) {
    return null;
  }

  return Object.freeze({
    protocolVersion: '1.0',
    eventId: record.eventId as string,
    kind:
      record.kind as IntegrationAuditKind,
    accountId: record.accountId as string,
    workspaceId:
      record.workspaceId as string,
    bindingId,
    commandId,
    routineId,
    automationId,
    capability,
    reasonCode:
      record.reasonCode as string,
    occurredAtMs:
      record.occurredAtMs as number,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}
