import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  parseGoalRollbackRegistration,
  GoalRollbackRegistry,
} = loadTypeScriptModule(
  'src/core/agent/goalRollback.ts',
);

const NOW = 2_000_000_000;

function registration(overrides = {}) {
  return {
    protocolVersion: '1.0',
    rollbackId: 'goal_rollback_1111111111111111',
    goalId: 'goal_1111111111111111',
    planId: 'goal_plan_1111111111111111',
    stepId: 'goal_step_1111111111111111',
    sourceLeaseId:
      'goal_lease_1111111111111111',
    rollbackRef:
      'rollback_ref_1111111111111111',
    generation: 2,
    registeredAtMs: NOW - 1000,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
    ...overrides,
  };
}

test('rollback registration is strict and authority-free', () => {
  assert.ok(
    parseGoalRollbackRegistration(
      registration(),
    ),
  );

  assert.equal(
    parseGoalRollbackRegistration({
      ...registration(),
      grantsCapabilityAuthority: true,
    }),
    null,
  );
});

test('armed rollback does not block successful finalize', () => {
  const registry = new GoalRollbackRegistry();

  const added =
    registry.register(
      registration(),
      NOW,
    );

  assert.equal(added.accepted, true);
  assert.equal(
    added.state?.status,
    'armed',
  );
  assert.equal(
    registry.canFinalize(),
    true,
  );
});

test('required rollback blocks finalize until evidence-backed resolution', () => {
  const registry = new GoalRollbackRegistry();

  registry.register(
    registration(),
    NOW,
  );

  const required =
    registry.require(
      registration().rollbackId,
      'downstream_step_failed',
      NOW + 1,
    );

  assert.equal(required.accepted, true);
  assert.equal(
    required.state?.status,
    'required',
  );
  assert.equal(
    registry.canFinalize(),
    false,
  );

  const started =
    registry.start(
      registration().rollbackId,
      1,
      NOW + 2,
    );

  assert.equal(started.accepted, true);
  assert.equal(
    started.state?.status,
    'executing',
  );

  const succeeded =
    registry.succeed(
      registration().rollbackId,
      1,
      'rollback_evidence_11111111111111',
      NOW + 3,
    );

  assert.equal(succeeded.accepted, true);
  assert.equal(
    succeeded.state?.status,
    'resolved',
  );
  assert.equal(
    registry.canFinalize(),
    true,
  );
});

test('failed rollback remains blocking and can retry with monotonic attempt', () => {
  const registry = new GoalRollbackRegistry();

  registry.register(registration(), NOW);
  registry.require(
    registration().rollbackId,
    'verification_failed',
    NOW + 1,
  );
  registry.start(
    registration().rollbackId,
    1,
    NOW + 2,
  );

  const failed =
    registry.fail(
      registration().rollbackId,
      1,
      'rollback_tool_timeout',
      NOW + 3,
    );

  assert.equal(
    failed.state?.status,
    'failed',
  );
  assert.equal(
    registry.canFinalize(),
    false,
  );

  assert.equal(
    registry.start(
      registration().rollbackId,
      1,
      NOW + 4,
    ).reason,
    'attempt_mismatch',
  );

  assert.equal(
    registry.start(
      registration().rollbackId,
      2,
      NOW + 4,
    ).accepted,
    true,
  );
});

test('one execution lease cannot arm two rollback identities', () => {
  const registry = new GoalRollbackRegistry();

  assert.equal(
    registry.register(
      registration(),
      NOW,
    ).accepted,
    true,
  );

  const conflict =
    registry.register(
      registration({
        rollbackId:
          'goal_rollback_2222222222222222',
      }),
      NOW,
    );

  assert.equal(
    conflict.accepted,
    false,
  );
  assert.equal(
    conflict.reason,
    'duplicate_conflict',
  );
});
