import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  GoalResourceBudgetLedger,
  validateGoalResourceBudgetPolicy,
} = loadTypeScriptModule(
  'src/core/agent/goalResourceBudget.ts',
);

const NOW = 2_000_000_000;

const policy = {
  maxModelCalls: 4,
  maxProviderCostMicros: 10_000,
  maxNetworkRequests: 8,
  maxOutputBytes: 10_000,
  maxConcurrentOperations: 2,
  maxWallTimeMs: 60_000,
};

function usage(overrides = {}) {
  return {
    modelCalls: 1,
    providerCostMicros: 1000,
    networkRequests: 1,
    outputBytes: 500,
    concurrentOperations: 1,
    ...overrides,
  };
}

test('budget policy is bounded', () => {
  assert.equal(
    validateGoalResourceBudgetPolicy(policy),
    true,
  );

  assert.equal(
    validateGoalResourceBudgetPolicy({
      ...policy,
      maxConcurrentOperations: 0,
    }),
    false,
  );
});

test('reservation prevents concurrent oversubscription', () => {
  const ledger =
    new GoalResourceBudgetLedger(
      policy,
      NOW,
    );

  assert.equal(
    ledger.reserve(
      'goal_budget_reservation_1111111111111111',
      usage({ concurrentOperations: 2 }),
      NOW,
    ).accepted,
    true,
  );

  const blocked =
    ledger.reserve(
      'goal_budget_reservation_2222222222222222',
      usage({ concurrentOperations: 1 }),
      NOW,
    );

  assert.equal(blocked.accepted, false);
  assert.equal(
    blocked.reason,
    'concurrency_budget_exhausted',
  );
});

test('commit cannot exceed reservation', () => {
  const ledger =
    new GoalResourceBudgetLedger(
      policy,
      NOW,
    );

  const id =
    'goal_budget_reservation_3333333333333333';

  ledger.reserve(
    id,
    usage({ providerCostMicros: 1500 }),
    NOW,
  );

  const denied =
    ledger.commit(
      id,
      usage({ providerCostMicros: 2000 }),
      NOW + 1,
    );

  assert.equal(denied.accepted, false);
  assert.equal(
    denied.reason,
    'actual_exceeds_reservation',
  );
});

test('commit is idempotent and releases unused reservation headroom', () => {
  const ledger =
    new GoalResourceBudgetLedger(
      policy,
      NOW,
    );

  const id =
    'goal_budget_reservation_4444444444444444';

  ledger.reserve(
    id,
    usage({
      providerCostMicros: 3000,
      outputBytes: 2000,
    }),
    NOW,
  );

  const actual =
    usage({
      providerCostMicros: 1200,
      outputBytes: 700,
    });

  assert.equal(
    ledger.commit(
      id,
      actual,
      NOW + 1,
    ).accepted,
    true,
  );

  assert.deepEqual(
    ledger.getCommittedUsage(),
    actual,
  );

  const duplicate =
    ledger.commit(
      id,
      actual,
      NOW + 2,
    );

  assert.equal(duplicate.accepted, true);
  assert.equal(duplicate.idempotent, true);
  assert.deepEqual(
    ledger.getReservedUsage(),
    {
      modelCalls: 0,
      providerCostMicros: 0,
      networkRequests: 0,
      outputBytes: 0,
      concurrentOperations: 0,
    },
  );
});

test('cost and wall-time budgets fail closed', () => {
  const ledger =
    new GoalResourceBudgetLedger(
      policy,
      NOW,
    );

  const costly =
    ledger.reserve(
      'goal_budget_reservation_5555555555555555',
      usage({
        providerCostMicros: 10_001,
      }),
      NOW,
    );

  assert.equal(
    costly.reason,
    'cost_budget_exhausted',
  );

  const late =
    ledger.reserve(
      'goal_budget_reservation_6666666666666666',
      usage(),
      NOW + 60_001,
    );

  assert.equal(
    late.reason,
    'wall_time_exhausted',
  );
  assert.equal(
    ledger.canContinue(NOW + 60_001),
    false,
  );
});

test('release returns reservation capacity without spending it', () => {
  const ledger =
    new GoalResourceBudgetLedger(
      policy,
      NOW,
    );

  const id =
    'goal_budget_reservation_7777777777777777';

  ledger.reserve(
    id,
    usage({ concurrentOperations: 2 }),
    NOW,
  );

  assert.equal(
    ledger.release(id).accepted,
    true,
  );

  assert.equal(
    ledger.getCommittedUsage().modelCalls,
    0,
  );

  assert.equal(
    ledger.reserve(
      'goal_budget_reservation_8888888888888888',
      usage({ concurrentOperations: 2 }),
      NOW + 1,
    ).accepted,
    true,
  );
});
