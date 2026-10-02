import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  GoalWorkQueue,
  parseGoalWorkItem,
  validateGoalWorkQueuePolicy,
} = loadTypeScriptModule(
  'src/core/agent/goalWorkQueue.ts',
);

const NOW = 4_700_000_000;
const WORKER_A = 'worker_ref_1111111111111111';
const WORKER_B = 'worker_ref_2222222222222222';

const policy = {
  maxQueueItems: 100,
  minimumLeaseMs: 1_000,
  maximumLeaseMs: 60_000,
  retryBaseDelayMs: 1_000,
  retryMaxDelayMs: 8_000,
};

function item(
  index,
  overrides = {},
) {
  const suffix = String(index).repeat(16);

  return {
    protocolVersion: '1.0',
    workId: 'goal_work_' + suffix,
    goalId: 'goal_1111111111111111',
    planId:
      'goal_plan_1111111111111111',
    stepId:
      'goal_step_' + suffix,
    operationRef:
      'operation_ref_' + suffix,
    priority: 500,
    sideEffect: false,
    idempotencyKey:
      'idempotency_ref_' + suffix,
    notBeforeMs: NOW,
    deadlineAtMs: NOW + 120_000,
    maxAttempts: 3,
    createdAtMs: NOW,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
    ...overrides,
  };
}

test('queue policy and work item contracts are strict', () => {
  assert.equal(
    validateGoalWorkQueuePolicy(policy),
    true,
  );
  assert.ok(parseGoalWorkItem(item(1)));

  assert.equal(
    parseGoalWorkItem({
      ...item(1),
      grantsExecutionAuthority: true,
    }),
    null,
  );
});

test('enqueue is idempotent but conflicting work id is rejected', () => {
  const queue = new GoalWorkQueue(policy);

  assert.equal(
    queue.enqueue(item(1), NOW).accepted,
    true,
  );
  assert.equal(
    queue.enqueue(item(1), NOW).idempotent,
    true,
  );

  const conflict =
    queue.enqueue(
      item(1, { priority: 999 }),
      NOW,
    );

  assert.equal(conflict.accepted, false);
  assert.equal(
    conflict.reason,
    'duplicate_conflict',
  );
});

test('claim picks highest priority then earliest deadline', () => {
  const queue = new GoalWorkQueue(policy);

  queue.enqueue(
    item(1, { priority: 100 }),
    NOW,
  );
  queue.enqueue(
    item(2, {
      priority: 900,
      deadlineAtMs: NOW + 90_000,
    }),
    NOW,
  );
  queue.enqueue(
    item(3, {
      priority: 900,
      deadlineAtMs: NOW + 60_000,
    }),
    NOW,
  );

  const claim =
    queue.claimNext(
      WORKER_A,
      NOW + 1,
      10_000,
    );

  assert.equal(claim.accepted, true);
  assert.equal(
    claim.state?.item.workId,
    item(3).workId,
  );
  assert.equal(
    claim.state?.leaseOwnerRef,
    WORKER_A,
  );
  assert.equal(claim.state?.attempt, 1);
});

test('expired read-only lease is safely retried after backoff', () => {
  const queue = new GoalWorkQueue(policy);

  queue.enqueue(item(1), NOW);

  const first =
    queue.claimNext(
      WORKER_A,
      NOW + 1,
      1_000,
    );

  assert.equal(first.state?.attempt, 1);

  const tooEarly =
    queue.claimNext(
      WORKER_B,
      NOW + 1_001,
      1_000,
    );

  assert.equal(
    tooEarly.reason,
    'no_work',
  );

  const retry =
    queue.claimNext(
      WORKER_B,
      NOW + 2_001,
      1_000,
    );

  assert.equal(retry.accepted, true);
  assert.equal(retry.state?.attempt, 2);
  assert.equal(
    retry.state?.leaseOwnerRef,
    WORKER_B,
  );
});

