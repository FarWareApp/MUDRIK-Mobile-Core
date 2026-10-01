import {
  parseIntegrationAdapterRegistration,
  toPublicIntegrationAdapter,
  type IntegrationAdapterRegistration,
  type PublicIntegrationAdapter,
} from './integrationAdapter';

import {
  parseIntegrationDiscoveryRecord,
  type IntegrationDiscoveryRecord,
} from './integrationDiscovery';

import {
  parseIntegrationDeviceBinding,
  type IntegrationDeviceBinding,
} from './integrationBinding';

import {
  parseIntegrationPolicy,
  type IntegrationPolicy,
} from './integrationPolicy';

import {
  parseIntegrationRoutine,
  type IntegrationRoutine,
} from './integrationRoutine';

import {
  parseIntegrationAutomation,
  type IntegrationAutomation,
} from './integrationAutomation';

import {
  authorizeIntegrationCommand,
  type IntegrationAuthorizationDecision,
  type IntegrationAuthorizationReason,
} from './integrationAuthorization';

import {
  parseIntegrationCommand,
  type IntegrationCommand,
} from './integrationCommand';

import {
  parseIntegrationApproval,
  type IntegrationApproval,
} from './integrationApproval';

import {
  createIntegrationAutomationExecution,
  type IntegrationAutomationExecution,
} from './integrationAutomationExecution';

import {
  parseIntegrationAdapterInvocation,
  type IntegrationAdapterInvocation,
} from './integrationAdapterInvocation';

import {
  parseIntegrationResultEnvelope,
  type IntegrationResultEnvelope,
} from './integrationResult';

import {
  authorizeIntegrationRoutineDefinition,
  authorizeIntegrationAutomationDefinition,
} from './integrationCompositionPolicy';

import {
  INTEGRATION_AUTOMATION_ID,
  INTEGRATION_ROUTINE_ID,
  INTEGRATION_TRIGGER_EVENT_ID,
  exactObject,
  safeInteger,
  safeLabel,
} from './integrationSecurity';

export type IntegrationRegistryResult<T> =
  Readonly<{
    accepted: boolean;
    duplicate: boolean;
    reason: string;
    value: T | null;
  }>;

function result<T>(
  accepted: boolean,
  reason: string,
  value: T | null = null,
  duplicate = false,
): IntegrationRegistryResult<T> {
  return Object.freeze({
    accepted,
    duplicate,
    reason,
    value,
  });
}

function workspaceKey(
  accountId: string,
  workspaceId: string,
): string {
  return accountId + ':' + workspaceId;
}

function deniedAuthorization(
  reason: IntegrationAuthorizationReason,
  command: IntegrationCommand | null,
): IntegrationAuthorizationDecision {
  return Object.freeze({
    authorized: false,
    reason,
    commandId:
      command?.commandId ?? null,
    bindingId:
      command?.bindingId ?? null,
    capability:
      command?.capability ?? null,
    requiredMudrikCapability: null,
    grantId: null,
    approvalId: null,
    grantsAuthority: false,
  });
}

export class IntegrationRegistry {
  private readonly policies =
    new Map<string, IntegrationPolicy>();

  private readonly adapters =
    new Map<
      string,
      IntegrationAdapterRegistration
    >();

  private readonly discoveries =
    new Map<
      string,
      IntegrationDiscoveryRecord
    >();

  private readonly bindings =
    new Map<
      string,
      IntegrationDeviceBinding
    >();

  private readonly routines =
    new Map<
      string,
      IntegrationRoutine
    >();

  private readonly automations =
    new Map<
      string,
      IntegrationAutomation
    >();

  private readonly approvals =
    new Map<
      string,
      IntegrationApproval
    >();

  private readonly approvalByCommand =
    new Map<string, string>();

  private readonly revokedApprovals =
    new Set<string>();

  private readonly issuedInvocations =
    new Map<
      string,
      IntegrationAdapterInvocation
    >();

  private readonly results =
    new Map<
      string,
      IntegrationResultEnvelope
    >();

  private readonly automationExecutions =
    new Map<
      string,
      IntegrationAutomationExecution
    >();

  private readonly automationActionClaims =
    new Map<
      string,
      {
        commandId: string;
        fingerprint: string;
      }
    >();

  private readonly triggerEvents =
    new Map<
      string,
      {
        automationId: string;
        automationRevision: number;
        acceptedAtMs: number;
        fingerprint: string;
        executionId: string;
      }
    >();

