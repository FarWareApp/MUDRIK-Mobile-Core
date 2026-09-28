import {
  isKnownCapability,
} from '../../computer-agent/src/capabilities.mjs';

import {
  isControlId,
  isPolicyVersion,
  isSha256Digest,
} from './ids.mjs';

export const MAX_ROUTE_TASK_LIFETIME_MS =
  60 * 60 * 1000;

const RISKS =
  new Set([
    'low',
    'medium',
    'high',
    'critical',
  ]);

const KEYS =
  new Set([
    'protocolVersion',
    'taskId',
    'accountId',
    'sourceSessionId',
    'sourceDeviceId',
    'destinationDeviceId',
    'issuedAtMs',
    'expiresAtMs',
    'nonce',
    'sequence',
    'requestedCapabilities',
    'scopeDigest',
    'payloadDigest',
    'approvalId',
    'risk',
    'policyVersion',
  ]);

function plainObject(value) {
  return (
    typeof value === 'object'
    && value !== null
    && !Array.isArray(value)
    && (
      Object.getPrototypeOf(value)
        === Object.prototype
      || Object.getPrototypeOf(value)
        === null
    )
  );
}

function time(value) {
  return (
    Number.isSafeInteger(value)
    && value >= 0
  );
}

export function parseRoutedTask(
  input,
) {
  if (
    !plainObject(input)
    || Object.keys(input).length
      !== KEYS.size
    || Object.keys(input).some(
      (key) => !KEYS.has(key),
    )
    || input.protocolVersion
      !== '1.0'
    || !isControlId(
      'task',
      input.taskId,
    )
    || !isControlId(
      'account',
      input.accountId,
    )
    || !isControlId(
      'session',
      input.sourceSessionId,
    )
    || !isControlId(
      'device',
      input.sourceDeviceId,
    )
    || !isControlId(
      'device',
      input.destinationDeviceId,
    )
    || input.sourceDeviceId
      === input.destinationDeviceId
    || !time(input.issuedAtMs)
    || !time(input.expiresAtMs)
    || input.expiresAtMs
      <= input.issuedAtMs
    || input.expiresAtMs
      - input.issuedAtMs
      > MAX_ROUTE_TASK_LIFETIME_MS
    || !isControlId(
      'nonce',
      input.nonce,
    )
    || !Number.isSafeInteger(
      input.sequence,
    )
    || input.sequence < 1
    || !Array.isArray(
      input.requestedCapabilities,
    )
    || input.requestedCapabilities.length
      < 1
    || input.requestedCapabilities.length
      > 64
    || input.requestedCapabilities.some(
      (capability) =>
        !isKnownCapability(
          capability,
        ),
    )
    || new Set(
      input.requestedCapabilities,
    ).size
      !== input.requestedCapabilities.length
    || !isSha256Digest(
      input.scopeDigest,
    )
    || !isSha256Digest(
      input.payloadDigest,
    )
    || (
      input.approvalId !== null
      && !isControlId(
        'approval',
        input.approvalId,
      )
    )
    || !RISKS.has(input.risk)
    || !isPolicyVersion(
      input.policyVersion,
    )
  ) {
    return null;
  }

  return Object.freeze({
    ...input,
    requestedCapabilities:
      Object.freeze([
        ...input
          .requestedCapabilities,
      ]),
  });
}

export function evaluateTaskFreshness(
  task,
  trustedNowMs,
  {
    maxClockSkewMs =
      5 * 60 * 1000,
  } = {},
) {
  if (
    !task
    || !time(trustedNowMs)
    || !Number.isSafeInteger(
      maxClockSkewMs,
    )
    || maxClockSkewMs < 0
    || maxClockSkewMs
      > 15 * 60 * 1000
  ) {
    return Object.freeze({
      allowed: false,
      reason:
        'task_time_invalid',
    });
  }

  if (
    task.issuedAtMs
      > trustedNowMs
        + maxClockSkewMs
  ) {
    return Object.freeze({
      allowed: false,
      reason:
        'task_issued_in_future',
    });
  }

  if (
    task.expiresAtMs
      <= trustedNowMs
  ) {
    return Object.freeze({
      allowed: false,
      reason: 'task_expired',
    });
  }

  return Object.freeze({
    allowed: true,
    reason: 'task_fresh',
  });
}
