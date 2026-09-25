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
  configRevision: number;  mode: EmergencyGuardianMode;
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

function result(
  accepted: boolean,
  session: EmergencySession | null,
  reason: EmergencySessionOpenResult['reason'],): EmergencySessionOpenResult {
  return Object.freeze({
    accepted,
    session,
    reason,
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
    input as Record<string, unknown>;  if (
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
      'invalid_input',    );
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