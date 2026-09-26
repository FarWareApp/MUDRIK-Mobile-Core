import {
  isIdentityId,
} from '../identity/identityIds';

import {
  parseTrustedEvaluationTime,
} from '../security/trustedEvaluationTime';

import {
  parseEmergencyGuardianConfig,
} from './emergencyGuardianConfig';

import {
  isEmergencySessionId,
} from './emergencyEvidence';

import type {
  EmergencyGuardianMode,
} from './emergencyGuardianConfig';

export type EmergencySession = Readonly<{
  emergencySessionId: string;
  accountId: string;
  sourceDeviceId: string;
  configId: string;
  configRevision: number;
  mode: EmergencyGuardianMode;
  openedAtMs: number;
  simulationOnly: boolean;
  grantsAuthority: false;
}>;

export type EmergencySessionOpenResult =
  Readonly<{
    accepted: boolean;
    session: EmergencySession | null;
    reason:
      | 'accepted'
      | 'invalid_input'
      | 'guardian_disabled'
      | 'account_mismatch';
    grantsAuthority: false;
  }>;

const INPUT_KEYS = new Set([
  'emergencySessionId',
  'accountId',
  'sourceDeviceId',
  'config',
]);

const SESSION_KEYS = new Set([
  'emergencySessionId',
  'accountId',
  'sourceDeviceId',
  'configId',
  'configRevision',
  'mode',
  'openedAtMs',
  'simulationOnly',
  'grantsAuthority',
]);

const CONFIG_ID =
  /^egc_[a-z0-9][a-z0-9_-]{15,63}$/;

function result(
  accepted: boolean,
  session: EmergencySession | null,
  reason: EmergencySessionOpenResult['reason'],
): EmergencySessionOpenResult {
  return Object.freeze({
    accepted,
    session,
    reason,
    grantsAuthority: false,
  });
}

export function parseEmergencySessionSnapshot(
  input: unknown,
  trustedEvaluationTimeInput: unknown,
): EmergencySession | null {
  const nowMs =
    parseTrustedEvaluationTime(
      trustedEvaluationTimeInput,
    );

  if (
    nowMs === null
    || typeof input !== 'object'
    || input === null
    || Array.isArray(input)
  ) {
    return null;
  }

  const record =
    input as Record<string, unknown>;

  if (
    Object.keys(record).length
      !== SESSION_KEYS.size
    || Object.keys(record).some(
      (key) => !SESSION_KEYS.has(key),
    )
    || !isEmergencySessionId(
      record.emergencySessionId,
    )
    || !isIdentityId(
      'account',
      record.accountId,
    )
    || !isIdentityId(
      'device',
      record.sourceDeviceId,
    )
    || typeof record.configId !== 'string'
    || !CONFIG_ID.test(record.configId)
    || typeof record.configRevision !== 'number'
    || !Number.isSafeInteger(
      record.configRevision,
    )
    || record.configRevision < 0
    || (
      record.mode !== 'simulation'
      && record.mode !== 'live'
    )
    || typeof record.openedAtMs !== 'number'
    || !Number.isSafeInteger(
      record.openedAtMs,
    )
    || record.openedAtMs < 0
    || record.openedAtMs > nowMs
    || typeof record.simulationOnly !== 'boolean'
    || record.simulationOnly
      !== (record.mode === 'simulation')
    || record.grantsAuthority !== false
  ) {
    return null;
  }

  return Object.freeze({
    emergencySessionId:
      record.emergencySessionId,
    accountId: record.accountId,
    sourceDeviceId:
      record.sourceDeviceId,
    configId: record.configId,
    configRevision:
      record.configRevision,
    mode: record.mode,
    openedAtMs: record.openedAtMs,
    simulationOnly:
      record.simulationOnly,
    grantsAuthority: false,
  });
}

export function openEmergencySession(
  input: unknown,
  trustedEvaluationTimeInput: unknown,
): EmergencySessionOpenResult {
  const nowMs =
    parseTrustedEvaluationTime(
      trustedEvaluationTimeInput,
    );

  if (
    nowMs === null
    || typeof input !== 'object'
    || input === null
    || Array.isArray(input)
  ) {
    return result(
      false,
      null,
      'invalid_input',
    );
  }

  const record =
    input as Record<string, unknown>;

  if (
    Object.keys(record).length
      !== INPUT_KEYS.size
    || Object.keys(record).some(
      (key) => !INPUT_KEYS.has(key),
    )
    || !isEmergencySessionId(
      record.emergencySessionId,
    )
    || !isIdentityId(
      'account',
      record.accountId,
    )
    || !isIdentityId(
      'device',
      record.sourceDeviceId,
    )
  ) {
    return result(
      false,
      null,
      'invalid_input',
    );
  }

  const config =
    parseEmergencyGuardianConfig(
      record.config,
      nowMs,
    );

  if (!config) {
    return result(
      false,
      null,
      'invalid_input',
    );
  }

  if (!config.enabled) {
    return result(
      false,
      null,
      'guardian_disabled',
    );
  }

  if (config.accountId !== record.accountId) {
    return result(
      false,
      null,
      'account_mismatch',
    );
  }

  const session: EmergencySession =
    Object.freeze({
      emergencySessionId:
        record.emergencySessionId,
      accountId: record.accountId,
      sourceDeviceId:
        record.sourceDeviceId,
      configId: config.configId,
      configRevision: config.revision,
      mode: config.mode,
      openedAtMs: nowMs,
      simulationOnly:
        config.simulationOnly,
      grantsAuthority: false,
    });

  return result(
    true,
    session,
    'accepted',
  );
}