import {
  ACCOUNT_ID,
  INTEGRATION_AUTOMATION_ID,
  INTEGRATION_POLICY_ID,
  INTEGRATION_ROUTINE_ID,
  WORKSPACE_ID,
  exactObject,
  safeInteger,
  safeLabel,
} from './integrationSecurity';

export type IntegrationAutomationTrigger =
  | 'schedule'
  | 'device_event'
  | 'external_event';

export type IntegrationAutomationState =
  | 'enabled'
  | 'paused'
  | 'revoked';

export type IntegrationAutomation =
  Readonly<{
    protocolVersion: '1.0';
    automationId: string;
    accountId: string;
    workspaceId: string;
    policyId: string;
    policyRevision: number;
    routineId: string;
    routineRevision: number;
    label: string;
    triggerKind:
      IntegrationAutomationTrigger;
    triggerRef: string;
    maxRunsPerHour: number;
    validFromMs: number;
    validUntilMs: number;
    revision: number;
    state: IntegrationAutomationState;
    updatedAtMs: number;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

const KEYS =
  new Set([
    'protocolVersion',
    'automationId',
    'accountId',
    'workspaceId',
    'policyId',
    'policyRevision',
    'routineId',
    'routineRevision',
    'label',
    'triggerKind',
    'triggerRef',
    'maxRunsPerHour',
    'validFromMs',
    'validUntilMs',
    'revision',
    'state',
    'updatedAtMs',
    'grantsExecutionAuthority',
    'grantsSensorAuthority',
    'grantsApprovalAuthority',
    'grantsCapabilityAuthority',
  ]);

const TRIGGERS =
  new Set<IntegrationAutomationTrigger>([
    'schedule',
    'device_event',
    'external_event',
  ]);

const STATES =
  new Set<IntegrationAutomationState>([
    'enabled',
    'paused',
    'revoked',
  ]);

export function parseIntegrationAutomation(
  input: unknown,
): IntegrationAutomation | null {
  const record =
    exactObject(input, KEYS);

  if (
    !record
    || record.protocolVersion !== '1.0'
    || typeof record.automationId
      !== 'string'
    || !INTEGRATION_AUTOMATION_ID.test(
      record.automationId,
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
    || typeof record.routineId !== 'string'
    || !INTEGRATION_ROUTINE_ID.test(
      record.routineId,
    )
    || !safeInteger(
      record.routineRevision,
    )
    || Number(record.routineRevision) < 1
    || !safeLabel(record.label)
    || typeof record.triggerKind
      !== 'string'
    || !TRIGGERS.has(
      record.triggerKind as
        IntegrationAutomationTrigger,
    )
    || !safeLabel(record.triggerRef, 120)
    || !safeInteger(
      record.maxRunsPerHour,
    )
    || Number(record.maxRunsPerHour) < 1
    || Number(record.maxRunsPerHour) > 360
    || !safeInteger(record.validFromMs)
    || !safeInteger(record.validUntilMs)
    || Number(record.validUntilMs)
      <= Number(record.validFromMs)
    || !safeInteger(record.revision)
    || Number(record.revision) < 1
    || typeof record.state !== 'string'
    || !STATES.has(
      record.state as
        IntegrationAutomationState,
    )
    || !safeInteger(record.updatedAtMs)
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
    automationId:
      record.automationId as string,
    accountId: record.accountId as string,
    workspaceId:
      record.workspaceId as string,
    policyId: record.policyId as string,
    policyRevision:
      record.policyRevision as number,
    routineId: record.routineId as string,
    routineRevision:
      record.routineRevision as number,
    label: record.label as string,
    triggerKind:
      record.triggerKind as
        IntegrationAutomationTrigger,
    triggerRef:
      record.triggerRef as string,
    maxRunsPerHour:
      record.maxRunsPerHour as number,
    validFromMs:
      record.validFromMs as number,
    validUntilMs:
      record.validUntilMs as number,
    revision: record.revision as number,
    state:
      record.state as
        IntegrationAutomationState,
    updatedAtMs:
      record.updatedAtMs as number,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}
