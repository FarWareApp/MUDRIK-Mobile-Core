import {
  ACCOUNT_ID,
  INTEGRATION_APPROVAL_ID,
  INTEGRATION_BINDING_ID,
  INTEGRATION_COMMAND_ID,
  INTEGRATION_POLICY_ID,
  WORKSPACE_ID,
  exactObject,
  safeInteger,
} from './integrationSecurity';

import {
  isIntegrationCapabilityId,
  type IntegrationCapabilityId,
} from './integrationCapability';

export type IntegrationApproval =
  Readonly<{
    protocolVersion: '1.0';
    approvalId: string;
    commandId: string;
    accountId: string;
    workspaceId: string;
    policyId: string;
    policyRevision: number;
    bindingId: string;
    bindingRevision: number;
    capability: IntegrationCapabilityId;
    decision: 'approved' | 'denied';
    approvedAtMs: number;
    expiresAtMs: number;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

const KEYS =
  new Set([
    'protocolVersion',
    'approvalId',
    'commandId',
    'accountId',
    'workspaceId',
    'policyId',
    'policyRevision',
    'bindingId',
    'bindingRevision',
    'capability',
    'decision',
    'approvedAtMs',
    'expiresAtMs',
    'grantsExecutionAuthority',
    'grantsSensorAuthority',
    'grantsApprovalAuthority',
    'grantsCapabilityAuthority',
  ]);

export function parseIntegrationApproval(
  input: unknown,
): IntegrationApproval | null {
  const record =
    exactObject(input, KEYS);

  if (
    !record
    || record.protocolVersion !== '1.0'
    || typeof record.approvalId !== 'string'
    || !INTEGRATION_APPROVAL_ID.test(
      record.approvalId,
    )
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
    || !safeInteger(
      record.policyRevision,
    )
    || Number(record.policyRevision) < 1
    || typeof record.bindingId !== 'string'
    || !INTEGRATION_BINDING_ID.test(
      record.bindingId,
    )
    || !safeInteger(
      record.bindingRevision,
    )
    || Number(record.bindingRevision) < 1
    || !isIntegrationCapabilityId(
      record.capability,
    )
    || (
      record.decision !== 'approved'
      && record.decision !== 'denied'
    )
    || !safeInteger(record.approvedAtMs)
    || !safeInteger(record.expiresAtMs)
    || Number(record.expiresAtMs)
      <= Number(record.approvedAtMs)
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
    approvalId:
      record.approvalId as string,
    commandId: record.commandId as string,
    accountId: record.accountId as string,
    workspaceId:
      record.workspaceId as string,
    policyId:
      record.policyId as string,
    policyRevision:
      record.policyRevision as number,
    bindingId: record.bindingId as string,
    bindingRevision:
      record.bindingRevision as number,
    capability:
      record.capability as
        IntegrationCapabilityId,
    decision:
      record.decision as
        IntegrationApproval['decision'],
    approvedAtMs:
      record.approvedAtMs as number,
    expiresAtMs:
      record.expiresAtMs as number,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}
