import {
  isIdentityId,
  isPublicKeyThumbprint,
} from './identityIds';

export type DeviceTrustState =
  | 'pending_pairing'
  | 'active'
  | 'rotation_required'
  | 'suspended'
  | 'revoked';

export type DeviceTrustDecisionReason =
  | 'trusted'
  | 'invalid_device'
  | 'account_mismatch'
  | 'device_mismatch'
  | 'device_key_mismatch'
  | 'thumbprint_mismatch'
  | 'pending_pairing'
  | 'rotation_required'
  | 'suspended'
  | 'revoked';

export type DeviceTrustDecision = Readonly<{
  trusted: boolean;
  reason: DeviceTrustDecisionReason;
}>;

type DeviceTrustRecord = Readonly<{
  deviceId: string;
  accountId: string;
  deviceKeyId: string;
  publicKeyThumbprint: string;
  state: DeviceTrustState;
  hardwareBacked: boolean;
}>;

function isDeviceState(value: unknown): value is DeviceTrustState {
  return (
    value === 'pending_pairing' ||
    value === 'active' ||
    value === 'rotation_required' ||
    value === 'suspended' ||
    value === 'revoked'
  );
}

function parseDevice(value: unknown): DeviceTrustRecord | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const allowedKeys = new Set([
    'deviceId',
    'accountId',
    'deviceKeyId',
    'publicKeyThumbprint',
    'state',
    'hardwareBacked',
  ]);

  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return null;
  }

  if (
    !isIdentityId('device', record.deviceId) ||
    !isIdentityId('account', record.accountId) ||
    !isIdentityId('device_key', record.deviceKeyId) ||
    !isPublicKeyThumbprint(record.publicKeyThumbprint) ||
    !isDeviceState(record.state) ||
    typeof record.hardwareBacked !== 'boolean'
  ) {
    return null;
  }

  return record as DeviceTrustRecord;
}

export function evaluateDeviceTrust(input: unknown): DeviceTrustDecision {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { trusted: false, reason: 'invalid_device' };
  }

  const wrapper = input as Record<string, unknown>;
  const allowedKeys = new Set([
    'device',
    'expectedAccountId',
    'expectedDeviceId',
    'expectedDeviceKeyId',
    'expectedPublicKeyThumbprint',
  ]);

  if (Object.keys(wrapper).some((key) => !allowedKeys.has(key))) {
    return { trusted: false, reason: 'invalid_device' };
  }

  const device = parseDevice(wrapper.device);
  if (
    !device ||
    !isIdentityId('account', wrapper.expectedAccountId) ||
    !isIdentityId('device', wrapper.expectedDeviceId) ||
    !isIdentityId('device_key', wrapper.expectedDeviceKeyId) ||
    !isPublicKeyThumbprint(wrapper.expectedPublicKeyThumbprint)
  ) {
    return { trusted: false, reason: 'invalid_device' };
  }

  if (device.accountId !== wrapper.expectedAccountId) {
    return { trusted: false, reason: 'account_mismatch' };
  }

  if (device.deviceId !== wrapper.expectedDeviceId) {
    return { trusted: false, reason: 'device_mismatch' };
  }

  if (device.deviceKeyId !== wrapper.expectedDeviceKeyId) {
    return { trusted: false, reason: 'device_key_mismatch' };
  }

  if (device.publicKeyThumbprint !== wrapper.expectedPublicKeyThumbprint) {
    return { trusted: false, reason: 'thumbprint_mismatch' };
  }

  switch (device.state) {
    case 'active':
      return { trusted: true, reason: 'trusted' };
    case 'pending_pairing':
      return { trusted: false, reason: 'pending_pairing' };
    case 'rotation_required':
      return { trusted: false, reason: 'rotation_required' };
    case 'suspended':
      return { trusted: false, reason: 'suspended' };
    case 'revoked':
      return { trusted: false, reason: 'revoked' };
    default:
      return { trusted: false, reason: 'invalid_device' };
  }
}
