import {
  isIdentityId,
} from '../identity/identityIds';

import {
  parseTrustedEvaluationTime,
} from '../security/trustedEvaluationTime';

import {
  isEmergencySessionId,
} from './emergencyEvidence';

import {
  parseEmergencyGuardianConfig,
} from './emergencyGuardianConfig';

import {
  parseEmergencyUserEvent,
} from './emergencyEvent';

import {
  isEmergencyGuardianSessionState,
} from './emergencyGuardianSessionState';

import {
  isRegistryAcceptedEmergencyUserEvent,
} from './emergencyEventRegistry';

import type {
  AcceptedEmergencyUserEvent,
} from './emergencyEventRegistry';

import type {
  EmergencyGuardianConfig,
} from './emergencyGuardianConfig';

import type {
  EmergencySession,
} from './emergencySession';

export type EmergencyResponsivenessCheck =
  Readonly<{
    checkId: string;
    emergencySessionId: string;
    accountId: string;

    generation: number;
    configId: string;
    configRevision: number;
    startedAtMs: number;
    deadlineAtMs: number;
    timeoutMs: number;
    simulationOnly: boolean;
    grantsAuthority: false;
    performsExternalAction: false;
  }>;

export type EmergencyResponsivenessStatus =
  | 'pending'
  | 'responsive'
  | 'timed_out';

export type EmergencyResponsivenessEvaluation =
  Readonly<{
    accepted: boolean;
    status: EmergencyResponsivenessStatus;
    reason:
      | 'pending'
      | 'responsive'
      | 'timed_out'
      | 'late_response'
      | 'invalid_input'
      | 'untrusted_check_provenance'
      | 'untrusted_event_provenance'
      | 'event_binding_mismatch'
      | 'event_before_check'
      | 'future_event'
      | 'non_monotonic_time';

    userEventKind:
      'user_ok' | 'user_cancel' | null;
    evaluatedAtMs: number | null;
    deadlineAtMs: number | null;
    timeoutDerivedFromTrustedTime: true;
    grantsAuthority: false;
    performsExternalAction: false;
  }>;

export type EmergencyResponsivenessStartResult =
  Readonly<{
    accepted: boolean;
    check: EmergencyResponsivenessCheck | null;
    reason:
      | 'accepted'
      | 'invalid_input'
      | 'guardian_disabled'
      | 'responsiveness_disabled'
      | 'account_mismatch'
      | 'session_config_mismatch'
      | 'state_not_checking_user'
      | 'non_monotonic_time'
      | 'time_overflow';
    grantsAuthority: false;
    performsExternalAction: false;
  }>;

const CHECK_ID =
  /^emrc_[a-z0-9][a-z0-9_-]{15,63}$/;

const CONFIG_ID =
  /^egc_[a-z0-9][a-z0-9_-]{15,63}$/;

const START_KEYS = new Set([
  'checkId',
  'sessionState',
  'config',
]);

const CHECK_KEYS = new Set([
  'checkId',
  'emergencySessionId',
  'accountId',
  'generation',
  'configId',
  'configRevision',
  'startedAtMs',
  'deadlineAtMs',
  'timeoutMs',
  'simulationOnly',
  'grantsAuthority',
  'performsExternalAction',
]);

const EVALUATE_KEYS = new Set([
  'check',
  'event',
]);

const ACCEPTED_EVENT_KEYS = new Set([
  'emergencySessionId',
  'eventId',
  'sequence',
  'accountId',
  'sourceDeviceId',
  'generation',
  'kind',
  'grantsAuthority',
  'performsExternalAction',
  'acceptedAtMs',
]);

const issuedResponsivenessChecks =
  new WeakSet<object>();

const issuedResponsivenessEvaluations =
  new WeakMap<
    object,
    EmergencyResponsivenessCheck
  >();

function startResult(
  accepted: boolean,
  check: EmergencyResponsivenessCheck | null,
  reason:
    EmergencyResponsivenessStartResult['reason'],
): EmergencyResponsivenessStartResult {
  return Object.freeze({
    accepted,
    check,
    reason,
    grantsAuthority: false,
    performsExternalAction: false,
  });
}

