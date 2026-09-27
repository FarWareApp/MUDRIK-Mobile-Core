import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createTaskLifecycle,
  isTaskLifecycle,
  transitionTaskLifecycle,
} from '../src/task-lifecycle.mjs';

const TASK =
  'ctask_0123456789abcdef';
const NOW = 100_000;

function created() {
  const result =
    createTaskLifecycle(
      TASK,
      NOW,
    );

  assert.equal(result.accepted, true);
  return result.lifecycle;
}

test(
  'creates an authority-free durable lifecycle identity',
  () => {
    const lifecycle = created();

    assert.equal(lifecycle.state, 'draft');
    assert.equal(lifecycle.revision, 0);
    assert.equal(
      lifecycle.grantsAuthority,
      false,
    );
    assert.equal(
      lifecycle.performsExternalAction,
      false,
    );
    assert.equal(
      isTaskLifecycle(lifecycle),
      true,
    );
  },
);

test(
  'normal task lifecycle reaches success only through valid transitions',
  () => {
    let state = created();

    for (const [
      event,
      expected,
    ] of [
      ['approve', 'approved'],
      ['queue', 'queued'],
      ['start', 'running'],
      ['succeed', 'succeeded'],
    ]) {
      const result =
        transitionTaskLifecycle(
          state,
          event,
          state.updatedAtMs + 1,
        );

      assert.equal(result.accepted, true);
      assert.equal(
        result.reason,
        'transitioned',
      );
      assert.equal(
        result.next.state,
        expected,
      );
      assert.equal(
        result.next.revision,
        state.revision + 1,
      );
      state = result.next;
    }
  },
);

test(
  'pause resumes through queued state so policy is rechecked before running',
  () => {
    let state = created();

    for (const event of [
      'approve',
      'queue',
      'start',
      'pause',
    ]) {
      state =
        transitionTaskLifecycle(
          state,
          event,
          state.updatedAtMs + 1,
        ).next;
    }

    assert.equal(state.state, 'paused');

    const resumed =
      transitionTaskLifecycle(
        state,
        'resume',
        state.updatedAtMs + 1,
      );
    assert.equal(resumed.accepted, true);
    assert.equal(
      resumed.next.state,
      'queued',
    );
  },
);

test(
  'cancel and repeated control events are idempotent',
  () => {
    const lifecycle = created();
    const cancelled =
      transitionTaskLifecycle(
        lifecycle,
        'cancel',
        NOW + 1,
      );

    assert.equal(cancelled.accepted, true);
    assert.equal(
      cancelled.next.state,
      'cancelled',
    );

    const duplicate =
      transitionTaskLifecycle(
        cancelled.next,
        'cancel',
        NOW + 2,
      );

    assert.equal(duplicate.accepted, true);
    assert.equal(
      duplicate.reason,
      'duplicate',
    );
    assert.equal(
      duplicate.next,
      cancelled.next,
    );
  },
);

test(
  'terminal task states reject later unrelated transitions',
  () => {
    let state = created();

    for (const event of [
      'approve',
      'queue',
      'start',
      'fail',
    ]) {
      state =
        transitionTaskLifecycle(
          state,
          event,
          state.updatedAtMs + 1,
        ).next;
    }

    const replay =
      transitionTaskLifecycle(
        state,
        'resume',
        state.updatedAtMs + 1,
      );

    assert.equal(replay.accepted, false);
    assert.equal(
      replay.reason,
      'terminal_state',
    );  },
);

test(
  'trusted time rollback fails closed',
  () => {
    const lifecycle = created();

    const result =
      transitionTaskLifecycle(
        lifecycle,
        'approve',
        NOW - 1,
      );

    assert.equal(result.accepted, false);
    assert.equal(
      result.reason,
      'time_rollback',
    );
  },
);

test(
  'invalid ids states hidden authority and invalid events fail closed',
  () => {
    assert.equal(
      createTaskLifecycle(
        'task_bad',
        NOW,
      ).accepted,
      false,
    );

    const lifecycle = created();

    assert.equal(
      isTaskLifecycle({
        ...lifecycle,
        grantsAuthority: true,
      }),
      false,    );

    assert.equal(
      transitionTaskLifecycle(
        lifecycle,
        'execute_shell',
        NOW + 1,
      ).accepted,
      false,
    );

    assert.equal(
      transitionTaskLifecycle(
        {
          ...lifecycle,
          hidden: true,
        },
        'approve',
        NOW + 1,
      ).accepted,
      false,
    );
  },
);