  setPolicy(
    input: unknown,
    trustedNowMs: number,
  ): IntegrationRegistryResult<
    IntegrationPolicy
  > {
    const parsed =
      parseIntegrationPolicy(input);

    if (
      !parsed
      || !safeInteger(trustedNowMs)
      || parsed.updatedAtMs > trustedNowMs
    ) {
      return result(
        false,
        'policy_invalid',
      );
    }

    const key =
      workspaceKey(
        parsed.accountId,
        parsed.workspaceId,
      );
    const current =
      this.policies.get(key);

    if (!current) {
      if (parsed.revision !== 1) {
        return result(
          false,
          'policy_revision_gap',
        );
      }

      this.policies.set(key, parsed);
      return result(
        true,
        'policy_set',
        parsed,
      );
    }

    if (
      parsed.policyId !== current.policyId
    ) {
      return result(
        false,
        'policy_identity_conflict',
        current,
      );
    }

    if (
      parsed.revision < current.revision
    ) {
      return result(
        false,
        'policy_revision_stale',
        current,
      );
    }

    if (
      parsed.revision === current.revision
    ) {
      if (
        JSON.stringify(parsed)
          === JSON.stringify(current)
      ) {
        return result(
          true,
          'duplicate',
          current,
          true,
        );
      }

      return result(
        false,
        'policy_revision_conflict',
        current,
      );
    }

    if (
      parsed.revision
        !== current.revision + 1
      || parsed.updatedAtMs
        < current.updatedAtMs
    ) {
      return result(
        false,
        'policy_revision_gap',
        current,
      );
    }

    this.policies.set(key, parsed);

    return result(
      true,
      'policy_updated',
      parsed,
    );
  }

  registerAdapter(
    input: unknown,
    trustedNowMs: number,
  ): IntegrationRegistryResult<
    PublicIntegrationAdapter
  > {
    const parsed =
      parseIntegrationAdapterRegistration(
        input,
      );

    if (
      !parsed
      || !safeInteger(trustedNowMs)
      || parsed.declaredAtMs
        > trustedNowMs
      || parsed.expiresAtMs
        <= trustedNowMs
    ) {
      return result(
        false,
        'adapter_invalid',
      );
    }

    const current =
      this.adapters.get(parsed.adapterId);

    if (current) {
      if (
        JSON.stringify(current)
          === JSON.stringify(parsed)
      ) {
        return result(
          true,
          'duplicate',
          toPublicIntegrationAdapter(
            current,
          ),
          true,
        );
      }

      if (
        current.integrationId
          !== parsed.integrationId
        || current.kind !== parsed.kind
      ) {
        return result(
          false,
          'adapter_identity_conflict',
          toPublicIntegrationAdapter(
            current,
          ),
        );
      }

      if (
        parsed.declaredAtMs
          <= current.declaredAtMs
      ) {
        return result(
          false,
          'adapter_stale',
          toPublicIntegrationAdapter(
            current,
          ),
        );
      }

      this.adapters.set(
        parsed.adapterId,
        parsed,
      );

      return result(
        true,
        'adapter_updated',
        toPublicIntegrationAdapter(
          parsed,
        ),
      );
    }

    this.adapters.set(
      parsed.adapterId,
      parsed,
    );

    return result(
      true,
      'adapter_registered',
      toPublicIntegrationAdapter(
        parsed,
      ),
    );
  }

  ingestDiscovery(
    input: unknown,
    trustedNowMs: number,
  ): IntegrationRegistryResult<
    IntegrationDiscoveryRecord
  > {
    const parsed =
      parseIntegrationDiscoveryRecord(
        input,
      );

    if (
      !parsed
      || !safeInteger(trustedNowMs)
      || parsed.observedAtMs
        > trustedNowMs
      || parsed.expiresAtMs
        <= trustedNowMs
    ) {
      return result(
        false,
        'discovery_invalid',
      );
    }

    const adapter =
      this.adapters.get(
        parsed.adapterId,
      );

    if (
      !adapter
      || adapter.integrationId
        !== parsed.integrationId
      || adapter.status
        === 'unavailable'
      || adapter.declaredAtMs
        > trustedNowMs
      || adapter.expiresAtMs
        <= trustedNowMs
    ) {
      return result(
        false,
        'adapter_unavailable',
      );
    }

    const current =
      this.discoveries.get(
        parsed.discoveryId,
      );

    if (current) {
      if (
        JSON.stringify(current)
          === JSON.stringify(parsed)
      ) {
        return result(
          true,
          'duplicate',
          current,
          true,
        );
      }

      return result(
        false,
        'discovery_conflict',
        current,
      );
    }

    this.discoveries.set(
      parsed.discoveryId,
      parsed,
    );

    return result(
      true,
      'discovery_recorded',
      parsed,
    );
  }