function evaluationResult(
  accepted: boolean,
  status: EmergencyResponsivenessStatus,
  reason:
    EmergencyResponsivenessEvaluation['reason'],
  userEventKind:
    EmergencyResponsivenessEvaluation['userEventKind'],
  evaluatedAtMs: number | null,
  deadlineAtMs: number | null,
): EmergencyResponsivenessEvaluation {
  return Object.freeze({
    accepted,
    status,
    reason,
    userEventKind,
    evaluatedAtMs,
    deadlineAtMs,
    timeoutDerivedFromTrustedTime: true,
    grantsAuthority: false,
    performsExternalAction: false,
  });
}

function boundEvaluationResult(
  check: EmergencyResponsivenessCheck,
  accepted: boolean,
  status: EmergencyResponsivenessStatus,
  reason:
    EmergencyResponsivenessEvaluation['reason'],
  userEventKind:
    EmergencyResponsivenessEvaluation['userEventKind'],
  evaluatedAtMs: number,
): EmergencyResponsivenessEvaluation {
  const evaluation =
    evaluationResult(
      accepted,
      status,
      reason,
      userEventKind,
      evaluatedAtMs,
      check.deadlineAtMs,
    );

  issuedResponsivenessEvaluations.set(
    evaluation,
    check,
  );

  return evaluation;
}

export function isEmergencyResponsivenessCheck(
  value: unknown,
): value is EmergencyResponsivenessCheck {
  return (
    typeof value === 'object'
    && value !== null
    && issuedResponsivenessChecks.has(value)
  );
}

export function isEmergencyResponsivenessEvaluationFor(
  value: unknown,
  check: EmergencyResponsivenessCheck,
): value is EmergencyResponsivenessEvaluation {
  return (
    typeof value === 'object'
    && value !== null
    && isEmergencyResponsivenessCheck(check)
    && issuedResponsivenessEvaluations.get(value)
      === check
  );
}

function parseGeneration(
  value: unknown,
): number | null {
  if (
    typeof value !== 'number'
    || !Number.isSafeInteger(value)
    || value < 0
  ) {
    return null;
  }

  return value;
}

function parseCheck(
  input: unknown,
): EmergencyResponsivenessCheck | null {
  if (
    typeof input !== 'object'
    || input === null
    || Array.isArray(input)

  ) {
    return null;
  }

  const record =
    input as Record<string, unknown>;
  const generation =
    parseGeneration(
      record.generation,
    );

  if (
    Object.keys(record).length
      !== CHECK_KEYS.size
    || Object.keys(record).some(
      (key) => !CHECK_KEYS.has(key),
    )
    || typeof record.checkId !== 'string'
    || !CHECK_ID.test(record.checkId)
    || !isEmergencySessionId(
      record.emergencySessionId,
    )
    || !isIdentityId(
      'account',
      record.accountId,
    )
    || generation === null
    || typeof record.configId !== 'string'
    || !CONFIG_ID.test(record.configId)
    || typeof record.configRevision !== 'number'
    || !Number.isSafeInteger(
      record.configRevision,
    )
    || record.configRevision < 0
    || typeof record.startedAtMs !== 'number'
    || !Number.isSafeInteger(
      record.startedAtMs,
    )

    || record.startedAtMs < 0
    || typeof record.deadlineAtMs !== 'number'
    || !Number.isSafeInteger(
      record.deadlineAtMs,
    )
    || typeof record.timeoutMs !== 'number'
    || !Number.isSafeInteger(
      record.timeoutMs,
    )
    || record.timeoutMs < 3_000
    || record.timeoutMs > 60_000
    || record.deadlineAtMs
      !== record.startedAtMs + record.timeoutMs
    || !Number.isSafeInteger(
      record.deadlineAtMs,
    )
    || typeof record.simulationOnly !== 'boolean'
    || record.grantsAuthority !== false
    || record.performsExternalAction !== false
  ) {
    return null;
  }

  return Object.freeze({
    checkId: record.checkId,
    emergencySessionId:
      record.emergencySessionId,
    accountId: record.accountId,
    generation,
    configId: record.configId,
    configRevision:
      record.configRevision,
    startedAtMs: record.startedAtMs,
    deadlineAtMs: record.deadlineAtMs,
    timeoutMs: record.timeoutMs,
    simulationOnly:
      record.simulationOnly,
    grantsAuthority: false,
    performsExternalAction: false,
  });
}

