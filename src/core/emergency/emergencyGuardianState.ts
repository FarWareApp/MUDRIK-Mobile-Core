import {
  parseTrustedEvaluationTime,
} from '../security/trustedEvaluationTime';

export type EmergencyGuardianPhase =
  | 'normal'
  | 'watch'
  | 'check_user'
  | 'urgent'
  | 'critical'
  | 'escalating'
  | 'resolved';

export type EmergencyGuardianEvent =
  | 'risk_watch'
  | 'request_check'
  | 'risk_urgent'
  | 'risk_critical'
  | 'begin_escalation'
  | 'user_cancel'
  | 'user_ok'
  | 'resolve'
  | 'reset';

export type EmergencyGuardianState = Readonly<{
  phase: EmergencyGuardianPhase;
  generation: number;
  enteredAtMs: number;
}>;

export type EmergencyGuardianPlannedAction =
  | 'prompt_user'
  | 'present_urgent_ui'
  | 'prepare_escalation'
  | 'cancel_pending_escalation'
  | 'none';

export type EmergencyGuardianTransition =
  Readonly<{
    previous: EmergencyGuardianState;
    next: EmergencyGuardianState;
    accepted: boolean;
    reason:
      | 'applied'
      | 'idempotent'
      | 'invalid_input'
      | 'invalid_event'
      | 'non_monotonic_time'
      | 'generation_exhausted';
    plannedActions:
      readonly EmergencyGuardianPlannedAction[];
    grantsAuthority: false;
    performsExternalAction: false;
  }>;

const PHASES:
  readonly EmergencyGuardianPhase[] = [
    'normal',
    'watch',
    'check_user',
    'urgent',
    'critical',
    'escalating',
    'resolved',
  ];

const EVENTS:
  readonly EmergencyGuardianEvent[] = [
    'risk_watch',
    'request_check',
    'risk_urgent',
    'risk_critical',
    'begin_escalation',
    'user_cancel',
    'user_ok',
    'resolve',
    'reset',
  ];

const INPUT_KEYS = new Set([
  'state',
  'event',
]);

const STATE_KEYS = new Set([
  'phase',
  'generation',
  'enteredAtMs',
]);

export const INITIAL_EMERGENCY_GUARDIAN_STATE:
  EmergencyGuardianState =
  Object.freeze({
    phase: 'normal',
    generation: 0,
    enteredAtMs: 0,
  });

function isPhase(
  value: unknown,
): value is EmergencyGuardianPhase {
  return (
    typeof value === 'string'
    && PHASES.includes(
      value as EmergencyGuardianPhase,
    )
  );
}

function isEvent(
  value: unknown,
): value is EmergencyGuardianEvent {
  return (
    typeof value === 'string'
    && EVENTS.includes(
      value as EmergencyGuardianEvent,
    )
  );
}

export function parseEmergencyGuardianStateSnapshot(
  value: unknown,
): EmergencyGuardianState | null {
  if (
    typeof value !== 'object'
    || value === null
    || Array.isArray(value)
  ) {
    return null;
  }

  const record =
    value as Record<string, unknown>;

  if (
    Object.keys(record).length
      !== STATE_KEYS.size
    || Object.keys(record).some(
      (key) => !STATE_KEYS.has(key),
    )
    || !isPhase(record.phase)
    || typeof record.generation !== 'number'
    || !Number.isSafeInteger(
      record.generation,
    )
    || record.generation < 0
    || typeof record.enteredAtMs !== 'number'
    || !Number.isSafeInteger(
      record.enteredAtMs,
    )
    || record.enteredAtMs < 0
  ) {
    return null;
  }

  return Object.freeze({
    phase: record.phase,
    generation: record.generation,
    enteredAtMs: record.enteredAtMs,
  });
}

function result(
  previous: EmergencyGuardianState,
  next: EmergencyGuardianState,
  accepted: boolean,
  reason:
    EmergencyGuardianTransition['reason'],
  plannedActions:
    readonly EmergencyGuardianPlannedAction[]
      = ['none'],
): EmergencyGuardianTransition {
  return Object.freeze({
    previous,
    next,
    accepted,
    reason,
    plannedActions:
      Object.freeze([
        ...plannedActions,
      ]),
    grantsAuthority: false,
    performsExternalAction: false,
  });
}

function nextState(
  state: EmergencyGuardianState,
  phase: EmergencyGuardianPhase,
  enteredAtMs: number,
  incrementGeneration = false,
): EmergencyGuardianState {
  return Object.freeze({
    phase,
    generation:
      state.generation
      + (incrementGeneration ? 1 : 0),
    enteredAtMs,
  });
}

