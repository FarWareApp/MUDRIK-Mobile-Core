import type {
  RuntimeIntegrityDecision,
} from './runtimeIntegrityAttestation';

export type RuntimeOperationClass =
  | 'read'
  | 'diagnostic'
  | 'repair'
  | 'write'
  | 'execute'
  | 'network'
  | 'credential'
  | 'update';

export type RuntimeTrustGateDecision =
  Readonly<{
    allowed: boolean;
    reason:
      | 'trusted_runtime'
      | 'restricted_read_only'
      | 'restricted_recovery_only'
      | 'blocked_untrusted_runtime'
      | 'invalid_input';
  }>;

const OPERATION_CLASSES =
  new Set<RuntimeOperationClass>([
    'read',
    'diagnostic',
    'repair',
    'write',
    'execute',
    'network',
    'credential',
    'update',
  ]);

export function authorizeRuntimeOperation(
  integrity: RuntimeIntegrityDecision,
  operationClass: RuntimeOperationClass,
  recoveryOperation: boolean,
): RuntimeTrustGateDecision {
  if (
    typeof integrity !== 'object'
    || integrity === null
    || typeof integrity.accepted !== 'boolean'
    || typeof integrity.enterRestrictedMode !== 'boolean'
    || !OPERATION_CLASSES.has(operationClass)
    || typeof recoveryOperation !== 'boolean'
  ) {
    return Object.freeze({
      allowed: false,
      reason: 'invalid_input',
    });
  }

  if (integrity.accepted) {
    return Object.freeze({
      allowed: true,
      reason: 'trusted_runtime',
    });
  }

  if (!integrity.enterRestrictedMode) {
    if (
      operationClass === 'read'
      || operationClass === 'diagnostic'
    ) {
      return Object.freeze({
        allowed: true,
        reason: 'restricted_read_only',
      });
    }

    return Object.freeze({
      allowed: false,
      reason: 'blocked_untrusted_runtime',
    });
  }

  if (
    operationClass === 'read'
    || operationClass === 'diagnostic'
  ) {
    return Object.freeze({
      allowed: true,
      reason: 'restricted_read_only',
    });
  }

  if (
    recoveryOperation
    && (
      operationClass === 'repair'
      || operationClass === 'update'
    )
  ) {
    return Object.freeze({
      allowed: true,
      reason: 'restricted_recovery_only',
    });
  }

  return Object.freeze({
    allowed: false,
    reason: 'blocked_untrusted_runtime',
  });
}
