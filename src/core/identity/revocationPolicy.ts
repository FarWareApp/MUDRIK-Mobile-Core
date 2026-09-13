import { evaluateAuthenticationAssurance } from './authAssurance';
import { isIdentityId } from './identityIds';

export type RevocationOperation =
  | 'sign_out_session'
  | 'revoke_device'
  | 'revoke_all_other_sessions'
  | 'revoke_all_devices';

export type RevocationDecisionReason =
  | 'allowed'
  | 'invalid_revocation_request'
  | 'account_mismatch'
  | 'target_required'
  | 'authentication_required'
  | 'approval_required';

export type RevocationDecision = Readonly<{
  allowed: boolean;
  reason: RevocationDecisionReason;
}>;

function isOperation(value: unknown): value is RevocationOperation {
  return (
    value === 'sign_out_session' ||
    value === 'revoke_device' ||
    value === 'revoke_all_other_sessions' ||
    value === 'revoke_all_devices'
  );
}

export function evaluateRevocation(input: unknown): RevocationDecision {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { allowed: false, reason: 'invalid_revocation_request' };
  }

  const record = input as Record<string, unknown>;
  const allowedKeys = new Set([
    'operation',
    'actorAccountId',
    'targetAccountId',
    'actorSessionId',
    'actorDeviceId',
    'targetSessionId',
    'targetDeviceId',
    'nowMs',
    'authenticationAssurance',
    'authenticatedAtMs',
    'explicitApproval',
  ]);

  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return { allowed: false, reason: 'invalid_revocation_request' };
  }

  if (
    !isOperation(record.operation) ||
    !isIdentityId('account', record.actorAccountId) ||
    !isIdentityId('account', record.targetAccountId) ||
    !isIdentityId('session', record.actorSessionId) ||
    !isIdentityId('device', record.actorDeviceId) ||
    typeof record.nowMs !== 'number' ||
    !Number.isFinite(record.nowMs) ||
    typeof record.explicitApproval !== 'boolean'
  ) {
    return { allowed: false, reason: 'invalid_revocation_request' };
  }

  if (record.actorAccountId !== record.targetAccountId) {
    return { allowed: false, reason: 'account_mismatch' };
  }

  if (
    record.operation === 'sign_out_session' &&
    !isIdentityId('session', record.targetSessionId)
  ) {
    return { allowed: false, reason: 'target_required' };
  }

  if (
    record.operation === 'revoke_device' &&
    !isIdentityId('device', record.targetDeviceId)
  ) {
    return { allowed: false, reason: 'target_required' };
  }

  if (
    record.operation !== 'sign_out_session' &&
    record.explicitApproval !== true
  ) {
    return { allowed: false, reason: 'approval_required' };
  }

  const isSelfSessionSignOut =
    record.operation === 'sign_out_session' &&
    record.targetSessionId === record.actorSessionId;

  if (isSelfSessionSignOut) {
    return { allowed: true, reason: 'allowed' };
  }

  const risk =
    record.operation === 'revoke_all_other_sessions' ||
    record.operation === 'revoke_all_devices'
      ? 'critical'
      : 'high';

  const authDecision = evaluateAuthenticationAssurance({
    risk,
    assurance: record.authenticationAssurance,
    nowMs: record.nowMs,
    authenticatedAtMs: record.authenticatedAtMs,
  });

  if (!authDecision.allowed) {
    return { allowed: false, reason: 'authentication_required' };
  }

  if (
    authDecision.required.requiresExplicitApproval &&
    record.explicitApproval !== true
  ) {
    return { allowed: false, reason: 'approval_required' };
  }

  return { allowed: true, reason: 'allowed' };
}
