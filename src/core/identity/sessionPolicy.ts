import { isIdentityId } from './identityIds';
import type { AuthenticationAssurance } from './authAssurance';

export type SessionState =
  | 'active'
  | 'reauth_required'
  | 'suspected_reuse'
  | 'revoked'
  | 'expired';

export type SessionDecisionReason =
  | 'allowed'
  | 'invalid_session'
  | 'account_mismatch'
  | 'device_mismatch'
  | 'device_key_mismatch'
  | 'issued_in_future'
  | 'expired'
  | 'revoked'
  | 'reauthentication_required'
  | 'suspected_reuse';

export type SessionDecision = Readonly<{
  allowed: boolean;
  reason: SessionDecisionReason;
}>;

type SessionRecord = Readonly<{
  sessionId: string;
  accountId: string;
  deviceId: string;
  deviceKeyId: string;
  issuedAtMs: number;
  expiresAtMs: number;
  authenticatedAtMs: number;
  assurance: AuthenticationAssurance;
  state: SessionState;
}>;

function isAssurance(value: unknown): value is AuthenticationAssurance {
  return (
    value === 'none' ||
    value === 'session' ||
    value === 'verified' ||
    value === 'phishing_resistant'
  );
}

function isSessionState(value: unknown): value is SessionState {
  return (
    value === 'active' ||
    value === 'reauth_required' ||
    value === 'suspected_reuse' ||
    value === 'revoked' ||
    value === 'expired'
  );
}

function parseSession(value: unknown): SessionRecord | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const allowedKeys = new Set([
    'sessionId',
    'accountId',
    'deviceId',
    'deviceKeyId',
    'issuedAtMs',
    'expiresAtMs',
    'authenticatedAtMs',
    'assurance',
    'state',
  ]);

  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return null;
  }

  if (
    !isIdentityId('session', record.sessionId) ||
    !isIdentityId('account', record.accountId) ||
    !isIdentityId('device', record.deviceId) ||
    !isIdentityId('device_key', record.deviceKeyId) ||
    typeof record.issuedAtMs !== 'number' ||
    !Number.isFinite(record.issuedAtMs) ||
    typeof record.expiresAtMs !== 'number' ||
    !Number.isFinite(record.expiresAtMs) ||
    typeof record.authenticatedAtMs !== 'number' ||
    !Number.isFinite(record.authenticatedAtMs) ||
    record.expiresAtMs <= record.issuedAtMs ||
    !isAssurance(record.assurance) ||
    !isSessionState(record.state)
  ) {
    return null;
  }

  return record as SessionRecord;
}

export function evaluateSession(input: unknown): SessionDecision {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { allowed: false, reason: 'invalid_session' };
  }

  const wrapper = input as Record<string, unknown>;
  const allowedKeys = new Set([
    'session',
    'nowMs',
    'expectedAccountId',
    'expectedDeviceId',
    'expectedDeviceKeyId',
  ]);

  if (Object.keys(wrapper).some((key) => !allowedKeys.has(key))) {
    return { allowed: false, reason: 'invalid_session' };
  }

  const session = parseSession(wrapper.session);
  if (
    !session ||
    typeof wrapper.nowMs !== 'number' ||
    !Number.isFinite(wrapper.nowMs) ||
    !isIdentityId('account', wrapper.expectedAccountId) ||
    !isIdentityId('device', wrapper.expectedDeviceId) ||
    !isIdentityId('device_key', wrapper.expectedDeviceKeyId)
  ) {
    return { allowed: false, reason: 'invalid_session' };
  }

  if (session.accountId !== wrapper.expectedAccountId) {
    return { allowed: false, reason: 'account_mismatch' };
  }

  if (session.deviceId !== wrapper.expectedDeviceId) {
    return { allowed: false, reason: 'device_mismatch' };
  }

  if (session.deviceKeyId !== wrapper.expectedDeviceKeyId) {
    return { allowed: false, reason: 'device_key_mismatch' };
  }

  if (
    session.issuedAtMs > wrapper.nowMs ||
    session.authenticatedAtMs > wrapper.nowMs
  ) {
    return { allowed: false, reason: 'issued_in_future' };
  }

  if (session.state === 'revoked') {
    return { allowed: false, reason: 'revoked' };
  }

  if (session.state === 'suspected_reuse') {
    return { allowed: false, reason: 'suspected_reuse' };
  }

  if (session.state === 'reauth_required') {
    return { allowed: false, reason: 'reauthentication_required' };
  }

  if (session.state === 'expired' || session.expiresAtMs <= wrapper.nowMs) {
    return { allowed: false, reason: 'expired' };
  }

  if (session.state !== 'active') {
    return { allowed: false, reason: 'invalid_session' };
  }

  return { allowed: true, reason: 'allowed' };
}