  admitBinding(
    input: unknown,
    discoveryId: string,
    trustedNowMs: number,
  ): IntegrationRegistryResult<
    IntegrationDeviceBinding
  > {
    const parsed =
      parseIntegrationDeviceBinding(
        input,
      );
    const discovery =
      this.discoveries.get(
        discoveryId,
      );

    if (
      !parsed
      || !discovery
      || !safeInteger(trustedNowMs)
      || parsed.admittedAtMs
        > trustedNowMs
      || (
        parsed.revokedAtMs !== null
        && parsed.revokedAtMs
          > trustedNowMs
      )
      || discovery.observedAtMs
        > trustedNowMs
      || discovery.expiresAtMs
        <= trustedNowMs
    ) {
      return result(
        false,
        'binding_invalid',
      );
    }

    if (
      parsed.accountId
        !== discovery.accountId
      || parsed.workspaceId
        !== discovery.workspaceId
      || parsed.adapterId
        !== discovery.adapterId
      || parsed.integrationId
        !== discovery.integrationId
      || parsed.deviceId
        !== discovery.proposedDeviceId
      || parsed.externalDeviceRef
        !== discovery.externalDeviceRef
      || parsed.capabilities.some(
        (capability) =>
          !discovery.mappedCapabilities
            .includes(capability),
      )
    ) {
      return result(
        false,
        'discovery_binding_mismatch',
      );
    }

    const current =
      this.bindings.get(
        parsed.bindingId,
      );

    if (!current) {
      if (parsed.revision !== 1) {
        return result(
          false,
          'binding_revision_gap',
        );
      }

      this.bindings.set(
        parsed.bindingId,
        parsed,
      );
      return result(
        true,
        'binding_admitted',
        parsed,
      );
    }

    if (
      current.accountId
        !== parsed.accountId
      || current.workspaceId
        !== parsed.workspaceId
      || current.integrationId
        !== parsed.integrationId
      || current.adapterId
        !== parsed.adapterId
      || current.deviceId
        !== parsed.deviceId
      || current.externalDeviceRef
        !== parsed.externalDeviceRef
    ) {
      return result(
        false,
        'binding_identity_conflict',
        current,
      );
    }

    if (
      parsed.revision < current.revision
    ) {
      return result(
        false,
        'binding_revision_stale',
        current,
      );
    }

    if (
      parsed.revision === current.revision
    ) {
      if (
        JSON.stringify(parsed)
          === JSON.stringify(current)
      ) {
        return result(
          true,
          'duplicate',
          current,
          true,
        );
      }

      return result(
        false,
        'binding_revision_conflict',
        current,
      );
    }

    if (
      parsed.revision
        !== current.revision + 1
      || parsed.capabilities.some(
        (capability) =>
          !current.capabilities.includes(
            capability,
          ),
      )
    ) {
      return result(
        false,
        'binding_revision_gap',
        current,
      );
    }

    this.bindings.set(
      parsed.bindingId,
      parsed,
    );

    return result(
      true,
      'binding_updated',
      parsed,
    );
  }

  revokeBinding(
    bindingId: string,
    trustedNowMs: number,
  ): IntegrationRegistryResult<
    IntegrationDeviceBinding
  > {
    if (
      !safeInteger(trustedNowMs)
    ) {
      return result(
        false,
        'binding_invalid',
      );
    }

    const current =
      this.bindings.get(bindingId);

    if (!current) {
      return result(
        false,
        'binding_unknown',
      );
    }

    if (current.state === 'revoked') {
      return result(
        true,
        'duplicate',
        current,
        true,
      );
    }

    const revoked =
      Object.freeze({
        ...current,
        revision:
          current.revision + 1,
        state: 'revoked' as const,
        revokedAtMs: trustedNowMs,
      });

    this.bindings.set(
      bindingId,
      revoked,
    );

    return result(
      true,
      'binding_revoked',
      revoked,
    );
  }

