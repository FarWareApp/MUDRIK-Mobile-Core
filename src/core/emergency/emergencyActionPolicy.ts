import {
  evaluateDeviceTrust,
} from '../identity/deviceTrust';

import {
  isIdentityId,
} from '../identity/identityIds';

import {
  parseTrustedEvaluationTime,
} from '../security/trustedEvaluationTime';

import {
  authorizeEmergencyResourceCapability,
} from './emergencyCapabilityAuthorization';

import {
  parseEmergencyActionIntent,
} from './emergencyActionIntent';

import type {
  EmergencyActionKind,
} from './emergencyActionIntent';

import {
  isEmergencyCallApproval,
} from './emergencyCallApproval';

import {
  isEmergencyEscalationPlan,
} from './emergencyEscalationPlan';

import {
  isEmergencyPacket,
} from './emergencyPacket';

import {
  isCurrentEmergencyGuardianSessionState,
  isEmergencyGuardianSessionState,
} from './emergencyGuardianSessionState';

import {
  isEmergencyRouteDescriptor,
  resolveEmergencyRoute,
} from './emergencyRoute';

export type {
  EmergencyActionIntent,
  EmergencyActionKind,
} from './emergencyActionIntent';

export type EmergencyActionDecision =
  Readonly<{
    authorized: boolean;
    reason:
      | 'authorized'
      | 'invalid_input'
      | 'simulation_only'
      | 'packet_mismatch'
      | 'state_not_current'
      | 'state_mismatch'
      | 'state_not_escalating'
      | 'countdown_active'
      | 'action_not_planned'
      | 'route_required'
      | 'route_denied'
      | 'unsupported_route_service'
      | 'confirmation_required'
      | 'device_untrusted'
      | 'capability_denied';
    actionId: string | null;
    kind: EmergencyActionKind | null;
    targetRef: string | null;
    capability:
      | 'emergency.contact.notify'
      | 'emergency.call.initiate'
      | null;
    grantId: string | null;
    grantsAuthority: false;
    performsExternalAction: false;
  }>;

const INPUT_KEYS = new Set([
  'accountId',
  'plan',
  'packet',
  'sessionState',
  'action',
  'route',
  'approval',
  'deviceTrustInput',
  'capabilityGrants',
]);

function decision(
  authorized: boolean,
  reason: EmergencyActionDecision['reason'],
  actionId: string | null = null,
  kind: EmergencyActionKind | null = null,
  targetRef: string | null = null,
  capability:
    EmergencyActionDecision['capability'] = null,
  grantId: string | null = null,
): EmergencyActionDecision {
  return Object.freeze({
    authorized,
    reason,
    actionId,
    kind,
    targetRef,
    capability,
    grantId,
    grantsAuthority: false,
    performsExternalAction: false,
  });
}

function trustBindingMatches(
  input: unknown,
  accountId: string,
  deviceId: string,
): boolean {
  if (
    typeof input !== 'object'
    || input === null
    || Array.isArray(input)
  ) {
    return false;
  }

  const record =
    input as Record<string, unknown>;

  return (
    record.expectedAccountId === accountId
    && record.expectedDeviceId === deviceId
    && evaluateDeviceTrust(input).trusted
  );
}

function packetMatchesPlan(
  packet: {
    readonly emergencySessionId: string;
    readonly accountId: string;
    readonly createdAtMs: number;
    readonly simulated: boolean;
  },
  plan: {
    readonly emergencySessionId: string;
    readonly accountId: string;
    readonly createdAtMs: number;
    readonly simulationOnly: boolean;
  },
  nowMs: number,
): boolean {
  return (
    packet.emergencySessionId
      === plan.emergencySessionId
    && packet.accountId === plan.accountId
    && packet.simulated
      === plan.simulationOnly
    && packet.createdAtMs >= plan.createdAtMs
    && packet.createdAtMs <= nowMs
  );
}

function approvalMatches(
  approval: unknown,
  plan: {
    readonly emergencySessionId: string;
    readonly accountId: string;
    readonly sourceDeviceId: string;
    readonly generation: number;
    readonly createdAtMs: number;
  },
  action: {
    readonly actionId: string;
  },
  route: {
    readonly routeId: string;
    readonly declaredAtMs: number;
  },
  nowMs: number,
): boolean {
  return (
    isEmergencyCallApproval(approval)
    && approval.actionId === action.actionId
    && approval.routeId === route.routeId
    && approval.emergencySessionId
      === plan.emergencySessionId
    && approval.accountId === plan.accountId
    && approval.sourceDeviceId
      === plan.sourceDeviceId
    && approval.generation === plan.generation
    && approval.approvedAtMs >= plan.createdAtMs
    && approval.approvedAtMs >= route.declaredAtMs
    && approval.approvedAtMs <= nowMs
  );
}

