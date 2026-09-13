import { evaluateAuthenticationAssurance } from './authAssurance';
import { isIdentityId } from './identityIds';

export type PairingChallengeState = 'pending' | 'consumed' | 'revoked';
export type PairingTrustTier = 'standard' | 'privileged';

export type PairingDecisionReason =
  | 'allowed'
  | 'invalid_pairing'
  | 'account_mismatch'
  | 'source_device_mismatch'
  | 'target_device_mismatch'
  | 'target_key_mismatch'
  | 'source_target_collision'
  | 'source_device_not_active'
  | 'challenge_consumed'
  | 'challenge_revoked'
  | 'challenge_expired'
  | 'approval_required'
  | 'insufficient_authentication';

export type PairingDecision = Readonly<{
  allowed: boolean;
  reason: PairingDecisionReason;
}>;

type PairingChallenge = Readonly<{
  pairingChallengeId: string;
  purpose: 'device_pairing';
  accountId: string;
  sourceDeviceId: string;
  targetDeviceId: string;
  targetDeviceKeyId: string;
  trustTier: PairingTrustTier;
  issuedAtMs: number;
  expiresAtMs: number;
  state: PairingChallengeState;
}>;

function parseChallenge(value: unknown): PairingChallenge | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const allowedKeys = new Set([
    'pairingChallengeId',
    'purpose',
    'accountId',
    'sourceDeviceId',
    'targetDeviceId',
    'targetDeviceKeyId',
    'trustTier',
    'issuedAtMs',
    'expiresAtMs',
    'state',
  ]);

  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return null;
  }

  if (
    !isIdentityId('pairing_challenge', record.pairingChallengeId) ||
    record.purpose !== 'device_pairing' ||
    !isIdentityId('account', record.accountId) ||
    !isIdentityId('device', record.sourceDeviceId) ||
    !isIdentityId('device', record.targetDeviceId) ||
    !isIdentityId('device_key', record.targetDeviceKeyId) ||
    (record.trustTier !== 'standard' && record.trustTier !== 'privileged') ||
    typeof record.issuedAtMs !== 'number' ||
    !Number.isFinite(record.issuedAtMs) ||
    typeof record.expiresAtMs !== 'number' ||
    !Number.isFinite(record.expiresAtMs) ||
    record.expiresAtMs <= record.issuedAtMs ||
    (record.state !== 'pending' &&
      record.state !== 'consumed' &&
      record.state !== 'revoked')
  ) {
    return null;
  }

  return record as PairingChallenge;
}

export function evaluatePairing(input: unknown): PairingDecision {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { allowed: false, reason: 'invalid_pairing' };
  }

  const wrapper = input as Record<string, unknown>;
  const allowedKeys = new Set([
    'challenge',
    'nowMs',
    'expectedAccountId',
    'sourceDeviceId',
    'sourceDeviceAccountId',
    'sourceDeviceState',
    'targetDeviceId',
    'targetDeviceKeyId',
    'authenticationAssurance',
    'authenticatedAtMs',
    'explicitApproval',
  ]);

  if (Object.keys(wrapper).some((key) => !allowedKeys.has(key))) {
    return { allowed: false, reason: 'invalid_pairing' };
  }

  const challenge = parseChallenge(wrapper.challenge);
  if (
    !challenge ||
    typeof wrapper.nowMs !== 'number' ||
    !Number.isFinite(wrapper.nowMs) ||
    !isIdentityId('account', wrapper.expectedAccountId) ||
    !isIdentityId('device', wrapper.sourceDeviceId) ||
    !isIdentityId('account', wrapper.sourceDeviceAccountId) ||
    !isIdentityId('device', wrapper.targetDeviceId) ||
    !isIdentityId('device_key', wrapper.targetDeviceKeyId) ||
    typeof wrapper.explicitApproval !== 'boolean'
  ) {
    return { allowed: false, reason: 'invalid_pairing' };
  }

  if (
    challenge.accountId !== wrapper.expectedAccountId ||
    wrapper.sourceDeviceAccountId !== wrapper.expectedAccountId
  ) {
    return { allowed: false, reason: 'account_mismatch' };
  }

  if (
    challenge.sourceDeviceId !== wrapper.sourceDeviceId
  ) {
    return { allowed: false, reason: 'source_device_mismatch' };
  }

  if (challenge.targetDeviceId !== wrapper.targetDeviceId) {
    return { allowed: false, reason: 'target_device_mismatch' };
  }

  if (challenge.targetDeviceKeyId !== wrapper.targetDeviceKeyId) {
    return { allowed: false, reason: 'target_key_mismatch' };
  }

  if (challenge.sourceDeviceId === challenge.targetDeviceId) {
    return { allowed: false, reason: 'source_target_collision' };
  }

  if (wrapper.sourceDeviceState !== 'active') {
    return { allowed: false, reason: 'source_device_not_active' };
  }

  if (challenge.state === 'consumed') {
    return { allowed: false, reason: 'challenge_consumed' };
  }

  if (challenge.state === 'revoked') {
    return { allowed: false, reason: 'challenge_revoked' };
  }

  if (
    challenge.issuedAtMs > wrapper.nowMs ||
    challenge.expiresAtMs <= wrapper.nowMs
  ) {
    return { allowed: false, reason: 'challenge_expired' };
  }

  if (wrapper.explicitApproval !== true) {
    return { allowed: false, reason: 'approval_required' };
  }

  const authDecision = evaluateAuthenticationAssurance({
    risk: challenge.trustTier === 'privileged' ? 'critical' : 'high',
    assurance: wrapper.authenticationAssurance,
    nowMs: wrapper.nowMs,
    authenticatedAtMs: wrapper.authenticatedAtMs,
  });

  if (!authDecision.allowed) {
    return { allowed: false, reason: 'insufficient_authentication' };
  }

  return { allowed: true, reason: 'allowed' };
}