  setRoutine(
    input: unknown,
    trustedNowMs: number,
  ): IntegrationRegistryResult<
    IntegrationRoutine
  > {
    const parsed =
      parseIntegrationRoutine(input);

    if (
      !parsed
      || !safeInteger(trustedNowMs)
      || parsed.updatedAtMs > trustedNowMs
    ) {
      return result(
        false,
        'routine_invalid',
      );
    }

    const policy =
      this.policies.get(
        workspaceKey(
          parsed.accountId,
          parsed.workspaceId,
        ),
      );

    if (!policy) {
      return result(
        false,
        'policy_unknown',
      );
    }

    const authorization =
      authorizeIntegrationRoutineDefinition(
        {
          policy,
          routine: parsed,
          bindings:
            [...this.bindings.values()],
        },
        trustedNowMs,
        parsed.state === 'revoked',
      );

    if (!authorization.authorized) {
      return result(
        false,
        authorization.reason,
      );
    }

    const current =
      this.routines.get(
        parsed.routineId,
      );

    if (!current) {
      if (parsed.revision !== 1) {
        return result(
          false,
          'routine_revision_gap',
        );
      }

      this.routines.set(
        parsed.routineId,
        parsed,
      );

      return result(
        true,
        'routine_set',
        parsed,
      );
    }

    if (
      current.accountId !== parsed.accountId
      || current.workspaceId
        !== parsed.workspaceId
      || current.policyId
        !== parsed.policyId
    ) {
      return result(
        false,
        'routine_identity_conflict',
        current,
      );
    }

    if (
      parsed.revision < current.revision
    ) {
      return result(
        false,
        'routine_revision_stale',
        current,
      );
    }

    if (
      parsed.revision === current.revision
    ) {
      if (
        JSON.stringify(parsed)
          === JSON.stringify(current)
      ) {
        return result(
          true,
          'duplicate',
          current,
          true,
        );
      }

      return result(
        false,
        'routine_revision_conflict',
        current,
      );
    }

    if (
      parsed.revision
        !== current.revision + 1
      || parsed.updatedAtMs
        < current.updatedAtMs
    ) {
      return result(
        false,
        'routine_revision_gap',
        current,
      );
    }

    this.routines.set(
      parsed.routineId,
      parsed,
    );

    return result(
      true,
      'routine_updated',
      parsed,
    );
  }

  setAutomation(
    input: unknown,
    trustedNowMs: number,
  ): IntegrationRegistryResult<
    IntegrationAutomation
  > {
    const parsed =
      parseIntegrationAutomation(input);

    if (
      !parsed
      || !safeInteger(trustedNowMs)
      || parsed.updatedAtMs > trustedNowMs
    ) {
      return result(
        false,
        'automation_invalid',
      );
    }

    const policy =
      this.policies.get(
        workspaceKey(
          parsed.accountId,
          parsed.workspaceId,
        ),
      );
    const routine =
      this.routines.get(
        parsed.routineId,
      );

    if (!policy || !routine) {
      return result(
        false,
        'automation_dependency_missing',
      );
    }

    const authorization =
      authorizeIntegrationAutomationDefinition(
        {
          policy,
          routine,
          automation: parsed,
          bindings:
            [...this.bindings.values()],
        },
        trustedNowMs,
        parsed.state !== 'enabled',
      );

    if (!authorization.authorized) {
      return result(
        false,
        authorization.reason,
      );
    }

    const current =
      this.automations.get(
        parsed.automationId,
      );

    if (!current) {
      if (parsed.revision !== 1) {
        return result(
          false,
          'automation_revision_gap',
        );
      }

      this.automations.set(
        parsed.automationId,
        parsed,
      );

      return result(
        true,
        'automation_set',
        parsed,
      );
    }

    if (
      current.accountId !== parsed.accountId
      || current.workspaceId
        !== parsed.workspaceId
      || current.policyId
        !== parsed.policyId
      || current.routineId
        !== parsed.routineId
    ) {
      return result(
        false,
        'automation_identity_conflict',
        current,
      );
    }

    if (
      parsed.revision < current.revision
    ) {
      return result(
        false,
        'automation_revision_stale',
        current,
      );
    }

    if (
      parsed.revision === current.revision
    ) {
      if (
        JSON.stringify(parsed)
          === JSON.stringify(current)
      ) {
        return result(
          true,
          'duplicate',
          current,
          true,
        );
      }

      return result(
        false,
        'automation_revision_conflict',
        current,
      );
    }

    if (
      parsed.revision
        !== current.revision + 1
      || parsed.updatedAtMs
        < current.updatedAtMs
    ) {
      return result(
        false,
        'automation_revision_gap',
        current,
      );
    }

    this.automations.set(
      parsed.automationId,
      parsed,
    );

    return result(
      true,
      'automation_updated',
      parsed,
    );
  }

