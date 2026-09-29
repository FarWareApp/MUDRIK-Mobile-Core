import {
  isCommandSurfaceId,
} from './surfaceIds';

import {
  isSafeSurfaceText,
} from './surfaceDisclosure';

export type CommandDevicePlatform =
  | 'linux'
  | 'windows'
  | 'macos'
  | 'android'
  | 'ios'
  | 'unknown';

export type CommandDevicePresence =
  | 'online'
  | 'degraded'
  | 'offline'
  | 'unknown';

export type CommandDeviceTrustState =
  | 'active'
  | 'revoked'
  | 'incompatible';

export type CommandDeviceProjection =
  Readonly<{
    accountId: string;
    deviceId: string;
    displayName: string;
    platform:
      CommandDevicePlatform;
    agentVersion: string | null;
    presence:
      CommandDevicePresence;
    trustState:
      CommandDeviceTrustState;
    lastSeenAtMs: number | null;
    revision: number;
    grantsAuthority: false;
  }>;

const KEYS = new Set([
  'accountId',
  'deviceId',
  'displayName',
  'platform',
  'agentVersion',
  'presence',
  'trustState',
  'lastSeenAtMs',
  'revision',
  'grantsAuthority',
]);

const PLATFORMS:
  readonly CommandDevicePlatform[] = [
    'linux',
    'windows',
    'macos',
    'android',
    'ios',
    'unknown',
  ];

const PRESENCE:
  readonly CommandDevicePresence[] = [
    'online',
    'degraded',
    'offline',
    'unknown',
  ];

const TRUST:
  readonly CommandDeviceTrustState[] = [
    'active',
    'revoked',
    'incompatible',
  ];

function safeInteger(
  value: unknown,
): value is number {
  return (
    Number.isSafeInteger(value)
    && (value as number) >= 0
  );
}

export function parseCommandDeviceProjection(
  input: unknown,
  expectedAccountId?: string,
): CommandDeviceProjection | null {
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
      !== KEYS.size
    || Object.keys(record).some(
      (key) => !KEYS.has(key),
    )
    || !isCommandSurfaceId(
      'account',
      record.accountId,
    )
    || (
      expectedAccountId !== undefined
      && record.accountId
        !== expectedAccountId
    )
    || !isCommandSurfaceId(
      'device',
      record.deviceId,
    )
    || !isSafeSurfaceText(
      record.displayName,
      120,
    )
    || record.displayName.length < 1
    || !PLATFORMS.includes(
      (record.platform as CommandDevicePlatform),
    )
    || (
      record.agentVersion !== null
      && (
        typeof record.agentVersion
          !== 'string'
        || record.agentVersion.length
          < 1
        || record.agentVersion.length
          > 64
      )
    )
    || !PRESENCE.includes(
      (record.presence as CommandDevicePresence),
    )
    || !TRUST.includes(
      (record.trustState as CommandDeviceTrustState),
    )
    || (
      record.lastSeenAtMs !== null
      && !safeInteger(
        record.lastSeenAtMs,
      )
    )
    || !safeInteger(record.revision)
    || record.grantsAuthority
      !== false
  ) {
    return null;
  }

  return Object.freeze({
    accountId:
      record.accountId,
    deviceId:
      record.deviceId,
    displayName:
      record.displayName,
    platform:
      (record.platform as CommandDevicePlatform),
    agentVersion:
      (record.agentVersion as string | null),
    presence:
      (record.presence as CommandDevicePresence),
    trustState:
      (record.trustState as CommandDeviceTrustState),
    lastSeenAtMs:
      (record.lastSeenAtMs as number | null),
    revision:
      record.revision,
    grantsAuthority: false,
  });
}

export function isDeviceReachableHint(
  device:
    CommandDeviceProjection,
): boolean {
  return (
    device.trustState === 'active'
    && (
      device.presence === 'online'
      || device.presence
        === 'degraded'
    )
  );
}
