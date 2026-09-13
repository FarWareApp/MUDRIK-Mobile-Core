export type ObservationPrivacyPolicyState =
  | 'active'
  | 'visual_off'
  | 'ambient_off'
  | 'privacy_lock';

export type ObservationPrivacyEvent =
  | 'stop_visual'
  | 'stop_ambient'
  | 'lock_privacy'
  | 'resume_visual'
  | 'resume_ambient'
  | 'unlock_privacy'
  | 'app_restart'
  | 'model_restart'
  | 'device_handoff'
  | 'room_change'
  | 'new_conversation'
  | 'ordinary_activity';

export type ReactivationChecks = Readonly<{
  explicitUserRequest: boolean;
  osPermissionGranted: boolean;
  deviceTrusted: boolean;
  runtimeAvailable: boolean;
}>;

export type ObservationPrivacyTransitionReason =
  | 'applied'
  | 'no_change'
  | 'preserved_restriction'
  | 'explicit_user_request_required'
  | 'os_permission_required'
  | 'trusted_device_required'
  | 'runtime_unavailable'
  | 'broader_unlock_required'
  | 'invalid_input_fail_closed';

export type ObservationPrivacyTransition = Readonly<{
  previousState: ObservationPrivacyPolicyState;
  nextState: ObservationPrivacyPolicyState;
  changed: boolean;
  allowed: boolean;
  reason: ObservationPrivacyTransitionReason;
}>;

const POLICY_STATES: readonly ObservationPrivacyPolicyState[] = [
  'active',
  'visual_off',
  'ambient_off',
  'privacy_lock',
];

const EVENTS: readonly ObservationPrivacyEvent[] = [
  'stop_visual',
  'stop_ambient',
  'lock_privacy',
  'resume_visual',
  'resume_ambient',
  'unlock_privacy',
  'app_restart',
  'model_restart',
  'device_handoff',
  'room_change',
  'new_conversation',
  'ordinary_activity',
];

function isPolicyState(value: unknown): value is ObservationPrivacyPolicyState {
  return typeof value === 'string' && POLICY_STATES.includes(
    value as ObservationPrivacyPolicyState,
  );
}

function isEvent(value: unknown): value is ObservationPrivacyEvent {
  return typeof value === 'string' && EVENTS.includes(
    value as ObservationPrivacyEvent,
  );
}

function isReactivationEvent(
  event: ObservationPrivacyEvent,
): boolean {
  return (
    event === 'resume_visual' ||
    event === 'resume_ambient' ||
    event === 'unlock_privacy'
  );
}

function parseReactivationChecks(value: unknown): ReactivationChecks | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const allowedKeys = new Set([
    'explicitUserRequest',
    'osPermissionGranted',
    'deviceTrusted',
    'runtimeAvailable',
  ]);

  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return null;
  }

  if (
    typeof record.explicitUserRequest !== 'boolean' ||
    typeof record.osPermissionGranted !== 'boolean' ||
    typeof record.deviceTrusted !== 'boolean' ||
    typeof record.runtimeAvailable !== 'boolean'
  ) {
    return null;
  }

  return record as ReactivationChecks;
}

function failClosed(previousState: ObservationPrivacyPolicyState | null): ObservationPrivacyTransition {
  return {
    previousState: previousState ?? 'privacy_lock',
    nextState: 'privacy_lock',
    changed: previousState !== 'privacy_lock',
    allowed: false,
    reason: 'invalid_input_fail_closed',
  };
}

function validateReactivation(
  state: ObservationPrivacyPolicyState,
  checks: ReactivationChecks | null,
): ObservationPrivacyTransition | null {
  if (!checks) {
    return failClosed(state);
  }

  if (!checks.explicitUserRequest) {
    return {
      previousState: state,
      nextState: state,
      changed: false,
      allowed: false,
      reason: 'explicit_user_request_required',
    };
  }

  if (!checks.osPermissionGranted) {
    return {
      previousState: state,
      nextState: state,
      changed: false,
      allowed: false,
      reason: 'os_permission_required',
    };
  }

  if (!checks.deviceTrusted) {
    return {
      previousState: state,
      nextState: state,
      changed: false,
      allowed: false,
      reason: 'trusted_device_required',
    };
  }

  if (!checks.runtimeAvailable) {
    return {
      previousState: state,
      nextState: state,
      changed: false,
      allowed: false,
      reason: 'runtime_unavailable',
    };
  }

  return null;
}

