const TASK_ID =
  /^ctask_[a-z0-9][a-z0-9_-]{15,127}$/;

export const TASK_STATES = Object.freeze([
  'draft',
  'awaiting_approval',
  'approved',
  'queued',
  'running',
  'paused',
  'blocked',
  'succeeded',
  'failed',
  'cancelled',
]);

export const TASK_EVENTS = Object.freeze([
  'request_approval',
  'approve',
  'queue',
  'start',
  'pause',
  'resume',
  'block',
  'succeed',
  'fail',
  'cancel',
]);

const TERMINAL_STATES = new Set([
  'succeeded',
  'failed',
  'cancelled',
]);

const TRANSITIONS = Object.freeze({
  draft: Object.freeze({
    request_approval: 'awaiting_approval',
    approve: 'approved',
    cancel: 'cancelled',
  }),
  awaiting_approval: Object.freeze({
    approve: 'approved',
    cancel: 'cancelled',
  }),
  approved: Object.freeze({
    queue: 'queued',
    cancel: 'cancelled',
  }),
  queued: Object.freeze({
    start: 'running',
    pause: 'paused',
    block: 'blocked',
    cancel: 'cancelled',
  }),
  running: Object.freeze({
    pause: 'paused',
    block: 'blocked',
    succeed: 'succeeded',
    fail: 'failed',
    cancel: 'cancelled',
  }),
  paused: Object.freeze({
    resume: 'queued',
    cancel: 'cancelled',
  }),
  blocked: Object.freeze({
    resume: 'queued',
    cancel: 'cancelled',
  }),
  succeeded: Object.freeze({}),
  failed: Object.freeze({}),
  cancelled: Object.freeze({}),
});

const IDEMPOTENT_EVENT_STATE =
  Object.freeze({
    request_approval: 'awaiting_approval',
    approve: 'approved',
    queue: 'queued',
    start: 'running',
    pause: 'paused',
    block: 'blocked',
    succeed: 'succeeded',
    fail: 'failed',
    cancel: 'cancelled',
  });

function validTrustedTime(value) {
  return (
    Number.isSafeInteger(value)
    && value >= 0
  );
}

export function isTaskId(value) {
  return (
    typeof value === 'string'
    && TASK_ID.test(value)
  );
}

export function isTaskState(value) {
  return (
    typeof value === 'string'
    && TASK_STATES.includes(value)
  );
}

export function isTaskLifecycle(value) {
  return (
    typeof value === 'object'
    && value !== null
    && !Array.isArray(value)
    && isTaskId(value.taskId)    && isTaskState(value.state)
    && Number.isSafeInteger(value.revision)
    && value.revision >= 0
    && validTrustedTime(value.createdAtMs)
    && validTrustedTime(value.updatedAtMs)
    && value.createdAtMs <= value.updatedAtMs
    && value.grantsAuthority === false
    && value.performsExternalAction === false
    && Object.keys(value).length === 7
  );
}

export function createTaskLifecycle(
  taskId,
  trustedTimeMs,
) {
  if (
    !isTaskId(taskId)
    || !validTrustedTime(trustedTimeMs)
  ) {
    return Object.freeze({
      accepted: false,
      lifecycle: null,
      reason: 'invalid_input',
    });
  }

  return Object.freeze({
    accepted: true,
    lifecycle: Object.freeze({
      taskId,
      state: 'draft',
      revision: 0,
      createdAtMs: trustedTimeMs,
      updatedAtMs: trustedTimeMs,
      grantsAuthority: false,
      performsExternalAction: false,
    }),
    reason: 'created',
  });
}

export function transitionTaskLifecycle(
  lifecycle,
  event,
  trustedTimeMs,
) {
  if (
    !isTaskLifecycle(lifecycle)
    || !TASK_EVENTS.includes(event)
    || !validTrustedTime(trustedTimeMs)
  ) {
    return Object.freeze({
      accepted: false,
      next: null,
      reason: 'invalid_input',
    });
  }

  if (trustedTimeMs < lifecycle.updatedAtMs) {
    return Object.freeze({
      accepted: false,
      next: lifecycle,
      reason: 'time_rollback',
    });
  }

  if (
    IDEMPOTENT_EVENT_STATE[event]
      === lifecycle.state
  ) {
    return Object.freeze({
      accepted: true,
      next: lifecycle,
      reason: 'duplicate',
    });
  }

  if (TERMINAL_STATES.has(lifecycle.state)) {
    return Object.freeze({
      accepted: false,
      next: lifecycle,
      reason: 'terminal_state',
    });
  }
  const nextState =
    TRANSITIONS[lifecycle.state][event];

  if (!nextState) {
    return Object.freeze({
      accepted: false,
      next: lifecycle,
      reason: 'invalid_transition',
    });
  }

  if (
    lifecycle.revision
      === Number.MAX_SAFE_INTEGER
  ) {
    return Object.freeze({
      accepted: false,
      next: lifecycle,
      reason: 'revision_exhausted',
    });
  }

  return Object.freeze({
    accepted: true,
    next: Object.freeze({
      taskId: lifecycle.taskId,
      state: nextState,
      revision: lifecycle.revision + 1,
      createdAtMs: lifecycle.createdAtMs,
      updatedAtMs: trustedTimeMs,
      grantsAuthority: false,
      performsExternalAction: false,
    }),
    reason: 'transitioned',
  });
}
