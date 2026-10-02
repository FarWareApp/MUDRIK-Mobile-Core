import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  GoalWorkQueue,
} = loadTypeScriptModule(
  'src/core/agent/goalWorkQueue.ts',
);

const {
  attestGoalWorkQueueSnapshot,
  parseGoalWorkQueueSnapshot,
  verifyGoalWorkQueueSnapshotEnvelope,
} = loadTypeScriptModule(
  'src/core/agent/goalWorkQueueIntegrity.ts',
);

const NOW = 4_900_000_000;
const QUEUE_REF =
  'goal_queue_primary_1111111111111111';

const policy = {
  maxQueueItems: 100,
  minimumLeaseMs: 1_000,
  maximumLeaseMs: 60_000,
  retryBaseDelayMs: 1_000,
  retryMaxDelayMs: 8_000,
};

function item() {
  return {
    protocolVersion: '1.0',
    workId:
      'goal_work_1111111111111111',
    goalId:
      'goal_1111111111111111',
    planId:
      'goal_plan_1111111111111111',
    stepId:
      'goal_step_1111111111111111',
    operationRef:
      'operation_ref_1111111111111111',
    priority: 500,
    sideEffect: false,
    idempotencyKey:
      'idempotency_ref_1111111111111111',
    notBeforeMs: NOW,
    deadlineAtMs: NOW + 120_000,
    maxAttempts: 3,
    createdAtMs: NOW,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  };
}

function snapshot(
  states,
  overrides = {},
) {
  return {
    protocolVersion: '1.0',
    snapshotId:
      'goal_work_snapshot_1111111111111111',
    queueRef: QUEUE_REF,
    sequence: 1,
    previousSnapshotId: null,
    states,
    createdAtMs: NOW + 100,
    ...overrides,
  };
}

const digestProvider = {
  async sha256Utf8(value) {
    return createHash('sha256')
      .update(value, 'utf8')
      .digest('hex');
  },
};

const signer = {
  keyRef:
    'device_key_ref_workqueue_11111111111',
  async signDigest(digest) {
    return digest;
  },
};

const verifier = {
  async verifyDigest(
    keyRef,
    digest,
    signature,
  ) {
    return (
      keyRef === signer.keyRef
      && signature === digest
    );
  },
};

function queueSnapshotStates() {
  const queue =
    new GoalWorkQueue(policy);
  queue.enqueue(item(), NOW);
  queue.claimNext(
    'worker_ref_1111111111111111',
    NOW + 10,
    10_000,
  );
  return queue.snapshot(NOW + 100);
}

test('queue snapshot is signed verified and safely restorable', async () => {
  const states =
    queueSnapshotStates();
  const raw =
    snapshot(states);

  assert.ok(
    parseGoalWorkQueueSnapshot(raw),
  );

  const attested =
    await attestGoalWorkQueueSnapshot(
      raw,
      'integrity_entry_1111111111111111',
      null,
      digestProvider,
      signer,
    );

  assert.equal(attested.accepted, true);
  assert.ok(attested.envelope);
  assert.ok(attested.anchor);

  const verified =
    await verifyGoalWorkQueueSnapshotEnvelope(
      attested.envelope,
      NOW + 200,
      attested.anchor,
      digestProvider,
      verifier,
    );

  assert.equal(verified.accepted, true);
  assert.equal(verified.reason, 'verified');
  assert.ok(verified.snapshot);

  const restored =
    new GoalWorkQueue(policy);

  const restoreResult =
    restored.restore(
      verified.snapshot.states,
      NOW + 200,
    );

  assert.equal(restoreResult.accepted, true);
  assert.equal(
    restored.snapshot(
      NOW + 200,
    ).length,
    1,
  );
});

test('snapshot payload tampering is rejected by digest binding', async () => {
  const attested =
    await attestGoalWorkQueueSnapshot(
      snapshot(
        queueSnapshotStates(),
      ),
      'integrity_entry_1111111111111111',
      null,
      digestProvider,
      signer,
    );

  assert.ok(attested.envelope);
  assert.ok(attested.anchor);

  const tampered = {
    ...attested.envelope,
    snapshot: {
      ...attested.envelope.snapshot,
      states:
        attested.envelope.snapshot.states
          .map((state) => ({
            ...state,
            item: {
              ...state.item,
              priority: 999,
            },
          })),
    },
  };

  const result =
    await verifyGoalWorkQueueSnapshotEnvelope(
      tampered,
      NOW + 200,
      attested.anchor,
      digestProvider,
      verifier,
    );

  assert.equal(result.accepted, false);
  assert.equal(
    result.reason,
    'payload_digest_mismatch',
  );
});

