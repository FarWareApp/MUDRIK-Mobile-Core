import {
  isIdentityId,
} from '../identity/identityIds';

export type DeviceFindingLocateAction =
  | 'ring'
  | 'vibrate'
  | 'flash'
  | 'wake';

export type DeviceFindingAdapterStatus =
  | 'ready'
  | 'degraded'
  | 'unavailable';

export type DeviceFindingAdapterDescriptor = Readonly<{
  adapterId: string;
  deviceId: string;
  status: DeviceFindingAdapterStatus;
  supportedActions: readonly DeviceFindingLocateAction[];
  revision: number;
  declaredAt: number;
  expiresAt: number;
  grantsAuthority: false;
}>;

const ADAPTER_ID =
  /^findad_[a-z0-9][a-z0-9_-]{15,63}$/;

const ACTIONS:
  readonly DeviceFindingLocateAction[] = [
    'ring',
    'vibrate',
    'flash',
    'wake',
  ];

const STATUSES:
  readonly DeviceFindingAdapterStatus[] = [
    'ready',
    'degraded',
    'unavailable',
  ];

const KEYS = new Set([
  'adapterId',
  'deviceId',
  'status',
  'supportedActions',
  'revision',
  'declaredAt',
  'expiresAt',
]);

const MAX_TTL_MS = 5 * 60_000;

function isSafeIntegerAtLeast(
  value: unknown,
  minimum: number,
): value is number {
  return (
    typeof value === 'number'
    && Number.isSafeInteger(value)
    && value >= minimum
  );
}

export function isDeviceFindingLocateAction(
  value: unknown,
): value is DeviceFindingLocateAction {
  return (
    typeof value === 'string'
    && ACTIONS.includes(
      value as DeviceFindingLocateAction,
    )
  );
}

export function parseDeviceFindingAdapterDescriptor(
  input: unknown,
): DeviceFindingAdapterDescriptor | null {
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
    Object.keys(record).length !== KEYS.size
    || Object.keys(record).some(
      (key) => !KEYS.has(key),
    )
    || typeof record.adapterId !== 'string'
    || !ADAPTER_ID.test(record.adapterId)
    || !isIdentityId(
      'device',
      record.deviceId,
    )
    || typeof record.status !== 'string'
    || !STATUSES.includes(
      record.status
        as DeviceFindingAdapterStatus,
    )
    || !Array.isArray(
      record.supportedActions,
    )
    || record.supportedActions.length === 0
    || record.supportedActions.length
      > ACTIONS.length
    || !isSafeIntegerAtLeast(
      record.revision,
      1,
    )
    || !isSafeIntegerAtLeast(
      record.declaredAt,
      0,
    )
    || !isSafeIntegerAtLeast(
      record.expiresAt,
      0,
    )
    || record.expiresAt
      <= record.declaredAt
    || record.expiresAt
      - record.declaredAt
      > MAX_TTL_MS
  ) {
    return null;
  }

  const supportedActions:
    DeviceFindingLocateAction[] = [];
  const seen =
    new Set<DeviceFindingLocateAction>();

  for (
    const value
    of record.supportedActions
  ) {
    if (
      !isDeviceFindingLocateAction(value)
      || seen.has(value)
    ) {
      return null;
    }

    seen.add(value);
    supportedActions.push(value);
  }

  return Object.freeze({
    adapterId: record.adapterId,
    deviceId: record.deviceId,
    status:
      record.status
        as DeviceFindingAdapterStatus,
    supportedActions:
      Object.freeze(supportedActions),
    revision: record.revision,
    declaredAt: record.declaredAt,
    expiresAt: record.expiresAt,
    grantsAuthority: false,
  });
}
