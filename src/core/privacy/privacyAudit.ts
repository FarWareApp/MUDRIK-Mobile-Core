import {
  createSecurityEvent,
  type SecurityEvent,
  type SecurityEventSeverity,
  type SecurityEventType,
} from '../security/securityEvent';
import type { ObservationPrivacyPolicyState } from './observationPrivacyState';

export type PrivacyAuditKind =
  | 'state_changed'
  | 'reactivation_denied'
  | 'sensor_stop_failed'
  | 'policy_violation'
  | 'observation_unverifiable'
  | 'registry_conflict_rejected';

export type PrivacyAuditInput = Readonly<{
  eventId: string;
  kind: PrivacyAuditKind;
  occurredAtMs: number;
  deviceRef?: string;
  state?: ObservationPrivacyPolicyState;
  previousState?: ObservationPrivacyPolicyState;
  sensorId?: string;
  reason?: string;
}>;

const STATES: readonly ObservationPrivacyPolicyState[] = [
  'active',
  'visual_off',
  'ambient_off',
  'privacy_lock',
];

const KINDS: readonly PrivacyAuditKind[] = [
  'state_changed',
  'reactivation_denied',
  'sensor_stop_failed',
  'policy_violation',
  'observation_unverifiable',
  'registry_conflict_rejected',
];

const MAX_REF_LENGTH = 160;
const MAX_REASON_LENGTH = 160;
const SAFE_REF = /^[A-Za-z0-9._:@\/-]+$/;

const EVENT_MAP: Readonly<
  Record<
    PrivacyAuditKind,
    Readonly<{
      type: SecurityEventType;
      severity: SecurityEventSeverity;
    }>
  >
> = {
  state_changed: {
    type: 'privacy.state_changed',
    severity: 'info',
  },
  reactivation_denied: {
    type: 'privacy.reactivation_denied',
    severity: 'warning',
  },
  sensor_stop_failed: {
    type: 'privacy.sensor_stop_failed',
    severity: 'high',
  },
  policy_violation: {
    type: 'privacy.policy_violation',
    severity: 'high',
  },
  observation_unverifiable: {
    type: 'privacy.observation_unverifiable',
    severity: 'warning',
  },
  registry_conflict_rejected: {
    type: 'privacy.registry_conflict_rejected',
    severity: 'warning',
  },
};

function isOneOf<T extends string>(
  value: unknown,
  values: readonly T[],
): value is T {
  return (
    typeof value === 'string' &&
    values.includes(value as T)
  );
}

function isSafeOptionalRef(value: unknown): value is string | undefined {
  if (value === undefined) {
    return true;
  }

  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= MAX_REF_LENGTH &&
    SAFE_REF.test(value)
  );
}

function isSafeOptionalReason(value: unknown): value is string | undefined {
  if (value === undefined) {
    return true;
  }

  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= MAX_REASON_LENGTH &&
    !/[\u0000-\u001F\u007F]/.test(value)
  );
}

function isOptionalState(
  value: unknown,
): value is ObservationPrivacyPolicyState | undefined {
  return value === undefined || isOneOf(value, STATES);
}

export function createPrivacyAuditEvent(
  input: unknown,
): SecurityEvent | null {
  if (
    typeof input !== 'object' ||
    input === null ||
    Array.isArray(input)
  ) {
    return null;
  }

  const record = input as Record<string, unknown>;
  const allowedKeys = new Set([
    'eventId',
    'kind',
    'occurredAtMs',
    'deviceRef',
    'state',
    'previousState',
    'sensorId',
    'reason',
  ]);

  if (
    Object.keys(record).some(
      (key) => !allowedKeys.has(key),
    )
  ) {
    return null;
  }

  if (
    typeof record.eventId !== 'string' ||
    record.eventId.trim().length === 0 ||
    record.eventId.length > MAX_REF_LENGTH ||
    !Number.isFinite(record.occurredAtMs) ||
    (record.occurredAtMs as number) < 0 ||
    !isOneOf(record.kind, KINDS) ||
    !isSafeOptionalRef(record.deviceRef) ||
    !isOptionalState(record.state) ||
    !isOptionalState(record.previousState) ||
    !isSafeOptionalRef(record.sensorId) ||
    !isSafeOptionalReason(record.reason)
  ) {
    return null;
  }

  const kind = record.kind;
  const mapping = EVENT_MAP[kind];
  const metadata: Record<
    string,
    string | number | boolean | null
  > = {};

  if (record.state !== undefined) {
    metadata.state = record.state;
  }

  if (record.previousState !== undefined) {
    metadata.previousState = record.previousState;
  }

  if (record.sensorId !== undefined) {
    metadata.sensorId = record.sensorId;
  }

  if (record.reason !== undefined) {
    metadata.reason = record.reason;
  }

  return createSecurityEvent({
    eventId: record.eventId,
    type: mapping.type,
    severity: mapping.severity,
    occurredAtMs: record.occurredAtMs as number,
    deviceRef: record.deviceRef,
    metadata,
  });
}
