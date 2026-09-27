import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createTaskEvent,
  isTaskEvent,
} from '../src/task-event.mjs';

const TASK =
  'ctask_0123456789abcdef';
const NOW = 100_000;

function event(overrides = {}) {
  return {
    taskId: TASK,
    sequence: 0,
    type: 'task.admitted',
    occurredAtMs: NOW,
    stepId: null,
    reason: null,
    outcome: null,
    ...overrides,
  };
}

test('task events are bounded authority-free audit records', () => {
  const value =
    createTaskEvent(event());

  assert.ok(value);
  assert.equal(
    value.grantsAuthority,
    false,
  );
  assert.equal(
    value.performsExternalAction,
    false,
  );
  assert.equal(
    isTaskEvent(value),
    true,
  );
});

test('task event rejects free-text reasons hidden fields and malformed steps', () => {
  for (const value of [
    event({
      reason: 'something bad happened here',
    }),
    {
      ...event(),
      stdout: 'secret output',
    },
    event({
      stepId: 'step-bad',
    }),
    event({
      sequence: -1,
    }),
  ]) {
    assert.equal(
      createTaskEvent(value),
      null,
    );
  }
});

test('task event accepts stable step checkpoint metadata only', () => {
  const value =
    createTaskEvent(
      event({
        type: 'step.checkpointed',
        stepId:
          'cstep_0123456789abcdef',
        outcome: 'succeeded',
      }),
    );

  assert.ok(value);
  assert.equal(
    value.outcome,
    'succeeded',
  );
});
