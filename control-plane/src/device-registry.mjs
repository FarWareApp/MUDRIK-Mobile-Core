import {
  isControlId,
  isPublicKeyThumbprint,
} from './ids.mjs';

const STATES =
  new Set([
    'pending_pairing',
    'active',
    'rotation_required',
    'suspended',
    'revoked',
  ]);

const KEYS =
  new Set([
    'deviceId',
    'accountId',
    'deviceKeyId',
    'publicKeyThumbprint',
    'state',
    'agentVersion',
    'protocolMajor',
    'revision',
    'updatedAtMs',
  ]);

const TRANSITIONS =
  Object.freeze({
    pending_pairing:
      new Set([
        'active',
        'revoked',
      ]),
    active:
      new Set([
        'rotation_required',
        'suspended',
        'revoked',
      ]),
    rotation_required:
      new Set([
        'active',
        'revoked',
      ]),
    suspended:
      new Set([
        'active',
        'revoked',
      ]),
    revoked:
      new Set([]),
  });

function plainObject(value) {
  if (
    typeof value !== 'object'
    || value === null
    || Array.isArray(value)
  ) {
    return false;
  }

  const prototype =
    Object.getPrototypeOf(value);

  return (
    prototype === Object.prototype
    || prototype === null
  );
}

function validTime(value) {
  return (
    Number.isSafeInteger(value)
    && value >= 0
  );
}

function validVersion(value) {
  return (
    typeof value === 'string'
    && value.length >= 1
    && value.length <= 64
    && /^[A-Za-z0-9][A-Za-z0-9_.+-]*$/
      .test(value)
  );
}

export function parseControlDeviceRecord(
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
      'device',
      input.deviceId,
    )
    || !isControlId(
      'account',
      input.accountId,
    )
    || !isControlId(
      'deviceKey',
      input.deviceKeyId,
    )
    || !isPublicKeyThumbprint(
      input.publicKeyThumbprint,
    )
    || !STATES.has(input.state)
    || !validVersion(
      input.agentVersion,
    )
    || !Number.isInteger(
      input.protocolMajor,
    )
    || input.protocolMajor < 1
    || input.protocolMajor > 255
    || !Number.isInteger(
      input.revision,
    )
    || input.revision < 0
    || input.revision
      > Number.MAX_SAFE_INTEGER
    || !validTime(
      input.updatedAtMs,
    )
  ) {
    return null;
  }

  return Object.freeze({
    ...input,
  });
}

function sameRecord(a, b) {
  return JSON.stringify(a)
    === JSON.stringify(b);
}

export class ControlDeviceRegistry {
  constructor({
    supportedProtocolMajors = [1],
    verifyEnrollment,
  } = {}) {
    if (
      typeof verifyEnrollment
        !== 'function'
      || !Array.isArray(
        supportedProtocolMajors,
      )
      || supportedProtocolMajors.length
        < 1
      || supportedProtocolMajors.some(
        (value) =>
          !Number.isInteger(value)
          || value < 1
          || value > 255,
      )
    ) {
      throw new TypeError(
        'Invalid protocol support.',
      );
    }

    this.supportedProtocolMajors =
      new Set(
        supportedProtocolMajors,
      );
    this.verifyEnrollment =
      verifyEnrollment;
    this.records = new Map();
  }

  register(input) {
    const record =
      parseControlDeviceRecord(
        input,
      );

    if (
      !record
      || record.revision !== 0
    ) {
      return Object.freeze({
        accepted: false,
        reason:
          'device_record_invalid',
      });
    }

    let verified = false;

    try {
      verified =
        this.verifyEnrollment(
          record,
        ) === true;
    } catch {
      verified = false;
    }

    if (!verified) {
      return Object.freeze({
        accepted: false,
        reason:
          'device_identity_unverified',
      });
    }

    const existing =
      this.records.get(
        record.deviceId,
      );

    if (existing) {
      return sameRecord(
        existing,
        record,
      )
        ? Object.freeze({
            accepted: true,
            duplicate: true,
            record: existing,
          })
        : Object.freeze({
            accepted: false,
            reason:
              'device_id_conflict',
          });
    }

    this.records.set(
      record.deviceId,
      record,
    );

    return Object.freeze({
      accepted: true,
      duplicate: false,
      record,
    });
  }

  updateState({
    deviceId,
    expectedRevision,
    nextState,
    trustedNowMs,
  }) {
    const current =
      this.records.get(deviceId);

    if (
      !current
      || !Number.isInteger(
        expectedRevision,
      )
      || expectedRevision
        !== current.revision
      || !STATES.has(nextState)
      || !validTime(trustedNowMs)
      || trustedNowMs
        < current.updatedAtMs
    ) {
      return Object.freeze({
        accepted: false,
        reason:
          'device_update_conflict',
      });
    }

    if (
      nextState === current.state
    ) {
      return Object.freeze({
        accepted: true,
        duplicate: true,
        record: current,
      });
    }

    if (
      !TRANSITIONS[
        current.state
      ].has(nextState)
    ) {
      return Object.freeze({
        accepted: false,
        reason:
          'device_transition_invalid',
      });
    }

    const next =
      Object.freeze({
        ...current,
        state: nextState,
        revision:
          current.revision + 1,
        updatedAtMs:
          trustedNowMs,
      });

    this.records.set(
      deviceId,
      next,
    );

    return Object.freeze({
      accepted: true,
      duplicate: false,
      record: next,
    });
  }

  get(deviceId) {
    return (
      this.records.get(deviceId)
      ?? null
    );
  }

  authorizeDestination({
    accountId,
    deviceId,
  }) {
    const record =
      this.records.get(deviceId);

    if (
      !isControlId(
        'account',
        accountId,
      )
      || !record
    ) {
      return Object.freeze({
        allowed: false,
        reason:
          'destination_unknown',
      });
    }

    if (
      record.accountId
        !== accountId
    ) {
      return Object.freeze({
        allowed: false,
        reason:
          'destination_account_mismatch',
      });
    }

    if (
      !this
        .supportedProtocolMajors
        .has(
          record.protocolMajor,
        )
    ) {
      return Object.freeze({
        allowed: false,
        reason:
          'destination_protocol_unsupported',
      });
    }

    if (record.state !== 'active') {
      return Object.freeze({
        allowed: false,
        reason:
          'destination_'
          + record.state,
      });
    }

    return Object.freeze({
      allowed: true,
      reason:
        'destination_authorized',
      record,
    });
  }
}
