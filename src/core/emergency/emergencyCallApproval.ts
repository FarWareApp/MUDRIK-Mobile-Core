import {
  parseTrustedEvaluationTime,
} from '../security/trustedEvaluationTime';

import {
  parseEmergencyActionIntent,
} from './emergencyActionIntent';

import {
  isEmergencyEscalationPlan,
} from './emergencyEscalationPlan';

import {
  isRegistryAcceptedEmergencyUserEvent,
} from './emergencyEventRegistry';

import {
  isEmergencyRouteDescriptor,
} from './emergencyRoute';

export type EmergencyCallApproval =
  Readonly<{
    confirmationEventId: string;
    actionId: string;
    routeId: string;
    emergencySessionId: string;
    accountId: string;
    sourceDeviceId: string;
    generation: number;    approvedAtMs: number;
    grantsAuthority: false;
    performsExternalAction: false;
  }>;

export type EmergencyCallApprovalResult =
  Readonly<{
    accepted: boolean;
    idempotent: boolean;
    approval: EmergencyCallApproval | null;
    reason:
      | 'approved'
      | 'duplicate'
      | 'invalid_input'
      | 'simulation_only'
      | 'wrong_event_kind'
      | 'binding_mismatch'
      | 'event_before_plan'
      | 'event_before_route'
      | 'future_event'
      | 'confirmation_replay';
    grantsAuthority: false;
    performsExternalAction: false;
  }>;

const INPUT_KEYS = new Set([
  'plan',
  'route',
  'action',
  'event',
]);

const issuedApprovals =
  new WeakSet<object>();

const approvalByEvent =
  new WeakMap<
    object,
    EmergencyCallApproval
  >();

function result(
  accepted: boolean,
  idempotent: boolean,
  approval: EmergencyCallApproval | null,
  reason:
    EmergencyCallApprovalResult['reason'],
): EmergencyCallApprovalResult {
  return Object.freeze({
    accepted,
    idempotent,
    approval,
    reason,
    grantsAuthority: false,
    performsExternalAction: false,
  });
}

export function isEmergencyCallApproval(
  value: unknown,
): value is EmergencyCallApproval {
  return (
    typeof value === 'object'    && value !== null
    && issuedApprovals.has(value)
  );
}

function sameBinding(
  approval: EmergencyCallApproval,
  actionId: string,
  routeId: string,
): boolean {
  return (
    approval.actionId === actionId
    && approval.routeId === routeId
  );
}

export function approveEmergencyCall(
  input: unknown,
  trustedEvaluationTimeInput: unknown,
): EmergencyCallApprovalResult {
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
    return result(
      false,      false,
      null,
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
    || !isEmergencyEscalationPlan(
      record.plan,
    )
    || !isEmergencyRouteDescriptor(
      record.route,
    )
    || !isRegistryAcceptedEmergencyUserEvent(
      record.event,
    )
  ) {
    return result(
      false,
      false,
      null,
      'invalid_input',
    );
  }

  const action =
    parseEmergencyActionIntent(
      record.action,
    );

  if (
    !action
    || action.kind
      !== 'initiate_emergency_call'
  ) {
    return result(
      false,
      false,
      null,
      'invalid_input',
    );
  }

  const plan = record.plan;
  const route = record.route;
  const event = record.event;

  if (plan.simulationOnly) {
    return result(
      false,
      false,
      null,
      'simulation_only',
    );
  }

  if (
    event.kind
      !== 'confirm_emergency_call'
  ) {    return result(
      false,
      false,
      null,
      'wrong_event_kind',
    );
  }

  if (
    action.targetRef !== route.routeId
    || route.emergencySessionId
      !== plan.emergencySessionId
    || route.accountId !== plan.accountId
    || route.sourceDeviceId
      !== plan.sourceDeviceId
    || event.emergencySessionId
      !== plan.emergencySessionId
    || event.accountId !== plan.accountId
    || event.sourceDeviceId
      !== plan.sourceDeviceId
    || event.generation
      !== plan.generation
  ) {
    return result(
      false,
      false,
      null,
      'binding_mismatch',
    );
  }

  if (event.acceptedAtMs < plan.createdAtMs) {
    return result(
      false,
      false,
      null,
      'event_before_plan',
    );
  }

  if (
    event.acceptedAtMs
      < route.declaredAtMs
  ) {
    return result(
      false,
      false,
      null,
      'event_before_route',
    );
  }

  if (event.acceptedAtMs > nowMs) {
    return result(
      false,
      false,
      null,
      'future_event',
    );
  }

  const existing =
    approvalByEvent.get(event);

  if (existing) {    if (
      sameBinding(
        existing,
        action.actionId,
        route.routeId,
      )
    ) {
      return result(
        true,
        true,
        existing,
        'duplicate',
      );
    }

    return result(
      false,
      false,
      null,
      'confirmation_replay',
    );
  }

  const approval: EmergencyCallApproval =
    Object.freeze({
      confirmationEventId:
        event.eventId,
      actionId: action.actionId,
      routeId: route.routeId,
      emergencySessionId:
        plan.emergencySessionId,
      accountId: plan.accountId,
      sourceDeviceId:
        plan.sourceDeviceId,      generation: plan.generation,
      approvedAtMs:
        event.acceptedAtMs,
      grantsAuthority: false,
      performsExternalAction: false,
    });

  approvalByEvent.set(
    event,
    approval,
  );
  issuedApprovals.add(approval);

  return result(
    true,
    false,
    approval,
    'approved',
  );
}
