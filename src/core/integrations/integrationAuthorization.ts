import {
  authorizeCapability,
} from '../security/capabilityPolicy';

import {
  parseTrustedEvaluationTime,
} from '../security/trustedEvaluationTime';

import {
  integrationCapabilityDefinition,
} from './integrationCapability';

import {
  parseIntegrationPolicy,
  integrationRiskRank,
} from './integrationPolicy';

import {
  parseIntegrationDeviceBinding,
} from './integrationBinding';

import {
  parseIntegrationCommand,
} from './integrationCommand';

import {
  parseIntegrationApproval,
} from './integrationApproval';

export type IntegrationAuthorizationReason =
  | 'authorized'
  | 'invalid_input'
  | 'policy_disabled'
  | 'binding_mismatch'
  | 'binding_revoked'
  | 'capability_not_admitted'
  | 'capability_policy_denied'
  | 'instant_risk_denied'
  | 'approval_required'
  | 'approval_proof_required'
  | 'approval_invalid'
  | 'automation_denied'
  | 'automation_proof_required'
  | 'automation_execution_invalid'
  | 'automation_action_replay_conflict'
  | 'specialized_policy_required'
  | 'capability_denied';

export type IntegrationAuthorizationDecision =
  Readonly<{
    authorized: boolean;
    reason: IntegrationAuthorizationReason;
    commandId: string | null;
    bindingId: string | null;
    capability: string | null;
    requiredMudrikCapability:
      string | null;
    grantId: string | null;
    approvalId: string | null;
    grantsAuthority: false;
  }>;

function decision(
  authorized: boolean,
  reason: IntegrationAuthorizationReason,
  commandId: string | null = null,
  bindingId: string | null = null,
  capability: string | null = null,
  requiredMudrikCapability:
    string | null = null,
  grantId: string | null = null,
  approvalId: string | null = null,
): IntegrationAuthorizationDecision {
  return Object.freeze({
    authorized,
    reason,
    commandId,
    bindingId,
    capability,
    requiredMudrikCapability,
    grantId,
    approvalId,
    grantsAuthority: false,
  });
}

function approvalMatches(
  command:
    NonNullable<
      ReturnType<
        typeof parseIntegrationCommand
      >
    >,
  approval:
    NonNullable<
      ReturnType<
        typeof parseIntegrationApproval
      >
    >,
  nowMs: number,
): boolean {
  return (
    approval.decision === 'approved'
    && approval.commandId
      === command.commandId
    && approval.accountId
      === command.accountId
    && approval.workspaceId
      === command.workspaceId
    && approval.policyId
      === command.policyId
    && approval.policyRevision
      === command.policyRevision
    && approval.bindingId
      === command.bindingId
    && approval.bindingRevision
      === command.bindingRevision
    && approval.capability
      === command.capability
    && approval.approvedAtMs
      <= nowMs
    && approval.expiresAtMs
      > nowMs
  );
}

