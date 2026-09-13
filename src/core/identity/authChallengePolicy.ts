import { isIdentityId } from './identityIds';

export type AuthenticationChallengePurpose =
  | 'sign_in'
  | 'step_up'
  | 'authenticator_enrollment'
  | 'recovery_change';

export type AuthenticationChallengeState =
  | 'pending'
  | 'consumed'
  | 'revoked';

export type AuthenticationChallengeDecisionReason =
  | 'allowed'
  | 'invalid_challenge'
  | 'purpose_mismatch'
  | 'account_mismatch'
  | 'session_mismatch'
  | 'nonce_mismatch'
  | 'challenge_consumed'
  | 'challenge_revoked'
  | 'challenge_expired'
  | 'challenge_lifetime_exceeded';

export type AuthenticationChallengeDecision = Readonly<{
  allowed: boolean;
  reason: AuthenticationChallengeDecisionReason;
}>;

export const MAX_AUTH_CHALLENGE_LIFETIME_MS = 5 * 60 * 1000;

function isPurpose(value: unknown): value is AuthenticationChallengePurpose {
  return (
    value === 'sign_in' ||
    value === 'step_up' ||
    value === 'authenticator_enrollment' ||
    value === 'recovery_change'
  );
}

function isState(value: unknown): value is AuthenticationChallengeState {
  return value === 'pending' || value === 'consumed' || value === 'revoked';
}

function isNonce(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length === 43 &&
    /^[A-Za-z0-9_-]{43}$/.test(value)
  );
}

export function evaluateAuthenticationChallenge(
  input: unknown,
): AuthenticationChallengeDecision {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { allowed: false, reason: 'invalid_challenge' };
  }

  const record = input as Record<string, unknown>;
  const allowedKeys = new Set([
    'challengeId',
    'purpose',
    'accountId',
    'sessionId',
    'challengeNonce',
    'issuedAtMs',
    'expiresAtMs',
    'state',
    'nowMs',
    'expectedPurpose',
    'expectedAccountId',
    'expectedSessionId',
    'presentedChallengeNonce',
  ]);

  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return { allowed: false, reason: 'invalid_challenge' };
  }

  if (
    !isIdentityId('auth_challenge', record.challengeId) ||
    !isPurpose(record.purpose) ||
    !isIdentityId('account', record.accountId) ||
    !isNonce(record.challengeNonce) ||
    typeof record.issuedAtMs !== 'number' ||
    !Number.isFinite(record.issuedAtMs) ||
    typeof record.expiresAtMs !== 'number' ||
    !Number.isFinite(record.expiresAtMs) ||
    record.expiresAtMs <= record.issuedAtMs ||
    !isState(record.state) ||
    typeof record.nowMs !== 'number' ||
    !Number.isFinite(record.nowMs) ||
    !isPurpose(record.expectedPurpose) ||
    !isIdentityId('account', record.expectedAccountId) ||
    !isNonce(record.presentedChallengeNonce)
  ) {
    return { allowed: false, reason: 'invalid_challenge' };
  }

  const sessionRequired = record.purpose !== 'sign_in';
  if (sessionRequired) {
    if (
      !isIdentityId('session', record.sessionId) ||
      !isIdentityId('session', record.expectedSessionId)
    ) {
      return { allowed: false, reason: 'invalid_challenge' };
    }
  } else if (
    record.sessionId !== undefined ||
    record.expectedSessionId !== undefined
  ) {
    return { allowed: false, reason: 'invalid_challenge' };
  }

  if (record.purpose !== record.expectedPurpose) {
    return { allowed: false, reason: 'purpose_mismatch' };
  }

  if (record.accountId !== record.expectedAccountId) {
    return { allowed: false, reason: 'account_mismatch' };
  }

  if (
    sessionRequired &&
    record.sessionId !== record.expectedSessionId
  ) {
    return { allowed: false, reason: 'session_mismatch' };
  }

  if (record.challengeNonce !== record.presentedChallengeNonce) {
    return { allowed: false, reason: 'nonce_mismatch' };
  }

  if (record.state === 'consumed') {
    return { allowed: false, reason: 'challenge_consumed' };
  }

  if (record.state === 'revoked') {
    return { allowed: false, reason: 'challenge_revoked' };
  }

  if (
    record.expiresAtMs - record.issuedAtMs >
    MAX_AUTH_CHALLENGE_LIFETIME_MS
  ) {
    return { allowed: false, reason: 'challenge_lifetime_exceeded' };
  }

  if (
    record.issuedAtMs > record.nowMs ||
    record.expiresAtMs <= record.nowMs
  ) {
    return { allowed: false, reason: 'challenge_expired' };
  }

  return { allowed: true, reason: 'allowed' };
}
