import {
  isControlId,
} from './ids.mjs';

const TYPES = new Set([
  'route_accepted',
  'route_rejected',
  'delivery_enqueued',
  'delivery_acknowledged',
  'resume_rejected',
  'device_revoked',
  'task_cancelled',
  'approval_consumed',
  'rate_limited',
]);

const REASON =
  /^[a-z][a-z0-9_-]{0,63}$/;

function time(value) {
  return (
    Number.isSafeInteger(value)
    && value >= 0
  );
}

function optionalId(
  kind,
  value,
) {
  return (
    value === null
    || isControlId(
      kind,
      value,
    )
  );
}

export function createControlAuditEvent(
  {
    type,
    accountId = null,
    deviceId = null,
    sessionId = null,
    taskId = null,
    approvalId = null,
    deliveryId = null,
    reasonCode,
    occurredAtMs,
  } = {},
) {
  if (
    !TYPES.has(type)
    || !optionalId(
      'account',
      accountId,
    )
    || !optionalId(
      'device',
      deviceId,
    )
    || !optionalId(
      'session',
      sessionId,
    )
    || !optionalId(
      'task',
      taskId,
    )
    || !optionalId(
      'approval',
      approvalId,
    )
    || !optionalId(
      'delivery',
      deliveryId,
    )
    || typeof reasonCode
      !== 'string'
    || !REASON.test(reasonCode)
    || !time(occurredAtMs)
  ) {
    return null;
  }

  return Object.freeze({
    protocolVersion: '1.0',
    type,
    accountId,
    deviceId,
    sessionId,
    taskId,
    approvalId,
    deliveryId,
    reasonCode,
    occurredAtMs,
    grantsAuthority: false,
    containsPrivatePayload:
      false,
  });
}

export function isControlAuditEvent(
  value,
) {
  if (
    !value
    || typeof value !== 'object'
    || Array.isArray(value)
    || Object.keys(value).length
      !== 12
  ) {
    return false;
  }

  const parsed =
    createControlAuditEvent(
      value,
    );

  return (
    parsed !== null
    && value.protocolVersion
      === '1.0'
    && value.grantsAuthority
      === false
    && value.containsPrivatePayload
      === false
  );
}
