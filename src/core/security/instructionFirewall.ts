import {
  safeInteger,
  safeReference,
} from '../brain/brainSecurity';

import {
  isCapabilityId,
  type CapabilityId,
} from './capabilities';

export type InstructionSourceKind =
  | 'platform_policy'
  | 'requester_input'
  | 'conversation'
  | 'memory'
  | 'knowledge'
  | 'project_state'
  | 'tool_output'
  | 'web_content'
  | 'file_content'
  | 'integration_content';

export type InstructionAuthority =
  | 'platform'
  | 'requester'
  | 'none';

export type InstructionActionClass =
  | 'reason'
  | 'retrieve'
  | 'tool'
  | 'write'
  | 'execute'
  | 'network'
  | 'credential'
  | 'policy_change'
  | 'capability_change';

export type InstructionCandidate =
  Readonly<{
    instructionRef: string;
    sourceKind: InstructionSourceKind;
    authority: InstructionAuthority;
    actionClass: InstructionActionClass;
    capability: CapabilityId | null;
    provenanceRef: string;
    observedAtMs: number;
    expiresAtMs: number | null;
  }>;

export type InstructionFirewallDecision =
  Readonly<{
    allowed: boolean;
    treatAsData: boolean;
    requiresCapabilityCheck: boolean;
    reason:
      | 'authoritative_instruction'
      | 'requester_action_request'
      | 'non_authoritative_data'
      | 'invalid_binding'
      | 'expired_instruction'
      | 'privilege_escalation_forbidden';
  }>;

const SOURCE_KINDS =
  new Set<InstructionSourceKind>([
    'platform_policy',
    'requester_input',
    'conversation',
    'memory',
    'knowledge',
    'project_state',
    'tool_output',
    'web_content',
    'file_content',
    'integration_content',
  ]);

const AUTHORITIES =
  new Set<InstructionAuthority>([
    'platform',
    'requester',
    'none',
  ]);

const ACTION_CLASSES =
  new Set<InstructionActionClass>([
    'reason',
    'retrieve',
    'tool',
    'write',
    'execute',
    'network',
    'credential',
    'policy_change',
    'capability_change',
  ]);

const EXTERNAL_SOURCES =
  new Set<InstructionSourceKind>([
    'memory',
    'knowledge',
    'project_state',
    'tool_output',
    'web_content',
    'file_content',
    'integration_content',
  ]);

const PRIVILEGE_ACTIONS =
  new Set<InstructionActionClass>([
    'credential',
    'policy_change',
    'capability_change',
  ]);

function validCandidate(
  candidate: InstructionCandidate,
): boolean {
  return (
    safeReference(candidate.instructionRef, 240)
    && SOURCE_KINDS.has(candidate.sourceKind)
    && AUTHORITIES.has(candidate.authority)
    && ACTION_CLASSES.has(candidate.actionClass)
    && (
      candidate.capability === null
      || isCapabilityId(candidate.capability)
    )
    && safeReference(candidate.provenanceRef, 240)
    && safeInteger(candidate.observedAtMs)
    && (
      candidate.expiresAtMs === null
      || (
        safeInteger(candidate.expiresAtMs)
        && candidate.expiresAtMs
          > candidate.observedAtMs
      )
    )
  );
}

function authorityBindingValid(
  candidate: InstructionCandidate,
): boolean {
  if (
    candidate.sourceKind === 'platform_policy'
  ) {
    return candidate.authority === 'platform';
  }

  if (
    candidate.sourceKind === 'requester_input'
  ) {
    return candidate.authority === 'requester';
  }

  return candidate.authority === 'none';
}

function needsCapability(
  actionClass: InstructionActionClass,
): boolean {
  return [
    'tool',
    'write',
    'execute',
    'network',
    'credential',
    'capability_change',
  ].includes(actionClass);
}

export function evaluateInstructionFirewall(
  candidate: InstructionCandidate,
  trustedNowMs: number,
): InstructionFirewallDecision {
  if (
    !validCandidate(candidate)
    || !safeInteger(trustedNowMs)
    || candidate.observedAtMs > trustedNowMs
    || !authorityBindingValid(candidate)
  ) {
    return Object.freeze({
      allowed: false,
      treatAsData: true,
      requiresCapabilityCheck: false,
      reason: 'invalid_binding',
    });
  }

  if (
    candidate.expiresAtMs !== null
    && candidate.expiresAtMs <= trustedNowMs
  ) {
    return Object.freeze({
      allowed: false,
      treatAsData: true,
      requiresCapabilityCheck: false,
      reason: 'expired_instruction',
    });
  }

  if (
    EXTERNAL_SOURCES.has(
      candidate.sourceKind,
    )
  ) {
    return Object.freeze({
      allowed: false,
      treatAsData: true,
      requiresCapabilityCheck: false,
      reason: 'non_authoritative_data',
    });
  }

  if (
    candidate.authority === 'requester'
  ) {
    if (
      PRIVILEGE_ACTIONS.has(
        candidate.actionClass,
      )
    ) {
      return Object.freeze({
        allowed: false,
        treatAsData: false,
        requiresCapabilityCheck: true,
        reason:
          'privilege_escalation_forbidden',
      });
    }

    return Object.freeze({
      allowed: true,
      treatAsData: false,
      requiresCapabilityCheck:
        needsCapability(
          candidate.actionClass,
        ),
      reason: 'requester_action_request',
    });
  }

  return Object.freeze({
    allowed: true,
    treatAsData: false,
    requiresCapabilityCheck:
      needsCapability(candidate.actionClass),
    reason: 'authoritative_instruction',
  });
}
