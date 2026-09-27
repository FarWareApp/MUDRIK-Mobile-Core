export type EmergencyActionKind =
  | 'notify_contact'
  | 'initiate_emergency_call';

export type EmergencyActionIntent =
  Readonly<{
    actionId: string;
    kind: EmergencyActionKind;
    targetRef: string;
  }>;

const ACTION_ID =
  /^emact_[a-z0-9][a-z0-9_-]{15,63}$/;

const CONTACT_REF =
  /^emc_[a-z0-9][a-z0-9_-]{15,63}$/;

const ROUTE_ID =
  /^emroute_[a-z0-9][a-z0-9_-]{15,63}$/;

const ACTION_KEYS = new Set([
  'actionId',
  'kind',
  'targetRef',
]);

export function parseEmergencyActionIntent(
  input: unknown,
): EmergencyActionIntent | null {
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
      !== ACTION_KEYS.size
    || Object.keys(record).some(
      (key) => !ACTION_KEYS.has(key),
    )
    || typeof record.actionId !== 'string'
    || !ACTION_ID.test(record.actionId)
  ) {
    return null;
  }

  if (
    record.kind === 'notify_contact'
    && typeof record.targetRef === 'string'
    && CONTACT_REF.test(record.targetRef)
  ) {
    return Object.freeze({
      actionId: record.actionId,
      kind: record.kind,
      targetRef: record.targetRef,
    });
  }

  if (
    record.kind
      === 'initiate_emergency_call'
    && typeof record.targetRef === 'string'
    && ROUTE_ID.test(record.targetRef)
  ) {
    return Object.freeze({
      actionId: record.actionId,
      kind: record.kind,
      targetRef: record.targetRef,
    });
  }

  return null;
}