export function transitionObservationPrivacy(input: unknown): ObservationPrivacyTransition {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return failClosed(null);
  }

  const record = input as Record<string, unknown>;
  const allowedKeys = new Set(['state', 'event', 'reactivationChecks']);

  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return failClosed(isPolicyState(record.state) ? record.state : null);
  }

  if (!isPolicyState(record.state) || !isEvent(record.event)) {
    return failClosed(isPolicyState(record.state) ? record.state : null);
  }

  const state = record.state;
  const event = record.event;
  const hasReactivationChecks =
    Object.prototype.hasOwnProperty.call(record, 'reactivationChecks') &&
    record.reactivationChecks !== undefined;

  if (hasReactivationChecks && !isReactivationEvent(event)) {
    return failClosed(state);
  }

  const checks = hasReactivationChecks
    ? parseReactivationChecks(record.reactivationChecks)
    : null;

  if (hasReactivationChecks && checks === null) {
    return failClosed(state);
  }

  if (
    event === 'app_restart' ||
    event === 'model_restart' ||
    event === 'device_handoff' ||
    event === 'room_change' ||
    event === 'new_conversation' ||
    event === 'ordinary_activity'
  ) {
    return {
      previousState: state,
      nextState: state,
      changed: false,
      allowed: true,
      reason: state === 'active' ? 'no_change' : 'preserved_restriction',
    };
  }

  if (event === 'lock_privacy') {
    return {
      previousState: state,
      nextState: 'privacy_lock',
      changed: state !== 'privacy_lock',
      allowed: true,
      reason: state === 'privacy_lock' ? 'no_change' : 'applied',
    };
  }

  if (event === 'stop_ambient') {
    if (state === 'privacy_lock') {
      return {
        previousState: state,
        nextState: state,
        changed: false,
        allowed: true,
        reason: 'preserved_restriction',
      };
    }

    return {
      previousState: state,
      nextState: 'ambient_off',
      changed: state !== 'ambient_off',
      allowed: true,
      reason: state === 'ambient_off' ? 'no_change' : 'applied',
    };
  }

  if (event === 'stop_visual') {
    if (state === 'ambient_off' || state === 'privacy_lock') {
      return {
        previousState: state,
        nextState: state,
        changed: false,
        allowed: true,
        reason: 'preserved_restriction',
      };
    }

    return {
      previousState: state,
      nextState: 'visual_off',
      changed: state !== 'visual_off',
      allowed: true,
      reason: state === 'visual_off' ? 'no_change' : 'applied',
    };
  }

  if (event === 'resume_visual') {
    if (state === 'privacy_lock' || state === 'ambient_off') {
      return {
        previousState: state,
        nextState: state,
        changed: false,
        allowed: false,
        reason: 'broader_unlock_required',
      };
    }

    if (state === 'active') {
      return {
        previousState: state,
        nextState: state,
        changed: false,
        allowed: true,
        reason: 'no_change',
      };
    }

    const denied = validateReactivation(state, checks);
    if (denied) {
      return denied;
    }

    return {
      previousState: state,
      nextState: 'active',
      changed: true,
      allowed: true,
      reason: 'applied',
    };
  }

  if (event === 'resume_ambient') {
    if (state === 'privacy_lock') {
      return {
        previousState: state,
        nextState: state,
        changed: false,
        allowed: false,
        reason: 'broader_unlock_required',
      };
    }

    if (state === 'active' || state === 'visual_off') {
      return {
        previousState: state,
        nextState: state,
        changed: false,
        allowed: true,
        reason: 'no_change',
      };
    }

    const denied = validateReactivation(state, checks);
    if (denied) {
      return denied;
    }

    return {
      previousState: state,
      nextState: 'active',
      changed: true,
      allowed: true,
      reason: 'applied',
    };
  }

  if (event === 'unlock_privacy') {
    if (state !== 'privacy_lock') {
      return {
        previousState: state,
        nextState: state,
        changed: false,
        allowed: true,
        reason: 'no_change',
      };
    }

    const denied = validateReactivation(state, checks);
    if (denied) {
      return denied;
    }

    return {
      previousState: state,
      nextState: 'active',
      changed: true,
      allowed: true,
      reason: 'applied',
    };
  }

  return failClosed(state);
}
