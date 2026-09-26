import {
  isIdentityId,
} from '../identity/identityIds';

import {
  isEmergencySessionId,
} from './emergencyEvidence';

export type EmergencyUserEventKind =
  | 'user_ok'
  | 'user_cancel';

export type EmergencyUserEvent = Readonly<{
  emergencySessionId: string;
  eventId: string;
  sequence: number;
  accountId: string;
  sourceDeviceId: string;
  generation: number;
  kind: EmergencyUserEventKind;
  grantsAuthority: false;
  performsExternalAction: false;
}>;

const EVENT_ID =
  /^emev_[a-z0-9][a-z0-9_-]{15,63}$/;

const INPUT_KEYS = new Set([
  'emergencySessionId',
  'eventId',
  'sequence',
  'accountId',
  'sourceDeviceId',
  'generation',
  'kind',
]);

const KINDS:
  readonly EmergencyUserEventKind[] = [
    'user_ok',
    'user_cancel',
  ];

export function isEmergencyEventId(
  value: unknown,
): value is string {
  return (
    typeof value === 'string'
    && EVENT_ID.test(value)
  );
}

function isKind(
  value: unknown,
): value is EmergencyUserEventKind {
  return (
    typeof value === 'string'
    && KINDS.includes(
      value as EmergencyUserEventKind,
    )
  );
}

export function parseEmergencyUserEvent(
  input: unknown,
): EmergencyUserEvent | null {
  if (
    typeof input !== 'object'
    || input === null
    || Array.isArray(input)
  ) {
    return null;
  }

  const record =
    input as Record<string, unknown>;

  if (
    Object.keys(record).length
      !== INPUT_KEYS.size
    || Object.keys(record).some(
      (key) => !INPUT_KEYS.has(key),
    )
    || !isEmergencySessionId(
      record.emergencySessionId,
    )
    || !isEmergencyEventId(
      record.eventId,
    )
    || typeof record.sequence !== 'number'
    || !Number.isSafeInteger(
      record.sequence,
    )
    || record.sequence < 0
    || !isIdentityId(
      'account',
      record.accountId,
    )
    || !isIdentityId(
      'device',
      record.sourceDeviceId,
    )
    || typeof record.generation !== 'number'
    || !Number.isSafeInteger(
      record.generation,
    )
    || record.generation < 0
    || !isKind(record.kind)
  ) {
    return null;
  }

  return Object.freeze({
    emergencySessionId:
      record.emergencySessionId,
    eventId: record.eventId,
    sequence: record.sequence,
    accountId: record.accountId,
    sourceDeviceId:
      record.sourceDeviceId,
    generation: record.generation,
    kind: record.kind,
    grantsAuthority: false,
    performsExternalAction: false,
  });
}