  recordApproval(
    input: unknown,
    trustedNowMs: number,
  ): IntegrationRegistryResult<
    IntegrationApproval
  > {
    const parsed =
      parseIntegrationApproval(input);

    if (
      !parsed
      || !safeInteger(trustedNowMs)
      || parsed.approvedAtMs
        > trustedNowMs
      || parsed.expiresAtMs
        <= trustedNowMs
    ) {
      return result(
        false,
        'approval_invalid',
      );
    }

    const binding =
      this.bindings.get(
        parsed.bindingId,
      );
    const policy =
      this.policies.get(
        workspaceKey(
          parsed.accountId,
          parsed.workspaceId,
        ),
      );

    if (
      !binding
      || binding.state !== 'active'
      || binding.accountId
        !== parsed.accountId
      || binding.workspaceId
        !== parsed.workspaceId
      || binding.revision
        !== parsed.bindingRevision
      || !binding.capabilities.includes(
        parsed.capability,
      )
    ) {
      return result(
        false,
        'approval_binding_mismatch',
      );
    }

    if (
      !policy
      || !policy.enabled
      || !policy.allowedCapabilities
        .includes(parsed.capability)
    ) {
      return result(
        false,
        'approval_policy_denied',
      );
    }

    const current =
      this.approvals.get(
        parsed.approvalId,
      );

    if (current) {
      if (
        this.revokedApprovals.has(
          parsed.approvalId,
        )
      ) {
        return result(
          false,
          'approval_revoked',
          current,
        );
      }

      if (
        JSON.stringify(current)
          === JSON.stringify(parsed)
      ) {
        return result(
          true,
          'duplicate',
          current,
          true,
        );
      }

      return result(
        false,
        'approval_conflict',
        current,
      );
    }

    const existingApprovalId =
      this.approvalByCommand.get(
        parsed.commandId,
      );

    if (
      existingApprovalId
      && existingApprovalId
        !== parsed.approvalId
    ) {
      return result(
        false,
        'approval_command_conflict',
      );
    }

    this.approvals.set(
      parsed.approvalId,
      parsed,
    );
    this.approvalByCommand.set(
      parsed.commandId,
      parsed.approvalId,
    );

    return result(
      true,
      'approval_recorded',
      parsed,
    );
  }

  revokeApproval(
    approvalId: string,
    trustedNowMs: number,
  ): IntegrationRegistryResult<
    IntegrationApproval
  > {
    if (!safeInteger(trustedNowMs)) {
      return result(
        false,
        'approval_invalid',
      );
    }

    const current =
      this.approvals.get(approvalId);

    if (!current) {
      return result(
        false,
        'approval_unknown',
      );
    }

    if (
      trustedNowMs
        < current.approvedAtMs
    ) {
      return result(
        false,
        'approval_invalid',
      );
    }

    if (
      this.revokedApprovals.has(
        approvalId,
      )
    ) {
      return result(
        true,
        'duplicate',
        current,
        true,
      );
    }

    this.revokedApprovals.add(
      approvalId,
    );

    return result(
      true,
      'approval_revoked',
      current,
    );
  }

