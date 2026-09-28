import {
  isKnownCapability,
} from '../../computer-agent/src/capabilities.mjs';

import {
  isControlId,
  isPolicyVersion,
  isSha256Digest,
} from './ids.mjs';

const MODES =
  new Set([
    'single_use',
    'task_lifetime',
  ]);

const STATES =
  new Set([
    'active',
    'consumed',
    'revoked',
  ]);

const RISKS =
  new Set([
    'low',
    'medium',
    'high',
    'critical',
  ]);

const KEYS =
  new Set([
    'approvalId',
    'accountId',
    'sourceSessionId',
    'destinationDeviceId',
    'taskId',
    'capabilities',
    'scopeDigest',
    'risk',
    'policyVersion',
    'mode',
    'state',
    'createdAtMs',
    'expiresAtMs',
    'consumedAtMs',
    'revision',
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

function sameCapabilities(
  a,
  b,
) {
  return (
    a.length === b.length
    && a.every(
      (value, index) =>
        value === b[index],
    )
  );
}

export function parseApprovalRecord(
  input,
) {
  if (
    !plainObject(input)
    || Object.keys(input).length
      !== KEYS.size
    || Object.keys(input).some(
      (key) => !KEYS.has(key),
    )
    || !isControlId(
      'approval',
      input.approvalId,
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
      input.destinationDeviceId,
    )
    || !isControlId(
      'task',
      input.taskId,
    )
    || !Array.isArray(
      input.capabilities,
    )
    || input.capabilities.length
      < 1
    || input.capabilities.length
      > 64
    || input.capabilities.some(
      (capability) =>
        !isKnownCapability(
          capability,
        ),
    )
    || new Set(
      input.capabilities,
    ).size
      !== input.capabilities.length
    || !isSha256Digest(
      input.scopeDigest,
    )
    || !RISKS.has(input.risk)
    || !isPolicyVersion(
      input.policyVersion,
    )
    || !MODES.has(input.mode)
    || !STATES.has(input.state)
    || !time(input.createdAtMs)
    || !time(input.expiresAtMs)
    || input.expiresAtMs
      <= input.createdAtMs
    || (
      input.consumedAtMs !== null
      && !time(
        input.consumedAtMs,
      )
    )
    || (
      input.state === 'consumed'
      && input.consumedAtMs
        === null
    )
    || (
      input.state !== 'consumed'
      && input.consumedAtMs
        !== null
    )
    || !Number.isInteger(
      input.revision,
    )
    || input.revision < 0
    || (
      input.risk === 'critical'
      && input.mode
        !== 'single_use'
    )
  ) {
    return null;
  }

  return Object.freeze({
    ...input,
    capabilities:
      Object.freeze([
        ...input.capabilities,
      ]),
  });
}

export class ApprovalRegistry {
  constructor() {
    this.records = new Map();
  }

  register(input) {
    const record =
      parseApprovalRecord(input);

    if (
      !record
      || record.revision !== 0
      || record.state !== 'active'
    ) {
      return Object.freeze({
        accepted: false,
        reason:
          'approval_record_invalid',
      });
    }

    const existing =
      this.records.get(
        record.approvalId,
      );

    if (existing) {
      return JSON.stringify(existing)
        === JSON.stringify(record)
        ? Object.freeze({
            accepted: true,
            duplicate: true,
            record: existing,
          })
        : Object.freeze({
            accepted: false,
            reason:
              'approval_id_conflict',
          });
    }

    this.records.set(
      record.approvalId,
      record,
    );

    return Object.freeze({
      accepted: true,
      duplicate: false,
      record,
    });
  }

  revoke({
    approvalId,
    expectedRevision,
  }) {
    const current =
      this.records.get(approvalId);

    if (
      !current
      || current.revision
        !== expectedRevision
    ) {
      return Object.freeze({
        accepted: false,
        reason:
          'approval_update_conflict',
      });
    }

    if (current.state === 'revoked') {
      return Object.freeze({
        accepted: true,
        duplicate: true,
        record: current,
      });
    }

    if (current.state === 'consumed') {
      return Object.freeze({
        accepted: false,
        reason:
          'approval_already_consumed',
      });
    }

    const next =
      Object.freeze({
        ...current,
        state: 'revoked',
        revision:
          current.revision + 1,
      });

    this.records.set(
      approvalId,
      next,
    );

    return Object.freeze({
      accepted: true,
      duplicate: false,
      record: next,
    });
  }

  authorizeTask({
    approvalId,
    task,
    trustedNowMs,
  }) {
    const current =
      this.records.get(approvalId);

    if (
      !current
      || !time(trustedNowMs)
      || !task
    ) {
      return Object.freeze({
        allowed: false,
        reason:
          'approval_unknown',
      });
    }

    if (
      current.accountId
        !== task.accountId
      || current.sourceSessionId
        !== task.sourceSessionId
      || current.destinationDeviceId
        !== task.destinationDeviceId
      || current.taskId
        !== task.taskId
      || current.scopeDigest
        !== task.scopeDigest
      || current.risk
        !== task.risk
      || current.policyVersion
        !== task.policyVersion
      || !sameCapabilities(
        current.capabilities,
        task.requestedCapabilities,
      )
    ) {
      return Object.freeze({
        allowed: false,
        reason:
          'approval_binding_mismatch',
      });
    }

    if (
      current.expiresAtMs
        <= trustedNowMs
    ) {
      return Object.freeze({
        allowed: false,
        reason:
          'approval_expired',
      });
    }

    if (
      current.state === 'revoked'
    ) {
      return Object.freeze({
        allowed: false,
        reason:
          'approval_revoked',
      });
    }

    if (
      current.state === 'consumed'
    ) {
      return Object.freeze({
        allowed: true,
        duplicate: true,
        reason:
          'approval_already_consumed_for_task',
        record: current,
      });
    }

    if (
      current.mode
        === 'task_lifetime'
    ) {
      return Object.freeze({
        allowed: true,
        duplicate: false,
        reason:
          'approval_authorized',
        record: current,
      });
    }

    const next =
      Object.freeze({
        ...current,
        state: 'consumed',
        consumedAtMs:
          trustedNowMs,
        revision:
          current.revision + 1,
      });

    this.records.set(
      approvalId,
      next,
    );

    return Object.freeze({
      allowed: true,
      duplicate: false,
      reason:
        'approval_consumed',
      record: next,
    });
  }
}
