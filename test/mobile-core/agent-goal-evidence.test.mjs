import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  parseGoalEvidenceEvent,
  GoalEvidenceRegistry,
} = loadTypeScriptModule(
  'src/core/agent/goalEvidence.ts',
);

const GOAL =
  'goal_1111111111111111';
const PLAN =
  'goal_plan_1111111111111111';
const STEP =
  'goal_step_1111111111111111';
const NOW = 2_300_000_000;

function event(
  sequence,
  kind,
  overrides = {},
) {
  const suffix =
    String(sequence + 1).padStart(16, '0');

  return {
    protocolVersion: '1.0',
    eventId: 'goal_event_' + suffix,
    goalId: GOAL,
    planId: PLAN,
    stepId: [
      'execution_started',
      'finalized',
      'blocked',
      'cancelled',
    ].includes(kind)
      ? null
      : STEP,
    kind,
    sequence,
    previousEventId:
      sequence === 0
        ? null
        : 'goal_event_'
          + String(sequence)
            .padStart(16, '0'),
    evidenceRef: [
      'step_succeeded',
      'repair_completed',
      'verification_passed',
      'finalized',
    ].includes(kind)
      ? 'evidence_ref_' + suffix
      : null,
    reasonCode: [
      'step_failed',
      'verification_failed',
      'blocked',
    ].includes(kind)
      ? 'execution_failure'
      : null,
    observedAtMs: NOW + sequence,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
    ...overrides,
  };
}

test('goal evidence parser enforces semantic fields and authority isolation', () => {
  assert.ok(
    parseGoalEvidenceEvent(
      event(0, 'execution_started'),
    ),
  );

  assert.ok(
    parseGoalEvidenceEvent(
      event(1, 'step_succeeded'),
    ),
  );

  assert.equal(
    parseGoalEvidenceEvent(
      event(1, 'step_succeeded', {
        evidenceRef: null,
      }),
    ),
    null,
  );

  assert.equal(
    parseGoalEvidenceEvent(
      event(1, 'step_failed', {
        reasonCode: null,
      }),
    ),
    null,
  );

  assert.equal(
    parseGoalEvidenceEvent(
      event(0, 'execution_started', {
        grantsApprovalAuthority: true,
      }),
    ),
    null,
  );
});

test('evidence registry enforces sequence chain and idempotence', () => {
  const registry =
    new GoalEvidenceRegistry(
      GOAL,
      PLAN,
    );

  const first =
    event(0, 'execution_started');

  assert.equal(
    registry.accept(first).reason,
    'accepted',
  );

  assert.equal(
    registry.accept(first).reason,
    'idempotent',
  );

  assert.equal(
    registry.accept(
      event(2, 'step_succeeded'),
    ).reason,
    'sequence_gap',
  );

  assert.equal(
    registry.accept(
      event(1, 'step_started', {
        previousEventId:
          'goal_event_9999999999999999',
      }),
    ).reason,
    'chain_mismatch',
  );

  assert.equal(
    registry.accept(
      event(1, 'step_started'),
    ).reason,
    'accepted',
  );
});

test('evidence registry rejects time rollback and sequence mutation', () => {
  const registry =
    new GoalEvidenceRegistry(
      GOAL,
      PLAN,
    );

  const first =
    event(0, 'execution_started');

  registry.accept(first);

  assert.equal(
    registry.accept({
      ...first,
      eventId:
        'goal_event_9999999999999999',
    }).reason,
    'sequence_conflict',
  );

  assert.equal(
    registry.accept(
      event(1, 'step_started', {
        observedAtMs: NOW - 1,
      }),
    ).reason,
    'time_rollback',
  );
});

test('final evidence closes the registry permanently', () => {
  const registry =
    new GoalEvidenceRegistry(
      GOAL,
      PLAN,
    );

  registry.accept(
    event(0, 'execution_started'),
  );
  registry.accept(
    event(1, 'step_started'),
  );
  registry.accept(
    event(2, 'step_succeeded'),
  );

  const finalized =
    event(3, 'finalized');

  assert.equal(
    registry.accept(finalized).accepted,
    true,
  );
  assert.equal(registry.isClosed(), true);

  assert.equal(
    registry.accept(
      event(4, 'cancelled'),
    ).reason,
    'lifecycle_closed',
  );

  assert.equal(
    registry.getEvents().length,
    4,
  );
});