  authorizeCommand(
    commandInput: unknown,
    approvalInput: unknown,
    capabilityGrants: readonly unknown[],
    trustedNowMs: number,
  ): IntegrationAuthorizationDecision {
    const command =
      parseIntegrationCommand(
        commandInput,
      );

    if (
      !command
      || !safeInteger(trustedNowMs)
    ) {
      return deniedAuthorization(
        'invalid_input',
        command,
      );
    }

    const policy =
      this.policies.get(
        workspaceKey(
          command.accountId,
          command.workspaceId,
        ),
      );
    const binding =
      this.bindings.get(
        command.bindingId,
      );

    if (!policy || !binding) {
      return deniedAuthorization(
        'binding_mismatch',
        command,
      );
    }

    let automationExecutionVerified =
      false;
    let claimKey: string | null = null;
    let claimFingerprint:
      string | null = null;

    if (command.mode === 'automation') {
      const executionId =
        command.automationExecutionId;
      const actionIndex =
        command.automationActionIndex;

      if (
        executionId === null
        || actionIndex === null
      ) {
        return deniedAuthorization(
          'automation_execution_invalid',
          command,
        );
      }

      const execution =
        this.automationExecutions.get(
          executionId,
        );

      if (
        !execution
        || trustedNowMs
          < execution.authorizedAtMs
        || trustedNowMs
          >= execution.expiresAtMs
        || execution.accountId
          !== command.accountId
        || execution.workspaceId
          !== command.workspaceId
        || execution.policyId
          !== command.policyId
        || execution.policyRevision
          !== command.policyRevision
      ) {
        return deniedAuthorization(
          'automation_execution_invalid',
          command,
        );
      }

      const currentAutomation =
        this.automations.get(
          execution.automationId,
        );
      const currentRoutine =
        this.routines.get(
          execution.routineId,
        );

      if (
        !currentAutomation
        || !currentRoutine
        || currentAutomation.state
          !== 'enabled'
        || currentRoutine.state
          !== 'active'
        || currentAutomation.revision
          !== execution.automationRevision
        || currentRoutine.revision
          !== execution.routineRevision
        || currentAutomation.policyRevision
          !== execution.policyRevision
        || currentRoutine.policyRevision
          !== execution.policyRevision
      ) {
        return deniedAuthorization(
          'automation_execution_invalid',
          command,
        );
      }

      const action =
        execution.actions[actionIndex];

      if (
        !action
        || action.bindingId
          !== command.bindingId
        || action.bindingRevision
          !== command.bindingRevision
        || action.deviceId
          !== command.deviceId
        || action.capability
          !== command.capability
        || JSON.stringify(action.value)
          !== JSON.stringify(command.value)
      ) {
        return deniedAuthorization(
          'automation_execution_invalid',
          command,
        );
      }

      claimKey =
        execution.executionId
        + ':'
        + String(actionIndex);
      claimFingerprint =
        JSON.stringify(command);
      const previousClaim =
        this.automationActionClaims.get(
          claimKey,
        );

      if (
        previousClaim
        && (
          previousClaim.commandId
            !== command.commandId
          || previousClaim.fingerprint
            !== claimFingerprint
        )
      ) {
        return deniedAuthorization(
          'automation_action_replay_conflict',
          command,
        );
      }

      automationExecutionVerified = true;
    }

    let approvalProvenanceVerified =
      false;

    if (approvalInput !== null) {
      const parsedApproval =
        parseIntegrationApproval(
          approvalInput,
        );

      if (parsedApproval) {
        const storedApproval =
          this.approvals.get(
            parsedApproval.approvalId,
          );

        approvalProvenanceVerified =
          Boolean(storedApproval)
          && !this.revokedApprovals.has(
            parsedApproval.approvalId,
          )
          && JSON.stringify(
            storedApproval,
          ) === JSON.stringify(
            parsedApproval,
          )
          && this.approvalByCommand.get(
            command.commandId,
          ) === parsedApproval.approvalId;
      }
    }

    const authorization =
      authorizeIntegrationCommand(
        {
          policy,
          binding,
          command,
          approval: approvalInput,
          capabilityGrants,
        },
        trustedNowMs,
        automationExecutionVerified,
        approvalProvenanceVerified,
      );

    if (
      authorization.authorized
      && claimKey !== null
      && claimFingerprint !== null
      && !this.automationActionClaims.has(
        claimKey,
      )
    ) {
      this.automationActionClaims.set(
        claimKey,
        {
          commandId: command.commandId,
          fingerprint: claimFingerprint,
        },
      );
    }

    return authorization;
  }