test('expired side-effect lease requires reconciliation and is never auto-retried', () => {
  const queue = new GoalWorkQueue(policy);

  const side = item(1, {
    sideEffect: true,
  });

  queue.enqueue(side, NOW);
  queue.claimNext(
    WORKER_A,
    NOW + 1,
    1_000,
  );

  const state =
    queue.getState(
      side.workId,
      NOW + 1_001,
    );

  assert.equal(
    state?.status,
    'reconciliation_required',
  );
  assert.equal(
    state?.lastFailureReason,
    'lease_expired_commit_unknown',
  );

  const claim =
    queue.claimNext(
      WORKER_B,
      NOW + 5_000,
      1_000,
    );

  assert.equal(claim.reason, 'no_work');
});

test('unknown side-effect commit state enters reconciliation immediately', () => {
  const queue = new GoalWorkQueue(policy);
  const side = item(1, {
    sideEffect: true,
  });

  queue.enqueue(side, NOW);
  queue.claimNext(
    WORKER_A,
    NOW + 1,
    10_000,
  );

  const failed =
    queue.fail(
      side.workId,
      WORKER_A,
      'transport_lost',
      true,
      'unknown',
      'evidence_ref_transport_111111111111',
      NOW + 100,
    );

  assert.equal(failed.accepted, true);
  assert.equal(
    failed.reason,
    'reconciliation_required',
  );
  assert.equal(
    failed.state?.status,
    'reconciliation_required',
  );
});

test('reconciliation retry needs explicit evidence then respects retry backoff', () => {
  const queue = new GoalWorkQueue(policy);
  const side = item(1, {
    sideEffect: true,
  });

  queue.enqueue(side, NOW);
  queue.claimNext(
    WORKER_A,
    NOW + 1,
    1_000,
  );

  queue.getState(
    side.workId,
    NOW + 1_001,
  );

  const resolved =
    queue.resolveReconciliation(
      side.workId,
      'retry',
      'evidence_ref_not_committed_1111111',
      NOW + 1_100,
    );

  assert.equal(resolved.accepted, true);
  assert.equal(
    resolved.state?.status,
    'queued',
  );

  assert.equal(
    queue.claimNext(
      WORKER_B,
      NOW + 1_500,
      1_000,
    ).reason,
    'no_work',
  );

  const retried =
    queue.claimNext(
      WORKER_B,
      NOW + 2_100,
      1_000,
    );

  assert.equal(retried.accepted, true);
  assert.equal(retried.state?.attempt, 2);
});

test('worker mismatch cannot complete another worker lease', () => {
  const queue = new GoalWorkQueue(policy);

  const work = item(1);
  queue.enqueue(work, NOW);
  queue.claimNext(
    WORKER_A,
    NOW + 1,
    10_000,
  );

  const wrong =
    queue.complete(
      work.workId,
      WORKER_B,
      'evidence_ref_complete_1111111111111',
      NOW + 100,
    );

  assert.equal(
    wrong.reason,
    'lease_owner_mismatch',
  );

  const done =
    queue.complete(
      work.workId,
      WORKER_A,
      'evidence_ref_complete_1111111111111',
      NOW + 100,
    );

  assert.equal(done.accepted, true);
  assert.equal(
    done.state?.status,
    'completed',
  );

  assert.equal(
    queue.complete(
      work.workId,
      WORKER_A,
      'evidence_ref_complete_1111111111111',
      NOW + 101,
    ).idempotent,
    true,
  );
});

test('attempt exhaustion moves retryable work to dead letter', () => {
  const queue =
    new GoalWorkQueue({
      ...policy,
      retryBaseDelayMs: 1_000,
      retryMaxDelayMs: 1_000,
    });

  const work =
    item(1, { maxAttempts: 1 });

  queue.enqueue(work, NOW);
  queue.claimNext(
    WORKER_A,
    NOW + 1,
    10_000,
  );

  const failed =
    queue.fail(
      work.workId,
      WORKER_A,
      'provider_timeout',
      true,
      'not_committed',
      null,
      NOW + 100,
    );

  assert.equal(failed.accepted, true);
  assert.equal(
    failed.reason,
    'attempts_exhausted',
  );
  assert.equal(
    failed.state?.status,
    'dead_letter',
  );
});