function parseAcceptedEvent(
  input: unknown,
): AcceptedEmergencyUserEvent | null {
  if (
    typeof input !== 'object'
    || input === null
    || Array.isArray(input)
  ) {
    return null;
  }

  const record =
    input as Record<string, unknown>;

  if (
    Object.keys(record).length
      !== ACCEPTED_EVENT_KEYS.size

    || Object.keys(record).some(
      (key) => !ACCEPTED_EVENT_KEYS.has(key),
    )
    || record.grantsAuthority !== false
    || record.performsExternalAction !== false
    || typeof record.acceptedAtMs !== 'number'
    || !Number.isSafeInteger(
      record.acceptedAtMs,
    )
    || record.acceptedAtMs < 0
  ) {
    return null;
  }

  const base =
    parseEmergencyUserEvent({
      emergencySessionId:
        record.emergencySessionId,
      eventId: record.eventId,
      sequence: record.sequence,
      accountId: record.accountId,
      sourceDeviceId:
        record.sourceDeviceId,
      generation: record.generation,
      kind: record.kind,
    });

  if (!base) {
    return null;
  }


  return Object.freeze({
    ...base,
    acceptedAtMs: record.acceptedAtMs,
  });
}

function configMatchesSession(
  config: EmergencyGuardianConfig,
  session: EmergencySession,
): boolean {
  return (
    config.configId === session.configId
    && config.revision
      === session.configRevision
    && config.accountId === session.accountId
    && config.mode === session.mode
    && config.simulationOnly
      === session.simulationOnly
  );
}

export function startEmergencyResponsivenessCheck(
  input: unknown,
  trustedEvaluationTimeInput: unknown,
): EmergencyResponsivenessStartResult {
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
    return startResult(
      false,
      null,
      'invalid_input',
    );
  }

  const record =
    input as Record<string, unknown>;

  if (
    Object.keys(record).length
      !== START_KEYS.size
    || Object.keys(record).some(
      (key) => !START_KEYS.has(key),
    )
    || typeof record.checkId !== 'string'
    || !CHECK_ID.test(record.checkId)
  ) {
    return startResult(
      false,
      null,
      'invalid_input',
    );
  }

  if (
    !isEmergencyGuardianSessionState(
      record.sessionState,
    )
  ) {
    return startResult(
      false,
      null,
      'invalid_input',
    );
  }

  const sessionState =
    record.sessionState;
  const session =
    sessionState.session;
  const state =
    sessionState.state;
  const config =
    parseEmergencyGuardianConfig(
      record.config,
      nowMs,
    );

  if (!config) {
    return startResult(
      false,
      null,
      'invalid_input',
    );
  }

  if (!config.enabled) {
    return startResult(
      false,
      null,
      'guardian_disabled',
    );
  }

  if (
    !config.evidenceSources.includes(
      'responsiveness',
    )
  ) {
    return startResult(
      false,
      null,
      'responsiveness_disabled',
    );
  }

  if (config.accountId !== session.accountId) {

    return startResult(
      false,
      null,
      'account_mismatch',
    );
  }

  if (!configMatchesSession(
    config,
    session,
  )) {
    return startResult(
      false,
      null,
      'session_config_mismatch',
    );
  }

  if (state.enteredAtMs > nowMs) {
    return startResult(
      false,
      null,
      'non_monotonic_time',
    );
  }

  if (state.phase !== 'check_user') {
    return startResult(
      false,
      null,
      'state_not_checking_user',
    );
  }

  if (
    nowMs
      > Number.MAX_SAFE_INTEGER
        - config.responsivenessTimeoutMs
  ) {
    return startResult(
      false,
      null,
      'time_overflow',
    );
  }

  const check:
    EmergencyResponsivenessCheck =
    Object.freeze({
      checkId: record.checkId,
      emergencySessionId:
        session.emergencySessionId,
      accountId: session.accountId,
      generation: state.generation,
      configId: config.configId,
      configRevision: config.revision,
      startedAtMs: nowMs,
      deadlineAtMs:
        nowMs
        + config.responsivenessTimeoutMs,
      timeoutMs:
        config.responsivenessTimeoutMs,
      simulationOnly:
        session.simulationOnly,
      grantsAuthority: false,
      performsExternalAction: false,
    });

  issuedResponsivenessChecks.add(check);

  return startResult(
    true,
    check,
    'accepted',
  );
}