  resolveAdapterCredential(
    bindingId: string,
    trustedNowMs: number,
  ): Readonly<{
    adapterId: string;
    integrationId: string;
    credentialRef: string | null;
  }> | null {
    if (!safeInteger(trustedNowMs)) {
      return null;
    }

    const binding =
      this.bindings.get(bindingId);

    if (
      !binding
      || binding.state !== 'active'
    ) {
      return null;
    }

    const adapter =
      this.adapters.get(
        binding.adapterId,
      );

    if (
      !adapter
      || adapter.status === 'unavailable'
      || adapter.declaredAtMs
        > trustedNowMs
      || adapter.expiresAtMs
        <= trustedNowMs
    ) {
      return null;
    }

    return Object.freeze({
      adapterId: adapter.adapterId,
      integrationId:
        adapter.integrationId,
      credentialRef:
        adapter.credentialRef,
    });
  }

  prepareAdapterInvocation(
    commandInput: unknown,
    approvalInput: unknown,
    capabilityGrants: readonly unknown[],
    trustedNowMs: number,
  ): IntegrationRegistryResult<
    IntegrationAdapterInvocation
  > {
    const command =
      parseIntegrationCommand(
        commandInput,
      );

    if (
      !command
      || !safeInteger(trustedNowMs)
    ) {
      return result(
        false,
        'command_invalid',
      );
    }

    const authorization =
      this.authorizeCommand(
        command,
        approvalInput,
        capabilityGrants,
        trustedNowMs,
      );

    if (!authorization.authorized) {
      return result(
        false,
        authorization.reason,
      );
    }

    const binding =
      this.bindings.get(
        command.bindingId,
      );

    if (
      !binding
      || binding.state !== 'active'
    ) {
      return result(
        false,
        'binding_mismatch',
      );
    }

    const adapter =
      this.adapters.get(
        binding.adapterId,
      );

    if (
      !adapter
      || adapter.status === 'unavailable'
      || adapter.declaredAtMs
        > trustedNowMs
      || adapter.expiresAtMs
        <= trustedNowMs
    ) {
      return result(
        false,
        'adapter_unavailable',
      );
    }

    const current =
      this.issuedInvocations.get(
        command.commandId,
      );

    if (current) {
      const same =
        current.bindingId
          === binding.bindingId
        && current.bindingRevision
          === binding.revision
        && current.deviceId
          === binding.deviceId
        && current.adapterId
          === adapter.adapterId
        && current.integrationId
          === adapter.integrationId
        && current.capability
          === command.capability
        && JSON.stringify(current.value)
          === JSON.stringify(command.value);

      if (same) {
        return result(
          true,
          'duplicate',
          current,
          true,
        );
      }

      return result(
        false,
        'command_replay_conflict',
        current,
      );
    }

    const invocation =
      parseIntegrationAdapterInvocation({
        protocolVersion: '1.0',
        commandId: command.commandId,
        bindingId: binding.bindingId,
        bindingRevision:
          binding.revision,
        deviceId: binding.deviceId,
        adapterId: adapter.adapterId,
        integrationId:
          adapter.integrationId,
        capability: command.capability,
        value: command.value,
        issuedAtMs: trustedNowMs,
        grantsExecutionAuthority: false,
        grantsSensorAuthority: false,
        grantsApprovalAuthority: false,
        grantsCapabilityAuthority: false,
      });

    if (!invocation) {
      return result(
        false,
        'invocation_invalid',
      );
    }

    this.issuedInvocations.set(
      command.commandId,
      invocation,
    );

    return result(
      true,
      'invocation_issued',
      invocation,
    );
  }

  acceptAdapterResult(
    input: unknown,
    trustedNowMs: number,
  ): IntegrationRegistryResult<
    IntegrationResultEnvelope
  > {
    const parsed =
      parseIntegrationResultEnvelope(
        input,
      );

    if (
      !parsed
      || !safeInteger(trustedNowMs)
      || parsed.completedAtMs
        > trustedNowMs
    ) {
      return result(
        false,
        'result_invalid',
      );
    }

    const issued =
      this.issuedInvocations.get(
        parsed.commandId,
      );

    if (
      !issued
      || parsed.bindingId
        !== issued.bindingId
      || parsed.deviceId
        !== issued.deviceId
      || parsed.adapterId
        !== issued.adapterId
      || parsed.integrationId
        !== issued.integrationId
      || parsed.completedAtMs
        < issued.issuedAtMs
    ) {
      return result(
        false,
        'result_binding_mismatch',
      );
    }

    const current =
      this.results.get(
        parsed.commandId,
      );

    if (current) {
      if (
        JSON.stringify(current)
          === JSON.stringify(parsed)
      ) {
        return result(
          true,
          'duplicate',
          current,
          true,
        );
      }

      return result(
        false,
        'result_conflict',
        current,
      );
    }

    this.results.set(
      parsed.commandId,
      parsed,
    );

    return result(
      true,
      'result_accepted',
      parsed,
    );
  }