test('deadline expiry prevents stale work from executing', () => {
  const queue = new GoalWorkQueue(policy);
  const work =
    item(1, {
      deadlineAtMs: NOW + 2_000,
    });

  queue.enqueue(work, NOW);

  const claim =
    queue.claimNext(
      WORKER_A,
      NOW + 2_000,
      1_000,
    );

  assert.equal(claim.reason, 'no_work');
  assert.equal(
    queue.getState(
      work.workId,
      NOW + 2_000,
    )?.status,
    'dead_letter',
  );
});

test('queue snapshot restores read-only work and recovers expired lease safely', () => {
  const original = new GoalWorkQueue(policy);
  const work = item(1);

  original.enqueue(work, NOW);
  original.claimNext(
    WORKER_A,
    NOW + 1,
    1_000,
  );

  const snapshot =
    original.snapshot(NOW + 500);

  const restored =
    new GoalWorkQueue(policy);

  const restoreResult =
    restored.restore(
      snapshot,
      NOW + 1_500,
    );

  assert.equal(
    restoreResult.accepted,
    true,
  );
  assert.equal(
    restoreResult.restoredCount,
    1,
  );
  assert.equal(
    restored.getState(
      work.workId,
      NOW + 1_500,
    )?.status,
    'queued',
  );

  assert.equal(
    restored.claimNext(
      WORKER_B,
      NOW + 2_000,
      1_000,
    ).reason,
    'no_work',
  );

  const reclaimed =
    restored.claimNext(
      WORKER_B,
      NOW + 2_500,
      1_000,
    );

  assert.equal(reclaimed.accepted, true);
  assert.equal(reclaimed.state?.attempt, 2);
});

test('restored expired side-effect lease enters reconciliation before any retry', () => {
  const original = new GoalWorkQueue(policy);
  const work =
    item(1, { sideEffect: true });

  original.enqueue(work, NOW);
  original.claimNext(
    WORKER_A,
    NOW + 1,
    1_000,
  );

  const snapshot =
    original.snapshot(NOW + 500);
  const restored =
    new GoalWorkQueue(policy);

  assert.equal(
    restored.restore(
      snapshot,
      NOW + 1_500,
    ).accepted,
    true,
  );

  assert.equal(
    restored.getState(
      work.workId,
      NOW + 1_500,
    )?.status,
    'reconciliation_required',
  );

  assert.equal(
    restored.claimNext(
      WORKER_B,
      NOW + 5_000,
      1_000,
    ).reason,
    'no_work',
  );
});

test('tampered or duplicate snapshot state fails closed and restore requires pristine queue', () => {
  const original = new GoalWorkQueue(policy);
  original.enqueue(item(1), NOW);
  const snapshot =
    original.snapshot(NOW);

  const duplicate =
    new GoalWorkQueue(policy);

  assert.equal(
    duplicate.restore(
      [snapshot[0], snapshot[0]],
      NOW,
    ).reason,
    'invalid_snapshot',
  );

  const tampered =
    new GoalWorkQueue(policy);

  assert.equal(
    tampered.restore(
      [
        {
          ...snapshot[0],
          status: 'leased',
          leaseOwnerRef: WORKER_A,
          leaseExpiresAtMs: NOW + 10_000,
          attempt: 0,
        },
      ],
      NOW,
    ).reason,
    'invalid_snapshot',
  );

  const nonPristine =
    new GoalWorkQueue(policy);
  nonPristine.enqueue(item(2), NOW);

  assert.equal(
    nonPristine.restore(
      snapshot,
      NOW,
    ).reason,
    'not_pristine',
  );
});
