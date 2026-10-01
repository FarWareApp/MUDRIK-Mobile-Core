import {
  ACCOUNT_ID,
  INTEGRATION_POLICY_ID,
  WORKSPACE_ID,
  exactObject,
  safeInteger,
} from './integrationSecurity';

import {
  isIntegrationCapabilityId,
  type IntegrationCapabilityId,
  type IntegrationRisk,
} from './integrationCapability';

export type IntegrationPolicy =
  Readonly<{
    protocolVersion: '1.0';
    policyId: string;
    accountId: string;
    workspaceId: string;
    enabled: boolean;
    allowedCapabilities:
      readonly IntegrationCapabilityId[];
    instantMaxRisk:
      'read_only' | 'low' | 'medium';
    automationAllowedCapabilities:
      readonly IntegrationCapabilityId[];
    maxRoutineActions: number;
    maxAutomationRunsPerHour: number;
    revision: number;
    updatedAtMs: number;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

const KEYS =
  new Set([
    'protocolVersion',
    'policyId',
    'accountId',
    'workspaceId',
    'enabled',
    'allowedCapabilities',
    'instantMaxRisk',
    'automationAllowedCapabilities',
    'maxRoutineActions',
    'maxAutomationRunsPerHour',
    'revision',
    'updatedAtMs',
    'grantsExecutionAuthority',
    'grantsSensorAuthority',
    'grantsApprovalAuthority',
    'grantsCapabilityAuthority',
  ]);

const INSTANT_RISKS =
  new Set([
    'read_only',
    'low',
    'medium',
  ]);

function parseCapabilities(
  input: unknown,
  allowEmpty: boolean,
): readonly IntegrationCapabilityId[] | null {
  if (
    !Array.isArray(input)
    || (!allowEmpty && input.length < 1)
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

export function integrationRiskRank(
  risk: IntegrationRisk,
): number {
  return risk === 'read_only'
    ? 0
    : risk === 'low'
      ? 1
      : risk === 'medium'
        ? 2
        : risk === 'high'
          ? 3
          : 4;
}

export function parseIntegrationPolicy(
  input: unknown,
): IntegrationPolicy | null {
  const record =
    exactObject(input, KEYS);

  if (
    !record
    || record.protocolVersion !== '1.0'
    || typeof record.policyId !== 'string'
    || !INTEGRATION_POLICY_ID.test(
      record.policyId,
    )
    || typeof record.accountId !== 'string'
    || !ACCOUNT_ID.test(record.accountId)
    || typeof record.workspaceId !== 'string'
    || !WORKSPACE_ID.test(
      record.workspaceId,
    )
    || typeof record.enabled !== 'boolean'
    || typeof record.instantMaxRisk
      !== 'string'
    || !INSTANT_RISKS.has(
      record.instantMaxRisk,
    )
    || !safeInteger(
      record.maxRoutineActions,
    )
    || Number(record.maxRoutineActions) < 1
    || Number(record.maxRoutineActions) > 64
    || !safeInteger(
      record.maxAutomationRunsPerHour,
    )
    || Number(
      record.maxAutomationRunsPerHour,
    ) < 1
    || Number(
      record.maxAutomationRunsPerHour,
    ) > 360
    || !safeInteger(record.revision)
    || Number(record.revision) < 1
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

  const allowedCapabilities =
    parseCapabilities(
      record.allowedCapabilities,
      false,
    );
  const automationAllowedCapabilities =
    parseCapabilities(
      record.automationAllowedCapabilities,
      true,
    );

  if (
    !allowedCapabilities
    || !automationAllowedCapabilities
    || automationAllowedCapabilities.some(
      (capability) =>
        !allowedCapabilities.includes(
          capability,
        ),
    )
  ) {
    return null;
  }

  return Object.freeze({
    protocolVersion: '1.0',
    policyId: record.policyId as string,
    accountId: record.accountId as string,
    workspaceId:
      record.workspaceId as string,
    enabled: record.enabled as boolean,
    allowedCapabilities,
    instantMaxRisk:
      record.instantMaxRisk as
        IntegrationPolicy[
          'instantMaxRisk'
        ],
    automationAllowedCapabilities,
    maxRoutineActions:
      record.maxRoutineActions as number,
    maxAutomationRunsPerHour:
      Number(
        record.maxAutomationRunsPerHour,
      ),
    revision: record.revision as number,
    updatedAtMs:
      record.updatedAtMs as number,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}
