import {
  parseTrustedEvaluationTime,
} from '../security/trustedEvaluationTime';

import {
  transitionEmergencyGuardian,
} from './emergencyGuardianState';

import {
  isRegisteredEmergencySession,
} from './emergencySessionRegistry';

import type {
  EmergencyGuardianEvent,
  EmergencyGuardianPlannedAction,
  EmergencyGuardianState,
  EmergencyGuardianTransition,
} from './emergencyGuardianState';

import type {
  EmergencySession,
} from './emergencySession';

export type EmergencyGuardianSessionState =
  Readonly<{
    session: EmergencySession;
    state: EmergencyGuardianState;
    grantsAuthority: false;
  }>;


export type EmergencyGuardianSessionStateResult =
  Readonly<{
    accepted: boolean;
    state: EmergencyGuardianSessionState | null;
    reason:
      | 'accepted'
      | 'invalid_input';
    grantsAuthority: false;
    performsExternalAction: false;
  }>;

export type EmergencyGuardianSessionTransition =
  Readonly<{
    accepted: boolean;
    previous: EmergencyGuardianSessionState | null;
    next: EmergencyGuardianSessionState | null;
    reason:
      | EmergencyGuardianTransition['reason']
      | 'untrusted_state';
    plannedActions:
      readonly EmergencyGuardianPlannedAction[];
    grantsAuthority: false;
    performsExternalAction: false;
  }>;

const TRANSITION_KEYS = new Set([
  'sessionState',
  'event',
]);

const issuedSessionStates =
  new WeakSet<object>();


function issueState(
  session: EmergencySession,
  state: EmergencyGuardianState,
): EmergencyGuardianSessionState {
  const issued =
    Object.freeze({
      session,
      state,
      grantsAuthority: false as const,
    });

  issuedSessionStates.add(issued);
  return issued;
}

function createResult(
  accepted: boolean,
  state: EmergencyGuardianSessionState | null,
  reason:
    EmergencyGuardianSessionStateResult['reason'],
): EmergencyGuardianSessionStateResult {
  return Object.freeze({
    accepted,
    state,
    reason,
    grantsAuthority: false,
    performsExternalAction: false,
  });
}

function transitionResult(
  accepted: boolean,
  previous: EmergencyGuardianSessionState | null,

  next: EmergencyGuardianSessionState | null,
  reason:
    EmergencyGuardianSessionTransition['reason'],
  plannedActions:
    readonly EmergencyGuardianPlannedAction[],
): EmergencyGuardianSessionTransition {
  return Object.freeze({
    accepted,
    previous,
    next,
    reason,
    plannedActions:
      Object.freeze([
        ...plannedActions,
      ]),
    grantsAuthority: false,
    performsExternalAction: false,
  });
}

export function isEmergencyGuardianSessionState(
  value: unknown,
): value is EmergencyGuardianSessionState {
  return (
    typeof value === 'object'
    && value !== null
    && issuedSessionStates.has(value)
  );
}

export function createEmergencyGuardianSessionState(
  sessionInput: unknown,
  trustedEvaluationTimeInput: unknown,

): EmergencyGuardianSessionStateResult {
  const nowMs =
    parseTrustedEvaluationTime(
      trustedEvaluationTimeInput,
    );

  if (
    nowMs === null
    || !isRegisteredEmergencySession(
      sessionInput,
    )
    || sessionInput.openedAtMs > nowMs
  ) {
    return createResult(
      false,
      null,
      'invalid_input',
    );
  }

  const session = sessionInput;
  const state: EmergencyGuardianState =
    Object.freeze({
      phase: 'normal',
      generation: 0,
      enteredAtMs: nowMs,
    });

  return createResult(
    true,
    issueState(
      session,
      state,
    ),
    'accepted',
  );
}


export function transitionEmergencyGuardianSessionState(
  input: unknown,
  trustedEvaluationTimeInput: unknown,
): EmergencyGuardianSessionTransition {
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
    return transitionResult(
      false,
      null,
      null,
      'invalid_input',
      ['none'],
    );
  }

  const record =
    input as Record<string, unknown>;

  if (
    Object.keys(record).length
      !== TRANSITION_KEYS.size
    || Object.keys(record).some(
      (key) => !TRANSITION_KEYS.has(key),

    )
  ) {
    return transitionResult(
      false,
      null,
      null,
      'invalid_input',
      ['none'],
    );
  }

  if (
    !isEmergencyGuardianSessionState(
      record.sessionState,
    )
  ) {
    return transitionResult(
      false,
      null,
      null,
      'untrusted_state',
      ['none'],
    );
  }

  const previous =
    record.sessionState;

  const transition =
    transitionEmergencyGuardian(
      {
        state: previous.state,
        event:
          record.event as EmergencyGuardianEvent,
      },
      nowMs,
    );


  if (!transition.accepted) {
    return transitionResult(
      false,
      previous,
      previous,
      transition.reason,
      transition.plannedActions,
    );
  }

  if (
    transition.next
      === transition.previous
  ) {
    return transitionResult(
      true,
      previous,
      previous,
      transition.reason,
      transition.plannedActions,
    );
  }

  const next =
    issueState(
      previous.session,
      transition.next,
    );

  return transitionResult(
    true,
    previous,
    next,
    transition.reason,
    transition.plannedActions,
  );
}