  authorizeAutomationTrigger(
    input: unknown,
    trustedNowMs: number,
  ): IntegrationRegistryResult<
    IntegrationAutomationExecution
  > {
    const keys =
      new Set([
        'eventId',
        'automationId',
        'automationRevision',
        'routineId',
        'routineRevision',
        'triggerKind',
        'triggerRef',
      ]);
    const record =
      exactObject(input, keys);

    if (
      !record
      || typeof record.eventId !== 'string'
      || !INTEGRATION_TRIGGER_EVENT_ID.test(
        record.eventId,
      )
      || typeof record.automationId
        !== 'string'
      || !INTEGRATION_AUTOMATION_ID.test(
        record.automationId,
      )
      || !safeInteger(
        record.automationRevision,
      )
      || typeof record.routineId !== 'string'
      || !INTEGRATION_ROUTINE_ID.test(
        record.routineId,
      )
      || !safeInteger(
        record.routineRevision,
      )
      || typeof record.triggerKind
        !== 'string'
      || ![
        'schedule',
        'device_event',
        'external_event',
      ].includes(record.triggerKind)
      || !safeLabel(
        record.triggerRef,
        120,
      )
      || !safeInteger(trustedNowMs)
    ) {
      return result(
        false,
        'trigger_invalid',
      );
    }

    const automation =
      this.automations.get(
        record.automationId,
      );
    const routine =
      this.routines.get(
        record.routineId,
      );

    if (!automation || !routine) {
      return result(
        false,
        'automation_dependency_missing',
      );
    }

    const fingerprint =
      JSON.stringify(record);
    const previous =
      this.triggerEvents.get(
        record.eventId,
      );

    if (previous) {
      if (
        previous.fingerprint
          === fingerprint
      ) {
        const execution =
          this.automationExecutions.get(
            previous.executionId,
          ) ?? null;

        if (!execution) {
          return result(
            false,
            'automation_execution_missing',
          );
        }

        return result(
          true,
          'duplicate',
          execution,
          true,
        );
      }

      return result(
        false,
        'trigger_replay_conflict',
      );
    }

    if (
      automation.revision
        !== record.automationRevision
      || routine.revision
        !== record.routineRevision
      || automation.routineId
        !== routine.routineId
      || automation.triggerKind
        !== record.triggerKind
      || automation.triggerRef
        !== record.triggerRef
    ) {
      return result(
        false,
        'trigger_binding_mismatch',
      );
    }

    const policy =
      this.policies.get(
        workspaceKey(
          automation.accountId,
          automation.workspaceId,
        ),
      );

    if (!policy) {
      return result(
        false,
        'policy_unknown',
      );
    }

    const authorization =
      authorizeIntegrationAutomationDefinition(
        {
          policy,
          routine,
          automation,
          bindings:
            [...this.bindings.values()],
        },
        trustedNowMs,
      );

    if (!authorization.authorized) {
      return result(
        false,
        authorization.reason,
      );
    }

    const cutoff =
      trustedNowMs - 60 * 60 * 1000;
    const recentRuns =
      [...this.triggerEvents.values()]
        .filter(
          (event) =>
            event.automationId
              === automation.automationId
            && event.automationRevision
              === automation.revision
            && event.acceptedAtMs > cutoff,
        ).length;

    if (
      recentRuns
        >= automation.maxRunsPerHour
      || recentRuns
        >= policy.maxAutomationRunsPerHour
    ) {
      return result(
        false,
        'automation_rate_limited',
      );
    }

    const execution =
      createIntegrationAutomationExecution(
        automation,
        routine,
        record.eventId as string,
        trustedNowMs,
      );

    if (!execution) {
      return result(
        false,
        'automation_execution_invalid',
      );
    }

    this.automationExecutions.set(
      execution.executionId,
      execution,
    );

    this.triggerEvents.set(
      record.eventId as string,
      {
        automationId:
          automation.automationId,
        automationRevision:
          automation.revision,
        acceptedAtMs:
          trustedNowMs,
        fingerprint,
        executionId:
          execution.executionId,
      },
    );

    return result(
      true,
      'automation_trigger_authorized',
      execution,
    );
  }
}
