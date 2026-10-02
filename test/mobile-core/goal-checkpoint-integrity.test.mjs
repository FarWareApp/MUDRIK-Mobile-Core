import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  GoalExecutionKernel,
} = loadTypeScriptModule(
  'src/core/agent/goalExecutionKernel.ts',
);

const {
  attestGoalExecutionCheckpoint,
  verifyGoalExecutionCheckpointEnvelope,
} = loadTypeScriptModule(
  'src/core/agent/goalCheckpointIntegrity.ts',
);

const NOW = 3_800_000_000;
const GOAL =
  'goal_1111111111111111';
const PLAN =
  'goal_plan_1111111111111111';
const REQUEST =
  'brain_request_1111111111111111';

function goal() {
  return {
    protocolVersion: '1.0',
    goalId: GOAL,
    sourceRequestId: REQUEST,
    workspaceId:
      'workspace_1111111111111111',
    intent: 'diagnose',
    risk: 'low',
    verification: 'none',
    sideEffectPolicy: 'read-only',
    maxSteps: 4,
    maxRepairCycles: 1,
    maxToolAttempts: 2,
    createdAtMs: NOW,
    deadlineAtMs: NOW + 300_000,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  };
}

const S1 =
  'goal_step_1111111111111111';
const S2 =
  'goal_step_2222222222222222';

function step(
  stepId,
  ordinal,
  kind,
  dependsOn = [],
) {
  return {
    stepId,
    ordinal,
    kind,
    operationRef:
      'operation_ref_' + stepId.slice(-16),
    dependsOn,
    requiredCapabilities: [],
    sideEffect: false,
    requiresApproval: false,
    rollbackRef: null,
    verificationRef: null,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  };
}

function plan() {
  return {
    protocolVersion: '1.0',
    planId: PLAN,
    goalId: GOAL,
    sourceRequestId: REQUEST,
    generatedAtMs: NOW + 10,
    steps: [
      step(S1, 1, 'reason'),
      step(S2, 2, 'finalize', [S1]),
    ],
    providerIndependent: true,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  };
}

function ids() {
  let value = 0;

  const next = (prefix) => {
    value += 1;
    return prefix
      + String(value).repeat(16);
  };

  return {
    nextLeaseId() {
      return next('goal_lease_');
    },
    nextRollbackId() {
      return next('goal_rollback_');
    },
    nextReservationId() {
      return next(
        'goal_budget_reservation_',
      );
    },
  };
}

function kernel() {
  return new GoalExecutionKernel(
    goal(),
    plan(),
    [],
    'subject_checkpoint_integrity',
    {},
    null,
    {
      leaseTtlMs: 30_000,
      allowIrreversibleSideEffects: false,
      resourceBudget: {
        maxModelCalls: 4,
        maxProviderCostMicros: 50_000,
        maxNetworkRequests: 8,
        maxOutputBytes: 50_000,
        maxConcurrentOperations: 2,
        maxWallTimeMs: 300_000,
      },
    },
    ids(),
  );
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
    'device_key_ref_checkpoint_1111111111',
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

function createCheckpoint() {
  const runtime = kernel();
  runtime.start(NOW + 20);

  const created =
    runtime.createCheckpoint(
      'goal_checkpoint_1111111111111111',
      NOW + 200_000,
      NOW + 30,
    );

  assert.ok(created.checkpoint);
  return created.checkpoint;
}

test('checkpoint envelope is signed and independently verifiable', async () => {
  const checkpoint =
    createCheckpoint();

  const attested =
    await attestGoalExecutionCheckpoint(
      checkpoint,
      goal(),
      plan(),
      NOW + 30,
      'integrity_entry_1111111111111111',
      null,
      digestProvider,
      signer,
    );

  assert.equal(attested.accepted, true);
  assert.ok(attested.envelope);
  assert.ok(attested.anchor);

  const verified =
    await verifyGoalExecutionCheckpointEnvelope(
      attested.envelope,
      goal(),
      plan(),
      NOW + 40,
      attested.anchor,
      digestProvider,
      verifier,
    );

  assert.equal(verified.accepted, true);
  assert.equal(verified.reason, 'verified');
  assert.equal(
    verified.checkpoint?.checkpointId,
    checkpoint.checkpointId,
  );
});

test('checkpoint payload tampering fails digest binding', async () => {
  const checkpoint =
    createCheckpoint();

  const attested =
    await attestGoalExecutionCheckpoint(
      checkpoint,
      goal(),
      plan(),
      NOW + 30,
      'integrity_entry_1111111111111111',
      null,
      digestProvider,
      signer,
    );

  assert.ok(attested.envelope);
  assert.ok(attested.anchor);

  const tampered = {
    ...attested.envelope,
    checkpoint: {
      ...attested.envelope.checkpoint,
      replanGeneration:
        attested.envelope.checkpoint
          .replanGeneration + 1,
    },
  };

  const result =
    await verifyGoalExecutionCheckpointEnvelope(
      tampered,
      goal(),
      plan(),
      NOW + 40,
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
  const checkpoint =
    createCheckpoint();

  const attested =
    await attestGoalExecutionCheckpoint(
      checkpoint,
      goal(),
      plan(),
      NOW + 30,
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
    await verifyGoalExecutionCheckpointEnvelope(
      forged,
      goal(),
      plan(),
      NOW + 40,
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
    await verifyGoalExecutionCheckpointEnvelope(
      attested.envelope,
      goal(),
      plan(),
      NOW + 40,
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

test('second checkpoint ledger entry must chain from a previous digest', async () => {
  const runtime = kernel();
  runtime.start(NOW + 20);

  const first =
    runtime.createCheckpoint(
      'goal_checkpoint_1111111111111111',
      NOW + 200_000,
      NOW + 30,
    );
  assert.ok(first.checkpoint);

  const firstAttested =
    await attestGoalExecutionCheckpoint(
      first.checkpoint,
      goal(),
      plan(),
      NOW + 30,
      'integrity_entry_1111111111111111',
      null,
      digestProvider,
      signer,
    );
  assert.ok(firstAttested.envelope);

  const second =
    runtime.createCheckpoint(
      'goal_checkpoint_2222222222222222',
      NOW + 210_000,
      NOW + 50,
    );
  assert.ok(second.checkpoint);

  const missingPrevious =
    await attestGoalExecutionCheckpoint(
      second.checkpoint,
      goal(),
      plan(),
      NOW + 50,
      'integrity_entry_2222222222222222',
      null,
      digestProvider,
      signer,
    );

  assert.equal(
    missingPrevious.accepted,
    false,
  );

  const chained =
    await attestGoalExecutionCheckpoint(
      second.checkpoint,
      goal(),
      plan(),
      NOW + 50,
      'integrity_entry_2222222222222222',
      firstAttested.anchor,
      digestProvider,
      signer,
    );

  assert.equal(chained.accepted, true);

  const wrongPreviousId = {
    ...second.checkpoint,
    previousCheckpointId:
      'goal_checkpoint_9999999999999999',
  };

  const substituted =
    await attestGoalExecutionCheckpoint(
      wrongPreviousId,
      goal(),
      plan(),
      NOW + 50,
      'integrity_entry_3333333333333333',
      firstAttested.anchor,
      digestProvider,
      signer,
    );

  assert.equal(
    substituted.accepted,
    false,
  );
  assert.equal(
    substituted.reason,
    'ledger_creation_failed',
  );
  assert.equal(
    chained.envelope?.ledgerEntry
      .previousDigest,
    firstAttested.envelope.ledgerEntry
      .chainDigest,
  );
});