function actionForPhase(
  phase: EmergencyGuardianPhase,
): readonly EmergencyGuardianPlannedAction[] {
  if (phase === 'check_user') {
    return ['prompt_user'];
  }

  if (
    phase === 'urgent'
    || phase === 'critical'
  ) {
    return ['present_urgent_ui'];
  }

  if (phase === 'escalating') {
    return ['prepare_escalation'];
  }

  return ['none'];
}

function transitionTarget(
  phase: EmergencyGuardianPhase,
  event: EmergencyGuardianEvent,
): EmergencyGuardianPhase | null {
  const transitions: Readonly<
    Partial<
      Record<
        EmergencyGuardianPhase,
        Partial<
          Record<
            EmergencyGuardianEvent,
            EmergencyGuardianPhase
          >
        >
      >
    >
  > = {
    normal: {
      risk_watch: 'watch',
      request_check: 'check_user',
      risk_urgent: 'urgent',
      risk_critical: 'critical',
      user_ok: 'resolved',
    },
    watch: {
      request_check: 'check_user',
      risk_urgent: 'urgent',
      risk_critical: 'critical',
      user_ok: 'resolved',
      resolve: 'resolved',
    },
    check_user: {
      risk_watch: 'watch',
      risk_urgent: 'urgent',
      risk_critical: 'critical',
      user_ok: 'resolved',
      resolve: 'resolved',
    },
    urgent: {
      request_check: 'check_user',
      risk_critical: 'critical',
      user_ok: 'resolved',
      resolve: 'resolved',
    },
    critical: {
      begin_escalation: 'escalating',
      user_cancel: 'check_user',
      user_ok: 'resolved',
      resolve: 'resolved',
    },
    escalating: {
      user_cancel: 'check_user',
      resolve: 'resolved',
    },
    resolved: {
      resolve: 'resolved',
    },
  };

  return (
    transitions[phase]?.[event]
      ?? null
  );
}

export function transitionEmergencyGuardian(
  input: unknown,
  trustedEvaluationTimeInput: unknown,
): EmergencyGuardianTransition {
  const trustedEvaluationTimeMs =
    parseTrustedEvaluationTime(
      trustedEvaluationTimeInput,
    );

  if (
    trustedEvaluationTimeMs === null
    || typeof input !== 'object'
    || input === null
    || Array.isArray(input)
  ) {
    return result(
      INITIAL_EMERGENCY_GUARDIAN_STATE,
      INITIAL_EMERGENCY_GUARDIAN_STATE,
      false,
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
  ) {
    return result(
      INITIAL_EMERGENCY_GUARDIAN_STATE,
      INITIAL_EMERGENCY_GUARDIAN_STATE,
      false,
      'invalid_input',
    );
  }

  const state =
    parseEmergencyGuardianStateSnapshot(
      record.state,
    );

  if (!state) {
    return result(
      INITIAL_EMERGENCY_GUARDIAN_STATE,
      INITIAL_EMERGENCY_GUARDIAN_STATE,
      false,
      'invalid_input',
    );
  }

  if (
    state.enteredAtMs
      > trustedEvaluationTimeMs
  ) {
    return result(
      state,
      state,
      false,
      'non_monotonic_time',
    );
  }

  if (!isEvent(record.event)) {
    return result(
      state,
      state,
      false,
      'invalid_event',
    );
  }

  const event = record.event;

  if (event === 'reset') {
    if (state.phase !== 'resolved') {
      return result(
        state,
        state,
        false,
        'invalid_event',
      );
    }

    if (
      state.generation
        === Number.MAX_SAFE_INTEGER
    ) {
      return result(
        state,
        state,
        false,
        'generation_exhausted',
      );
    }

    return result(
      state,
      nextState(
        state,
        'normal',
        trustedEvaluationTimeMs,
        true,
      ),
      true,
      'applied',
    );
  }

  const target =
    transitionTarget(
      state.phase,
      event,
    );

  if (!target) {
    return result(
      state,
      state,
      false,
      'invalid_event',
    );
  }

  if (target === state.phase) {
    return result(
      state,
      state,
      true,
      'idempotent',
    );
  }

  const plannedActions =
    event === 'user_cancel'
      && (
        state.phase === 'critical'
        || state.phase === 'escalating'
      )
      ? [
          'cancel_pending_escalation',
          'prompt_user',
        ] as const
      : actionForPhase(target);

  return result(
    state,
    nextState(
      state,
      target,
      trustedEvaluationTimeMs,
    ),
    true,
    'applied',
    plannedActions,
  );
}