test('forged signature and substituted anchor fail closed', async () => {
  const attested =
    await attestGoalWorkQueueSnapshot(
      snapshot(
        queueSnapshotStates(),
      ),
      'integrity_entry_1111111111111111',
      null,
      digestProvider,
      signer,
    );

  assert.ok(attested.envelope);
  assert.ok(attested.anchor);

  const forged = {
    ...attested.envelope,
    ledgerEntry: {
      ...attested.envelope.ledgerEntry,
      signature: 'f'.repeat(64),
    },
  };

  const forgedResult =
    await verifyGoalWorkQueueSnapshotEnvelope(
      forged,
      NOW + 200,
      attested.anchor,
      digestProvider,
      verifier,
    );

  assert.equal(
    forgedResult.accepted,
    false,
  );
  assert.equal(
    forgedResult.reason,
    'integrity_invalid',
  );

  const wrongAnchor = {
    ...attested.anchor,
    chainDigest: 'e'.repeat(64),
  };

  const anchorResult =
    await verifyGoalWorkQueueSnapshotEnvelope(
      attested.envelope,
      NOW + 200,
      wrongAnchor,
      digestProvider,
      verifier,
    );

  assert.equal(
    anchorResult.accepted,
    false,
  );
  assert.equal(
    anchorResult.reason,
    'anchor_mismatch',
  );
});

test('snapshot chain requires exact previous anchor after first sequence', async () => {
  const first =
    await attestGoalWorkQueueSnapshot(
      snapshot(
        queueSnapshotStates(),
      ),
      'integrity_entry_1111111111111111',
      null,
      digestProvider,
      signer,
    );

  assert.ok(first.anchor);

  const secondRaw =
    snapshot(
      queueSnapshotStates(),
      {
        snapshotId:
          'goal_work_snapshot_2222222222222222',
        sequence: 2,
        previousSnapshotId:
          'goal_work_snapshot_1111111111111111',
        createdAtMs: NOW + 200,
      },
    );

  const withoutPrevious =
    await attestGoalWorkQueueSnapshot(
      secondRaw,
      'integrity_entry_2222222222222222',
      null,
      digestProvider,
      signer,
    );

  assert.equal(
    withoutPrevious.accepted,
    false,
  );
  assert.equal(
    withoutPrevious.reason,
    'ledger_creation_failed',
  );

  const chained =
    await attestGoalWorkQueueSnapshot(
      secondRaw,
      'integrity_entry_2222222222222222',
      first.anchor,
      digestProvider,
      signer,
    );

  assert.equal(chained.accepted, true);
  assert.equal(
    chained.envelope?.ledgerEntry.previousDigest,
    first.anchor.chainDigest,
  );

  const substitutedPrevious =
    await attestGoalWorkQueueSnapshot(
      {
        ...secondRaw,
        previousSnapshotId:
          'goal_work_snapshot_3333333333333333',
      },
      'integrity_entry_3333333333333333',
      first.anchor,
      digestProvider,
      signer,
    );

  assert.equal(
    substitutedPrevious.accepted,
    false,
  );
  assert.equal(
    substitutedPrevious.reason,
    'ledger_creation_failed',
  );
});

test('invalid duplicate state snapshot is rejected before signing', async () => {
  const states =
    queueSnapshotStates();

  const invalid =
    snapshot(
      [states[0], states[0]],
    );

  assert.equal(
    parseGoalWorkQueueSnapshot(invalid),
    null,
  );

  const attested =
    await attestGoalWorkQueueSnapshot(
      invalid,
      'integrity_entry_1111111111111111',
      null,
      digestProvider,
      signer,
    );

  assert.equal(attested.accepted, false);
  assert.equal(
    attested.reason,
    'snapshot_invalid',
  );
});
