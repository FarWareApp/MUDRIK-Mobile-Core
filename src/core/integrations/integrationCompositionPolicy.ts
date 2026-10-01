import {
  parseTrustedEvaluationTime,
} from '../security/trustedEvaluationTime';

import {
  integrationCapabilityDefinition,
} from './integrationCapability';

import {
  parseIntegrationPolicy,
} from './integrationPolicy';

import {
  parseIntegrationDeviceBinding,
  type IntegrationDeviceBinding,
} from './integrationBinding';

import {
  parseIntegrationRoutine,
} from './integrationRoutine';

import {
  parseIntegrationAutomation,
} from './integrationAutomation';

export type IntegrationCompositionReason =
  | 'authorized'
  | 'invalid_input'
  | 'policy_disabled'
  | 'binding_mismatch'
  | 'binding_revoked'
  | 'capability_not_admitted'
  | 'capability_policy_denied'
  | 'routine_limit_exceeded'
  | 'routine_revoked'
  | 'automation_disabled'
  | 'automation_scope_denied'
  | 'automation_window_closed';

export type IntegrationCompositionDecision =
  Readonly<{
    authorized: boolean;
    reason: IntegrationCompositionReason;
    grantsAuthority: false;
  }>;

function decision(
  authorized: boolean,
  reason: IntegrationCompositionReason,
): IntegrationCompositionDecision {
  return Object.freeze({
    authorized,
    reason,
    grantsAuthority: false,
  });
}

function bindingKey(
  bindingId: string,
): string {
  return bindingId;
}

export function authorizeIntegrationRoutineDefinition(
  input: unknown,
  trustedEvaluationTimeInput: unknown,
  allowInactive = false,
): IntegrationCompositionDecision {
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
      'routine',
      'bindings',
    ]);

  if (
    Object.keys(record).length
      !== keys.size
    || Object.keys(record).some(
      (key) => !keys.has(key),
    )
    || !Array.isArray(record.bindings)
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
  const routine =
    parseIntegrationRoutine(
      record.routine,
    );
  const nowMs =
    parseTrustedEvaluationTime(
      trustedEvaluationTimeInput,
    );

  if (
    !policy
    || !routine
    || nowMs === null
    || routine.updatedAtMs > nowMs
  ) {
    return decision(
      false,
      'invalid_input',
    );
  }

  if (
    !policy.enabled
    && !allowInactive
  ) {
    return decision(
      false,
      'policy_disabled',
    );
  }

  if (
    routine.accountId !== policy.accountId
    || routine.workspaceId
      !== policy.workspaceId
    || routine.policyId !== policy.policyId
    || routine.policyRevision
      !== policy.revision
  ) {
    return decision(
      false,
      'binding_mismatch',
    );
  }

  if (
    routine.state !== 'active'
    && !allowInactive
  ) {
    return decision(
      false,
      'routine_revoked',
    );
  }

  if (
    routine.actions.length
      > policy.maxRoutineActions
  ) {
    return decision(
      false,
      'routine_limit_exceeded',
    );
  }

  const bindings =
    new Map<string, IntegrationDeviceBinding>();

  for (const inputBinding of record.bindings) {
    const binding =
      parseIntegrationDeviceBinding(
        inputBinding,
      );

    if (
      !binding
      || bindings.has(
        bindingKey(binding.bindingId),
      )
    ) {
      return decision(
        false,
        'invalid_input',
      );
    }

    bindings.set(
      bindingKey(binding.bindingId),
      binding,
    );
  }

  for (const action of routine.actions) {
    const binding =
      bindings.get(
        bindingKey(action.bindingId),
      );

    if (
      !binding
      || binding.accountId
        !== routine.accountId
      || binding.workspaceId
        !== routine.workspaceId
      || binding.bindingId
        !== action.bindingId
      || binding.revision
        !== action.bindingRevision
      || binding.deviceId
        !== action.deviceId
    ) {
      return decision(
        false,
        'binding_mismatch',
      );
    }

    if (
      binding.state !== 'active'
      && !allowInactive
    ) {
      return decision(
        false,
        'binding_revoked',
      );
    }

    if (
      !allowInactive
      && !binding.capabilities.includes(
        action.capability,
      )
    ) {
      return decision(
        false,
        'capability_not_admitted',
      );
    }

    if (
      !allowInactive
      && !policy.allowedCapabilities.includes(
        action.capability,
      )
    ) {
      return decision(
        false,
        'capability_policy_denied',
      );
    }
  }

  return decision(
    true,
    'authorized',
  );
}

export function authorizeIntegrationAutomationDefinition(
  input: unknown,
  trustedEvaluationTimeInput: unknown,
  allowInactive = false,
): IntegrationCompositionDecision {
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
      'routine',
      'automation',
      'bindings',
    ]);

  if (
    Object.keys(record).length
      !== keys.size
    || Object.keys(record).some(
      (key) => !keys.has(key),
    )
  ) {
    return decision(
      false,
      'invalid_input',
    );
  }

  const routineDecision =
    authorizeIntegrationRoutineDefinition(
      {
        policy: record.policy,
        routine: record.routine,
        bindings: record.bindings,
      },
      trustedEvaluationTimeInput,
      allowInactive,
    );

  if (!routineDecision.authorized) {
    return routineDecision;
  }

  const policy =
    parseIntegrationPolicy(
      record.policy,
    );
  const routine =
    parseIntegrationRoutine(
      record.routine,
    );
  const automation =
    parseIntegrationAutomation(
      record.automation,
    );
  const nowMs =
    parseTrustedEvaluationTime(
      trustedEvaluationTimeInput,
    );

  if (
    !policy
    || !routine
    || !automation
    || nowMs === null
    || automation.updatedAtMs > nowMs
  ) {
    return decision(
      false,
      'invalid_input',
    );
  }

  if (
    automation.accountId
      !== policy.accountId
    || automation.workspaceId
      !== policy.workspaceId
    || automation.policyId
      !== policy.policyId
    || automation.policyRevision
      !== policy.revision
    || automation.routineId
      !== routine.routineId
    || automation.routineRevision
      !== routine.revision
  ) {
    return decision(
      false,
      'binding_mismatch',
    );
  }

  if (
    automation.state !== 'enabled'
    && !allowInactive
  ) {
    return decision(
      false,
      'automation_disabled',
    );
  }

  if (
    !allowInactive
    && (
      nowMs < automation.validFromMs
      || nowMs >= automation.validUntilMs
    )
  ) {
    return decision(
      false,
      'automation_window_closed',
    );
  }

  if (
    !allowInactive
    && automation.maxRunsPerHour
      > policy.maxAutomationRunsPerHour
  ) {
    return decision(
      false,
      'automation_scope_denied',
    );
  }

  for (const action of routine.actions) {
    const definition =
      integrationCapabilityDefinition(
        action.capability,
      );

    if (
      !allowInactive
      && (
        definition.approvalMode !== 'none'
        || !policy
          .automationAllowedCapabilities
          .includes(action.capability)
      )
    ) {
      return decision(
        false,
        'automation_scope_denied',
      );
    }
  }

  return decision(
    true,
    'authorized',
  );
}
