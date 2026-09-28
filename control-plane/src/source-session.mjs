import {
  isControlId,
} from './ids.mjs';

export const MAX_CONTROL_SESSION_LIFETIME_MS =
  15 * 60 * 1000;

const STATES =
  new Set([
    'active',
    'reauth_required',
    'suspected_reuse',
    'revoked',
    'expired',
  ]);

const ASSURANCE =
  new Set([
    'none',
    'session',
    'verified',
    'phishing_resistant',
  ]);

const KEYS =
  new Set([
    'sessionId',
    'accountId',
    'deviceId',
    'deviceKeyId',
    'issuedAtMs',
    'expiresAtMs',
    'authenticatedAtMs',
    'assurance',
    'state',
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

export function parseControlSession(
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
      'session',
      input.sessionId,
    )
    || !isControlId(
      'account',
      input.accountId,
    )
    || !isControlId(
      'device',
      input.deviceId,
    )
    || !isControlId(
      'deviceKey',
      input.deviceKeyId,
    )
    || !time(input.issuedAtMs)
    || !time(input.expiresAtMs)
    || !time(
      input.authenticatedAtMs,
    )
    || input.expiresAtMs
      <= input.issuedAtMs
    || input.expiresAtMs
      - input.issuedAtMs
      > MAX_CONTROL_SESSION_LIFETIME_MS
    || !ASSURANCE.has(
      input.assurance,
    )
    || !STATES.has(input.state)
    || !Number.isInteger(
      input.revision,
    )
    || input.revision < 0
  ) {
    return null;
  }

  return Object.freeze({
    ...input,
  });
}

export class ControlSessionRegistry {
  constructor({
    verifySession,
  } = {}) {
    if (
      typeof verifySession
        !== 'function'
    ) {
      throw new TypeError(
        'Session verifier is required.',
      );
    }

    this.verifySession =
      verifySession;
    this.records = new Map();
  }

  register(input) {
    const record =
      parseControlSession(input);

    if (
      !record
      || record.revision !== 0
    ) {
      return Object.freeze({
        accepted: false,
        reason:
          'session_record_invalid',
      });
    }

    let verified = false;

    try {
      verified =
        this.verifySession(
          record,
        ) === true;
    } catch {
      verified = false;
    }

    if (!verified) {
      return Object.freeze({
        accepted: false,
        reason:
          'session_identity_unverified',
      });
    }

    const existing =
      this.records.get(
        record.sessionId,
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
              'session_id_conflict',
          });
    }

    this.records.set(
      record.sessionId,
      record,
    );

    return Object.freeze({
      accepted: true,
      duplicate: false,
      record,
    });
  }

  revoke({
    sessionId,
    expectedRevision,
  }) {
    const current =
      this.records.get(sessionId);

    if (
      !current
      || expectedRevision
        !== current.revision
    ) {
      return Object.freeze({
        accepted: false,
        reason:
          'session_update_conflict',
      });
    }

    if (current.state === 'revoked') {
      return Object.freeze({
        accepted: true,
        duplicate: true,
        record: current,
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
      sessionId,
      next,
    );

    return Object.freeze({
      accepted: true,
      duplicate: false,
      record: next,
    });
  }

  authorize({
    sessionId,
    accountId,
    deviceId,
    trustedNowMs,
  }) {
    const record =
      this.records.get(sessionId);

    if (
      !record
      || !time(trustedNowMs)
    ) {
      return Object.freeze({
        allowed: false,
        reason:
          'source_session_unknown',
      });
    }

    if (
      record.accountId
        !== accountId
    ) {
      return Object.freeze({
        allowed: false,
        reason:
          'source_account_mismatch',
      });
    }

    if (
      record.deviceId
        !== deviceId
    ) {
      return Object.freeze({
        allowed: false,
        reason:
          'source_device_mismatch',
      });
    }

    if (
      record.issuedAtMs
        > trustedNowMs
      || record.authenticatedAtMs
        > trustedNowMs
    ) {
      return Object.freeze({
        allowed: false,
        reason:
          'source_session_future',
      });
    }

    if (
      record.state !== 'active'
    ) {
      return Object.freeze({
        allowed: false,
        reason:
          'source_session_'
          + record.state,
      });
    }

    if (
      record.expiresAtMs
        <= trustedNowMs
    ) {
      return Object.freeze({
        allowed: false,
        reason:
          'source_session_expired',
      });
    }

    return Object.freeze({
      allowed: true,
      reason:
        'source_session_authorized',
      record,
    });
  }
}
