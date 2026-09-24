import {
  isIdentityId,
} from '../identity/identityIds';

import {
  isDeviceMediaIntentKind,
} from './deviceMediaIntent';

import type {
  DeviceMediaIntentKind,
} from './deviceMediaIntent';

export type DeviceMediaAdapterClass =
  | 'television'
  | 'phone'
  | 'tablet'
  | 'desktop'
  | 'laptop'
  | 'smart_display'
  | 'game_console'
  | 'streaming_box'
  | 'speaker'
  | 'headset'
  | 'vehicle_infotainment'
  | 'ar'
  | 'vr';

export type DeviceMediaAdapterStatus =
  | 'ready'
  | 'degraded'
  | 'unavailable';

export type DeviceMediaAdapterDescriptor = Readonly<{
  adapterId: string;
  deviceId: string;
  deviceClass: DeviceMediaAdapterClass;
  status: DeviceMediaAdapterStatus;
  supportedIntents: readonly DeviceMediaIntentKind[];
  revision: number;
  declaredAt: number;
  expiresAt: number;
  grantsAuthority: false;
}>;

const ADAPTER_ID =
  /^adapter_[a-z0-9][a-z0-9_-]{15,63}$/;

const DEVICE_CLASSES: readonly DeviceMediaAdapterClass[] = [
  'television',
  'phone',
  'tablet',
  'desktop',
  'laptop',
  'smart_display',
  'game_console',
  'streaming_box',
  'speaker',
  'headset',
  'vehicle_infotainment',
  'ar',
  'vr',
];

const STATUSES: readonly DeviceMediaAdapterStatus[] = [
  'ready',
  'degraded',
  'unavailable',
];

const ALLOWED_KEYS = new Set([
  'adapterId',
  'deviceId',
  'deviceClass',
  'status',
  'supportedIntents',
  'revision',
  'declaredAt',
  'expiresAt',
]);

const MAX_DESCRIPTOR_TTL_MS =
  5 * 60 * 1000;

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

export function isDeviceMediaAdapterId(
  value: unknown,
): value is string {
  return (
    typeof value === 'string'
    && ADAPTER_ID.test(value)
  );
}

export function parseDeviceMediaAdapterDescriptor(
  input: unknown,
): DeviceMediaAdapterDescriptor | null {
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
    Object.keys(record).length !== ALLOWED_KEYS.size
    || Object.keys(record).some(
      (key) => !ALLOWED_KEYS.has(key),
    )
    || !isDeviceMediaAdapterId(
      record.adapterId,
    )
    || !isIdentityId(
      'device',
      record.deviceId,
    )
    || typeof record.deviceClass !== 'string'
    || !DEVICE_CLASSES.includes(
      record.deviceClass as DeviceMediaAdapterClass,
    )
    || typeof record.status !== 'string'
    || !STATUSES.includes(
      record.status as DeviceMediaAdapterStatus,
    )
    || !Array.isArray(
      record.supportedIntents,
    )
    || record.supportedIntents.length === 0
    || record.supportedIntents.length > 32
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
      > MAX_DESCRIPTOR_TTL_MS
  ) {
    return null;
  }

  const supportedIntents:
    DeviceMediaIntentKind[] = [];
  const seen =
    new Set<DeviceMediaIntentKind>();

  for (
    const value
    of record.supportedIntents
  ) {
    if (
      !isDeviceMediaIntentKind(value)
      || seen.has(value)
    ) {
      return null;
    }

    seen.add(value);
    supportedIntents.push(value);
  }

  return Object.freeze({
    adapterId: record.adapterId,
    deviceId: record.deviceId,
    deviceClass:
      record.deviceClass as DeviceMediaAdapterClass,
    status:
      record.status as DeviceMediaAdapterStatus,
    supportedIntents:
      Object.freeze(supportedIntents),
    revision: record.revision,
    declaredAt: record.declaredAt,
    expiresAt: record.expiresAt,
    grantsAuthority: false,
  });
}
