import {
  ACCOUNT_ID,
  INTEGRATION_BINDING_ID,
  INTEGRATION_DEVICE_ID,
  INTEGRATION_POLICY_ID,
  INTEGRATION_ROUTINE_ID,
  WORKSPACE_ID,
  exactObject,
  safeInteger,
  safeLabel,
} from './integrationSecurity';

import {
  isIntegrationCapabilityId,
  type IntegrationCapabilityId,
} from './integrationCapability';

import {
  commandValueValid,
  type IntegrationCommandValue,
} from './integrationCommand';

export type IntegrationRoutineState =
  | 'active'
  | 'revoked';

export type IntegrationRoutineAction =
  Readonly<{
    bindingId: string;
    bindingRevision: number;
    deviceId: string;
    capability: IntegrationCapabilityId;
    value: IntegrationCommandValue;
  }>;

export type IntegrationRoutine =
  Readonly<{
    protocolVersion: '1.0';
    routineId: string;
    accountId: string;
    workspaceId: string;
    policyId: string;
    policyRevision: number;
    label: string;
    revision: number;
    state: IntegrationRoutineState;
    actions:
      readonly IntegrationRoutineAction[];
    updatedAtMs: number;
    revokedAtMs: number | null;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

const ROUTINE_KEYS =
  new Set([
    'protocolVersion',
    'routineId',
    'accountId',
    'workspaceId',
    'policyId',
    'policyRevision',
    'label',
    'revision',
    'state',
    'actions',
    'updatedAtMs',
    'revokedAtMs',
    'grantsExecutionAuthority',
    'grantsSensorAuthority',
    'grantsApprovalAuthority',
    'grantsCapabilityAuthority',
  ]);

const ACTION_KEYS =
  new Set([
    'bindingId',
    'bindingRevision',
    'deviceId',
    'capability',
    'value',
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

export function parseIntegrationRoutineAction(
  input: unknown,
): IntegrationRoutineAction | null {
  const record =
    exactObject(input, ACTION_KEYS);
  const value =
    parseValue(record?.value);

  if (
    !record
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
  ) {
    return null;
  }

  return Object.freeze({
    bindingId: record.bindingId as string,
    bindingRevision:
      record.bindingRevision as number,
    deviceId: record.deviceId as string,
    capability:
      record.capability as
        IntegrationCapabilityId,
    value,
  });
}

export function parseIntegrationRoutine(
  input: unknown,
): IntegrationRoutine | null {
  const record =
    exactObject(input, ROUTINE_KEYS);

  if (
    !record
    || record.protocolVersion !== '1.0'
    || typeof record.routineId !== 'string'
    || !INTEGRATION_ROUTINE_ID.test(
      record.routineId,
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
    || !safeLabel(record.label)
    || !safeInteger(record.revision)
    || Number(record.revision) < 1
    || (
      record.state !== 'active'
      && record.state !== 'revoked'
    )
    || !Array.isArray(record.actions)
    || record.actions.length < 1
    || record.actions.length > 64
    || !safeInteger(record.updatedAtMs)
    || (
      record.revokedAtMs !== null
      && !safeInteger(record.revokedAtMs)
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
    routineId: record.routineId as string,
    accountId: record.accountId as string,
    workspaceId:
      record.workspaceId as string,
    policyId: record.policyId as string,
    policyRevision:
      record.policyRevision as number,
    label: record.label as string,
    revision: record.revision as number,
    state:
      record.state as
        IntegrationRoutineState,
    actions: Object.freeze(actions),
    updatedAtMs:
      record.updatedAtMs as number,
    revokedAtMs:
      record.revokedAtMs as number | null,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}
