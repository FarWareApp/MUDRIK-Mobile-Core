import {
  isIdentityId,
} from '../identity/identityIds';

import {
  createSecurityEvent,
} from '../security/securityEvent';

import type {
  SecurityEvent,
  SecurityEventSeverity,
  SecurityEventType,
} from '../security/securityEvent';

import {
  isEmergencySessionId,
} from './emergencyEvidence';

import type {
  EmergencyGuardianPhase,
} from './emergencyGuardianState';

export type EmergencyAuditKind =
  | 'state_transition'
  | 'escalation_planned'
  | 'action_authorized'
  | 'action_denied'
  | 'route_rejected'
  | 'simulation_blocked';

export type EmergencyAuditInput =
  Readonly<{
    eventId: string;
    kind: EmergencyAuditKind;
    occurredAtMs: number;
    accountRef: string;
    deviceRef: string;
    emergencySessionId: string;
    phase?: EmergencyGuardianPhase;
    previousPhase?: EmergencyGuardianPhase;
    actionRef?: string;
    routeRef?: string;
    reason?: string;
    simulated?: boolean;
  }>;

const EVENT_ID =
  /^emaud_[a-z0-9][a-z0-9_-]{15,63}$/;

const ACTION_REF =
  /^emact_[a-z0-9][a-z0-9_-]{15,63}$/;

const ROUTE_REF =
  /^emroute_[a-z0-9][a-z0-9_-]{15,63}$/;

const REASON =
  /^[a-z][a-z0-9_]{0,63}$/;

const PHASES:
  readonly EmergencyGuardianPhase[] = [
    'normal',
    'watch',
    'check_user',
    'urgent',
    'critical',
    'escalating',
    'resolved',
  ];

const KINDS:
  readonly EmergencyAuditKind[] = [
    'state_transition',
    'escalation_planned',
    'action_authorized',
    'action_denied',
    'route_rejected',
    'simulation_blocked',
  ];

const ALLOWED_KEYS = new Set([
  'eventId',
  'kind',
  'occurredAtMs',
  'accountRef',
  'deviceRef',
  'emergencySessionId',
  'phase',
  'previousPhase',
  'actionRef',
  'routeRef',
  'reason',
  'simulated',
]);

const EVENT_MAP:
  Readonly<Record<
    EmergencyAuditKind,
    Readonly<{
      type: SecurityEventType;
      severity: SecurityEventSeverity;
    }>
  >> = {
    state_transition: {
      type: 'emergency.state_transition',
      severity: 'info',
    },
    escalation_planned: {
      type: 'emergency.escalation_planned',
      severity: 'warning',
    },
    action_authorized: {
      type: 'emergency.action_authorized',
      severity: 'high',
    },
    action_denied: {
      type: 'emergency.action_denied',
      severity: 'warning',
    },
    route_rejected: {
      type: 'emergency.route_rejected',
      severity: 'warning',
    },
    simulation_blocked: {
      type: 'emergency.simulation_blocked',
      severity: 'info',
    },
  };

function isPhase(
  value: unknown,
): value is EmergencyGuardianPhase {
  return (
    typeof value === 'string'
    && PHASES.includes(
      value as EmergencyGuardianPhase,
    )
  );
}

function optionalPhase(
  value: unknown,
): value is EmergencyGuardianPhase | undefined {
  return (
    value === undefined
    || isPhase(value)
  );
}

function optionalPattern(
  value: unknown,
  pattern: RegExp,
): value is string | undefined {
  return (
    value === undefined
    || (
      typeof value === 'string'
      && pattern.test(value)
    )
  );
}

export function createEmergencyAuditEvent(
  input: unknown,
): SecurityEvent | null {  if (
    typeof input !== 'object'
    || input === null
    || Array.isArray(input)
  ) {
    return null;
  }

  const record =
    input as Record<string, unknown>;

  if (
    Object.keys(record).some(
      (key) => !ALLOWED_KEYS.has(key),
    )
    || typeof record.eventId !== 'string'
    || !EVENT_ID.test(record.eventId)
    || !KINDS.includes(
      record.kind as EmergencyAuditKind,
    )
    || typeof record.occurredAtMs !== 'number'
    || !Number.isSafeInteger(
      record.occurredAtMs,
    )
    || record.occurredAtMs < 0
    || !isIdentityId(
      'account',
      record.accountRef,
    )
    || !isIdentityId(
      'device',
      record.deviceRef,
    )    || !isEmergencySessionId(
      record.emergencySessionId,
    )
    || !optionalPhase(record.phase)
    || !optionalPhase(
      record.previousPhase,
    )
    || !optionalPattern(
      record.actionRef,
      ACTION_REF,
    )
    || !optionalPattern(
      record.routeRef,
      ROUTE_REF,
    )
    || (
      record.reason !== undefined
      && (
        typeof record.reason !== 'string'
        || !REASON.test(record.reason)
      )
    )
    || (
      record.simulated !== undefined
      && typeof record.simulated
        !== 'boolean'
    )
  ) {
    return null;
  }

  const kind =
    record.kind as EmergencyAuditKind;
  const mapping = EVENT_MAP[kind];  const metadata:
    Record<
      string,
      string | number | boolean | null
    > = {
      emergencySessionId:
        record.emergencySessionId,
    };

  if (record.phase !== undefined) {
    metadata.phase = record.phase;
  }

  if (record.previousPhase !== undefined) {
    metadata.previousPhase =
      record.previousPhase;
  }

  if (record.actionRef !== undefined) {
    metadata.actionRef =
      record.actionRef;
  }

  if (record.routeRef !== undefined) {
    metadata.routeRef =
      record.routeRef;
  }

  if (record.reason !== undefined) {
    metadata.reason = record.reason;
  }

  if (record.simulated !== undefined) {
    metadata.simulated =
      record.simulated;
  }

  return createSecurityEvent({
    eventId: record.eventId,
    type: mapping.type,
    severity: mapping.severity,
    occurredAtMs: record.occurredAtMs,
    actorRef: record.accountRef,
    deviceRef: record.deviceRef,
    metadata,
  });
}
