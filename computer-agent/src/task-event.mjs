import {
  isTaskId,
} from './task-lifecycle.mjs';

const STEP_ID =
  /^cstep_[a-z0-9][a-z0-9_-]{7,127}$/;

const REASON =
  /^[a-z][a-z0-9_-]{0,63}$/;

export const TASK_EVENT_TYPES =
  Object.freeze([
    'task.admitted',
    'task.queued',
    'task.started',
    'task.paused',
    'task.resumed',
    'task.cancelled',
    'task.blocked',
    'task.succeeded',
    'task.failed',
    'recovery.paused',
    'recovery.blocked',
    'step.started',
    'step.checkpointed',
    'step.failed',
  ]);

const KEYS = new Set([
  'taskId',
  'sequence',
  'type',
  'occurredAtMs',
  'stepId',
  'reason',
  'outcome',
]);

export function createTaskEvent(
  input,
) {
  if (
    typeof input !== 'object'
    || input === null
    || Array.isArray(input)
    || Object.keys(input).length
      !== KEYS.size
    || Object.keys(input).some(
      (key) => !KEYS.has(key),
    )
    || !isTaskId(input.taskId)
    || !Number.isSafeInteger(
      input.sequence,
    )
    || input.sequence < 0
    || !TASK_EVENT_TYPES.includes(
      input.type,
    )
    || !Number.isSafeInteger(
      input.occurredAtMs,
    )
    || input.occurredAtMs < 0
    || (
      input.stepId !== null
      && (
        typeof input.stepId
          !== 'string'
        || !STEP_ID.test(
          input.stepId,
        )
      )
    )
    || (
      input.reason !== null
      && (
        typeof input.reason
          !== 'string'
        || !REASON.test(
          input.reason,
        )
      )
    )
    || (
      input.outcome !== null
      && ![
        'succeeded',
        'failed',
        'failed_continued',
      ].includes(input.outcome)
    )
  ) {
    return null;
  }

  return Object.freeze({
    taskId: input.taskId,
    sequence: input.sequence,
    type: input.type,
    occurredAtMs:
      input.occurredAtMs,
    stepId: input.stepId,
    reason: input.reason,
    outcome: input.outcome,
    grantsAuthority: false,
    performsExternalAction: false,
  });
}

export function isTaskEvent(
  value,
) {
  if (
    typeof value !== 'object'
    || value === null
    || Array.isArray(value)
  ) {
    return false;
  }

  const parsed =
    createTaskEvent({
      taskId: value.taskId,
      sequence: value.sequence,
      type: value.type,
      occurredAtMs:
        value.occurredAtMs,
      stepId: value.stepId,
      reason: value.reason,
      outcome: value.outcome,
    });

  return (
    parsed !== null
    && value.grantsAuthority === false
    && value.performsExternalAction
      === false
    && Object.keys(value).length === 9
  );
}