export function authorizeIntegrationCommand(
  input: unknown,
  trustedEvaluationTimeInput: unknown,
  automationExecutionVerified = false,
  approvalProvenanceVerified = false,
): IntegrationAuthorizationDecision {
  if (
    typeof input !== 'object'
    || input === null
    || Array.isArray(input)
  ) {
    return decision(
      false,
      'invalid_input',
    );
  }

  const record =
    input as Record<string, unknown>;
  const keys =
    new Set([
      'policy',
      'binding',
      'command',
      'approval',
      'capabilityGrants',
    ]);

  if (
    Object.keys(record).length
      !== keys.size
    || Object.keys(record).some(
      (key) => !keys.has(key),
    )
    || !Array.isArray(
      record.capabilityGrants,
    )
  ) {
    return decision(
      false,
      'invalid_input',
    );
  }

  const policy =
    parseIntegrationPolicy(
      record.policy,
    );
  const binding =
    parseIntegrationDeviceBinding(
      record.binding,
    );
  const command =
    parseIntegrationCommand(
      record.command,
    );
  const approval =
    record.approval === null
      ? null
      : parseIntegrationApproval(
          record.approval,
        );
  const nowMs =
    parseTrustedEvaluationTime(
      trustedEvaluationTimeInput,
    );

  if (
    !policy
    || !binding
    || !command
    || (
      record.approval !== null
      && !approval
    )
    || nowMs === null
    || command.requestedAtMs > nowMs
  ) {
    return decision(
      false,
      'invalid_input',
    );
  }

  const definition =
    integrationCapabilityDefinition(
      command.capability,
    );
  const base = [
    command.commandId,
    binding.bindingId,
    command.capability,
    definition.requiredMudrikCapability,
  ] as const;

  if (!policy.enabled) {
    return decision(
      false,
      'policy_disabled',
      ...base,
    );
  }

  if (
    policy.accountId !== command.accountId
    || policy.workspaceId
      !== command.workspaceId
    || policy.policyId
      !== command.policyId
    || policy.revision
      !== command.policyRevision
    || binding.accountId
      !== command.accountId
    || binding.workspaceId
      !== command.workspaceId
    || binding.bindingId
      !== command.bindingId
    || binding.revision
      !== command.bindingRevision
    || binding.deviceId
      !== command.deviceId
  ) {
    return decision(
      false,
      'binding_mismatch',
      ...base,
    );
  }

  if (binding.state !== 'active') {
    return decision(
      false,
      'binding_revoked',
      ...base,
    );
  }

  if (
    !binding.capabilities.includes(
      command.capability,
    )
  ) {
    return decision(
      false,
      'capability_not_admitted',
      ...base,
    );
  }

  if (
    !policy.allowedCapabilities.includes(
      command.capability,
    )
  ) {
    return decision(
      false,
      'capability_policy_denied',
      ...base,
    );
  }

  if (
    definition.approvalMode
      === 'specialized'
    || command.mode === 'specialized'
  ) {
    return decision(
      false,
      'specialized_policy_required',
      ...base,
    );
  }

  if (command.mode === 'automation') {
    if (!automationExecutionVerified) {
      return decision(
        false,
        'automation_proof_required',
        ...base,
      );
    }

    if (
      definition.approvalMode !== 'none'
      || !policy
        .automationAllowedCapabilities
        .includes(command.capability)
    ) {
      return decision(
        false,
        'automation_denied',
        ...base,
      );
    }
  } else if (command.mode === 'instant') {
    if (
      !definition.instantEligible
      || integrationRiskRank(
        definition.risk,
      ) > integrationRiskRank(
        policy.instantMaxRisk,
      )
    ) {
      return decision(
        false,
        'instant_risk_denied',
        ...base,
      );
    }
  } else if (
    definition.approvalMode
      === 'explicit'
  ) {
    if (!approval) {
      return decision(
        false,
        'approval_required',
        ...base,
      );
    }

    if (!approvalProvenanceVerified) {
      return decision(
        false,
        'approval_proof_required',
        ...base,
      );
    }

    if (
      !approvalMatches(
        command,
        approval,
        nowMs,
      )
    ) {
      return decision(
        false,
        'approval_invalid',
        ...base,
      );
    }
  }

  if (
    definition.approvalMode
      === 'explicit'
    && command.mode !== 'approved'
  ) {
    return decision(
      false,
      'approval_required',
      ...base,
    );
  }

  const required =
    definition.requiredMudrikCapability;

  if (!required) {
    return decision(
      false,
      'specialized_policy_required',
      ...base,
    );
  }

  const authorization =
    authorizeCapability(
      {
        subjectId: binding.deviceId,
        capability: required,
        nowMs,
        resourceId: binding.deviceId,
        background:
          command.mode === 'automation',
        elevation: 'none',
      },
      record.capabilityGrants as readonly unknown[],
      nowMs,
    );

  if (!authorization.allowed) {
    return decision(
      false,
      'capability_denied',
      ...base,
    );
  }

  return decision(
    true,
    'authorized',
    ...base,
    authorization.grantId ?? null,
    approval?.approvalId ?? null,
  );
}