export function evaluateEmergencyResponsivenessCheck(
  input: unknown,
  trustedEvaluationTimeInput: unknown,
): EmergencyResponsivenessEvaluation {
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
    return evaluationResult(
      false,
      'pending',
      'invalid_input',
      null,
      null,
      null,
    );
  }

  const record =
    input as Record<string, unknown>;

  if (
    Object.keys(record).length
      !== EVALUATE_KEYS.size
    || Object.keys(record).some(
      (key) => !EVALUATE_KEYS.has(key),
    )
  ) {
    return evaluationResult(
      false,
      'pending',
      'invalid_input',
      null,
      nowMs,
      null,
    );
  }

  if (
    !isEmergencyResponsivenessCheck(
      record.check,
    )
  ) {
    return evaluationResult(
      false,
      'pending',
      'untrusted_check_provenance',
      null,
      nowMs,
      null,
    );
  }

  const check = record.check;

  if (!parseCheck(check)) {
    return boundEvaluationResult(
      check,
      false,
      'pending',
      'invalid_input',
      null,
      nowMs,
    );
  }

  if (nowMs < check.startedAtMs) {
    return boundEvaluationResult(
      check,
      false,
      'pending',
      'non_monotonic_time',
      null,
      nowMs,
    );
  }

  if (record.event === null) {
    if (nowMs < check.deadlineAtMs) {
      return boundEvaluationResult(
        check,
        true,
        'pending',
        'pending',
        null,
        nowMs,
      );
    }

    return boundEvaluationResult(
      check,
      true,
      'timed_out',
      'timed_out',
      null,
      nowMs,
    );
  }

  if (
    !isRegistryAcceptedEmergencyUserEvent(
      record.event,
    )
  ) {
    return boundEvaluationResult(
      check,
      false,
      'pending',
      'untrusted_event_provenance',
      null,
      nowMs,
    );
  }

  const event =
    parseAcceptedEvent(
      record.event,
    );

  if (!event) {
    return boundEvaluationResult(
      check,
      false,
      'pending',
      'invalid_input',
      null,
      nowMs,
    );
  }

  if (
    event.emergencySessionId
      !== check.emergencySessionId
    || event.accountId !== check.accountId
    || event.generation !== check.generation
  ) {
    return boundEvaluationResult(
      check,
      false,
      'pending',
      'event_binding_mismatch',
      null,
      nowMs,
    );
  }

  if (event.acceptedAtMs < check.startedAtMs) {
    return boundEvaluationResult(
      check,
      false,
      'pending',
      'event_before_check',
      null,
      nowMs,
    );
  }

  if (event.acceptedAtMs > nowMs) {
    return boundEvaluationResult(
      check,
      false,
      'pending',
      'future_event',
      null,
      nowMs,
    );
  }

  if (event.acceptedAtMs > check.deadlineAtMs) {
    return boundEvaluationResult(
      check,
      true,
      'timed_out',
      'late_response',
      event.kind,
      nowMs,
    );
  }

  return boundEvaluationResult(
    check,
    true,
    'responsive',
    'responsive',
    event.kind,
    nowMs,
  );
}