export function evaluateEmergencyAction(
  input: unknown,
  trustedEvaluationTimeInput: unknown,
  trustedRouteContextInput: unknown,
): EmergencyActionDecision {
  const nowMs =
    parseTrustedEvaluationTime(
      trustedEvaluationTimeInput,
    );

  if (
    nowMs === null
    || typeof input !== 'object'
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

  if (
    Object.keys(record).length
      !== INPUT_KEYS.size
    || Object.keys(record).some(
      (key) => !INPUT_KEYS.has(key),
    )
    || !isIdentityId(
      'account',
      record.accountId,
    )
    || !isEmergencyEscalationPlan(
      record.plan,
    )
    || !isEmergencyPacket(
      record.packet,
    )
    || !isEmergencyGuardianSessionState(
      record.sessionState,
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

  const action =
    parseEmergencyActionIntent(
      record.action,
    );

  if (!action) {
    return decision(
      false,
      'invalid_input',
    );
  }

  const plan = record.plan;
  const packet = record.packet;

  if (
    record.accountId !== plan.accountId
    || !packetMatchesPlan(
      packet,
      plan,
      nowMs,
    )
  ) {
    return decision(
      false,
      'packet_mismatch',
      action.actionId,
      action.kind,
      action.targetRef,
    );
  }

  if (plan.simulationOnly) {
    return decision(
      false,
      'simulation_only',
      action.actionId,
      action.kind,
      action.targetRef,
    );
  }

  const sessionState =
    record.sessionState;

  if (
    !isCurrentEmergencyGuardianSessionState(
      sessionState,
    )
  ) {
    return decision(
      false,
      'state_not_current',
      action.actionId,
      action.kind,
      action.targetRef,
    );
  }

  if (
    sessionState.session.emergencySessionId
      !== plan.emergencySessionId
    || sessionState.session.accountId
      !== plan.accountId
    || sessionState.session.sourceDeviceId
      !== plan.sourceDeviceId
    || sessionState.state.generation
      !== plan.generation
  ) {
    return decision(
      false,
      'state_mismatch',
      action.actionId,
      action.kind,
      action.targetRef,
    );
  }

  if (
    sessionState.state.phase
      !== 'escalating'
  ) {
    return decision(
      false,
      'state_not_escalating',
      action.actionId,
      action.kind,
      action.targetRef,
    );
  }

  if (nowMs < plan.actionNotBeforeMs) {
    return decision(
      false,
      'countdown_active',
      action.actionId,
      action.kind,
      action.targetRef,
    );
  }

  if (
    !trustBindingMatches(
      record.deviceTrustInput,
      plan.accountId,
      plan.sourceDeviceId,
    )
  ) {
    return decision(
      false,
      'device_untrusted',
      action.actionId,
      action.kind,
      action.targetRef,
    );
  }

  let targetRef: string;
  let capability:
    'emergency.contact.notify'
    | 'emergency.call.initiate';

  if (action.kind === 'notify_contact') {
    if (
      record.route !== null
      || record.approval !== null
    ) {
      return decision(
        false,
        'invalid_input',
        action.actionId,
        action.kind,
        action.targetRef,
      );
    }

    const planned =
      plan.steps.some(
        (entry) =>
          entry.kind === 'notify_contact'
          && entry.targetRef
            === action.targetRef
          && entry.requiredCapability
            === 'emergency.contact.notify'
          && entry.simulated === false,
      );

    if (!planned) {
      return decision(
        false,
        'action_not_planned',
        action.actionId,
        action.kind,
        action.targetRef,
      );
    }

    targetRef = action.targetRef;
    capability =
      'emergency.contact.notify';
  } else {
    if (
      !isEmergencyRouteDescriptor(
        record.route,
      )
      || record.route.routeId
        !== action.targetRef
    ) {
      return decision(
        false,
        'route_required',
        action.actionId,
        action.kind,
        action.targetRef,
      );
    }

    const routeResolution =
      resolveEmergencyRoute(
        {
          plan,
          route: record.route,
        },
        nowMs,
        trustedRouteContextInput,
      );

    if (
      !routeResolution.accepted
      || !routeResolution.route
    ) {
      return decision(
        false,
        'route_denied',
        action.actionId,
        action.kind,
        action.targetRef,
      );
    }

    const route =
      routeResolution.route;

    if (
      route.serviceKind
        !== 'emergency_call'
    ) {
      return decision(
        false,
        'unsupported_route_service',
        action.actionId,
        action.kind,
        action.targetRef,
      );
    }

    const approvalValid =
      approvalMatches(
        record.approval,
        plan,
        action,
        route,
        nowMs,
      );

    if (
      record.approval !== null
      && !approvalValid
    ) {
      return decision(
        false,
        'invalid_input',
        action.actionId,
        action.kind,
        action.targetRef,
      );
    }

    if (
      (
        route.requiresUserConfirmation
        || !route.unattendedSupported
      )
      && !approvalValid
    ) {
      return decision(
        false,
        'confirmation_required',
        action.actionId,
        action.kind,
        action.targetRef,
      );
    }

    targetRef = route.destinationRef;
    capability =
      'emergency.call.initiate';
  }

  const authorization =
    authorizeEmergencyResourceCapability(
      plan.sourceDeviceId,
      capability,
      targetRef,
      record.capabilityGrants,
      nowMs,
    );

  if (!authorization.allowed) {
    return decision(
      false,
      'capability_denied',
      action.actionId,
      action.kind,
      targetRef,
      capability,
    );
  }

  return decision(
    true,
    'authorized',
    action.actionId,
    action.kind,
    targetRef,
    capability,
    authorization.grantId
      ?? null,
  );
}
