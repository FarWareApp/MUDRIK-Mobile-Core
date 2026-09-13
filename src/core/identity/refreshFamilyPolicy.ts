import { isIdentityId } from './identityIds';

export type RefreshFamilyState =
  | 'active'
  | 'suspected_reuse'
  | 'revoked';

export type RefreshDecisionReason =
  | 'rotate_allowed'
  | 'invalid_refresh_state'
  | 'account_mismatch'
  | 'device_mismatch'
  | 'family_mismatch'
  | 'revoked'
  | 'suspected_reuse'
  | 'generation_mismatch';

export type RefreshDecision = Readonly<{
  allowed: boolean;
  reason: RefreshDecisionReason;
  nextGeneration?: number;
}>;

type RefreshFamilyRecord = Readonly<{
  refreshFamilyId: string;
  accountId: string;
  deviceId: string;
  currentGeneration: number;
  state: RefreshFamilyState;
}>;

function isRefreshState(value: unknown): value is RefreshFamilyState {
  return value === 'active' || value === 'suspected_reuse' || value === 'revoked';
}

function parseFamily(value: unknown): RefreshFamilyRecord | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const allowedKeys = new Set([
    'refreshFamilyId',
    'accountId',
    'deviceId',
    'currentGeneration',
    'state',
  ]);

  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return null;
  }

  if (
    !isIdentityId('refresh_family', record.refreshFamilyId) ||
    !isIdentityId('account', record.accountId) ||
    !isIdentityId('device', record.deviceId) ||
    typeof record.currentGeneration !== 'number' ||
    !Number.isSafeInteger(record.currentGeneration) ||
    record.currentGeneration < 0 ||
    !isRefreshState(record.state)
  ) {
    return null;
  }

  return record as RefreshFamilyRecord;
}

export function evaluateRefreshRotation(input: unknown): RefreshDecision {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { allowed: false, reason: 'invalid_refresh_state' };
  }

  const wrapper = input as Record<string, unknown>;
  const allowedKeys = new Set([
    'family',
    'expectedAccountId',
    'expectedDeviceId',
    'expectedFamilyId',
    'presentedGeneration',
  ]);

  if (Object.keys(wrapper).some((key) => !allowedKeys.has(key))) {
    return { allowed: false, reason: 'invalid_refresh_state' };
  }

  const family = parseFamily(wrapper.family);
  if (
    !family ||
    !isIdentityId('account', wrapper.expectedAccountId) ||
    !isIdentityId('device', wrapper.expectedDeviceId) ||
    !isIdentityId('refresh_family', wrapper.expectedFamilyId) ||
    typeof wrapper.presentedGeneration !== 'number' ||
    !Number.isSafeInteger(wrapper.presentedGeneration) ||
    wrapper.presentedGeneration < 0
  ) {
    return { allowed: false, reason: 'invalid_refresh_state' };
  }

  if (family.accountId !== wrapper.expectedAccountId) {
    return { allowed: false, reason: 'account_mismatch' };
  }

  if (family.deviceId !== wrapper.expectedDeviceId) {
    return { allowed: false, reason: 'device_mismatch' };
  }

  if (family.refreshFamilyId !== wrapper.expectedFamilyId) {
    return { allowed: false, reason: 'family_mismatch' };
  }

  if (family.state === 'revoked') {
    return { allowed: false, reason: 'revoked' };
  }

  if (family.state === 'suspected_reuse') {
    return { allowed: false, reason: 'suspected_reuse' };
  }

  if (wrapper.presentedGeneration !== family.currentGeneration) {
    if (wrapper.presentedGeneration < family.currentGeneration) {
      return { allowed: false, reason: 'suspected_reuse' };
    }

    return { allowed: false, reason: 'generation_mismatch' };
  }

  return {
    allowed: true,
    reason: 'rotate_allowed',
    nextGeneration: family.currentGeneration + 1,
  };
}
