import {
  ACCOUNT_ID,
  INTEGRATION_AUTOMATION_EXECUTION_ID,
  INTEGRATION_AUTOMATION_ID,
  INTEGRATION_POLICY_ID,
  INTEGRATION_ROUTINE_ID,
  INTEGRATION_TRIGGER_EVENT_ID,
  WORKSPACE_ID,
  exactObject,
  safeInteger,
} from './integrationSecurity';

import {
  parseIntegrationRoutineAction,
  type IntegrationRoutineAction,
  type IntegrationRoutine,
} from './integrationRoutine';

import type {
  IntegrationAutomation,
} from './integrationAutomation';

export type IntegrationAutomationExecution =
  Readonly<{
    protocolVersion: '1.0';
    executionId: string;
    eventId: string;
    accountId: string;
    workspaceId: string;
    policyId: string;
    policyRevision: number;
    automationId: string;
    automationRevision: number;
    routineId: string;
    routineRevision: number;
    actions:
      readonly IntegrationRoutineAction[];
    authorizedAtMs: number;
    expiresAtMs: number;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

const KEYS =
  new Set([
    'protocolVersion',
    'executionId',
    'eventId',
    'accountId',
    'workspaceId',
    'policyId',
    'policyRevision',
    'automationId',
    'automationRevision',
    'routineId',
    'routineRevision',
    'actions',
    'authorizedAtMs',
    'expiresAtMs',
    'grantsExecutionAuthority',
    'grantsSensorAuthority',
    'grantsApprovalAuthority',
    'grantsCapabilityAuthority',
  ]);

export function parseIntegrationAutomationExecution(
  input: unknown,
): IntegrationAutomationExecution | null {
  const record =
    exactObject(input, KEYS);

  if (
    !record
    || record.protocolVersion !== '1.0'
    || typeof record.executionId !== 'string'
    || !INTEGRATION_AUTOMATION_EXECUTION_ID.test(
      record.executionId,
    )
    || typeof record.eventId !== 'string'
    || !INTEGRATION_TRIGGER_EVENT_ID.test(
      record.eventId,
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
    || typeof record.automationId
      !== 'string'
    || !INTEGRATION_AUTOMATION_ID.test(
      record.automationId,
    )
    || !safeInteger(
      record.automationRevision,
    )
    || Number(record.automationRevision) < 1
    || typeof record.routineId !== 'string'
    || !INTEGRATION_ROUTINE_ID.test(
      record.routineId,
    )
    || !safeInteger(record.routineRevision)
    || Number(record.routineRevision) < 1
    || !Array.isArray(record.actions)
    || record.actions.length < 1
    || record.actions.length > 64
    || !safeInteger(record.authorizedAtMs)
    || !safeInteger(record.expiresAtMs)
    || Number(record.expiresAtMs)
      <= Number(record.authorizedAtMs)
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

  const actions:
    IntegrationRoutineAction[] = [];

  for (const inputAction of record.actions) {
    const action =
      parseIntegrationRoutineAction(
        inputAction,
      );

    if (!action) {
      return null;
    }

    actions.push(action);
  }

  return Object.freeze({
    protocolVersion: '1.0',
    executionId:
      record.executionId as string,
    eventId: record.eventId as string,
    accountId: record.accountId as string,
    workspaceId:
      record.workspaceId as string,
    policyId: record.policyId as string,
    policyRevision:
      record.policyRevision as number,
    automationId:
      record.automationId as string,
    automationRevision:
      record.automationRevision as number,
    routineId: record.routineId as string,
    routineRevision:
      record.routineRevision as number,
    actions: Object.freeze(actions),
    authorizedAtMs:
      record.authorizedAtMs as number,
    expiresAtMs:
      record.expiresAtMs as number,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}

export function createIntegrationAutomationExecution(
  automation: IntegrationAutomation,
  routine: IntegrationRoutine,
  eventId: string,
  trustedNowMs: number,
): IntegrationAutomationExecution | null {
  if (
    !INTEGRATION_TRIGGER_EVENT_ID.test(
      eventId,
    )
    || !safeInteger(trustedNowMs)
    || automation.accountId
      !== routine.accountId
    || automation.workspaceId
      !== routine.workspaceId
    || automation.policyId
      !== routine.policyId
    || automation.policyRevision
      !== routine.policyRevision
    || automation.routineId
      !== routine.routineId
    || automation.routineRevision
      !== routine.revision
    || automation.state !== 'enabled'
    || routine.state !== 'active'
    || trustedNowMs
      < automation.validFromMs
    || trustedNowMs
      >= automation.validUntilMs
  ) {
    return null;
  }

  const body =
    eventId.replace(
      /^itrigger_/,
      '',
    );
  const expiresAtMs =
    Math.min(
      automation.validUntilMs,
      trustedNowMs + 5 * 60 * 1000,
    );

  return Object.freeze({
    protocolVersion: '1.0',
    executionId:
      'iautoexec_' + body,
    eventId,
    accountId: automation.accountId,
    workspaceId:
      automation.workspaceId,
    policyId: automation.policyId,
    policyRevision:
      automation.policyRevision,
    automationId:
      automation.automationId,
    automationRevision:
      automation.revision,
    routineId: routine.routineId,
    routineRevision: routine.revision,
    actions: Object.freeze([
      ...routine.actions,
    ]),
    authorizedAtMs: trustedNowMs,
    expiresAtMs,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}
