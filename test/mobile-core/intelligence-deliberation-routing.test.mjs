import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  decideIntelligenceDeliberationMode,
  validateIntelligenceDeliberationSignal,
  validateIntelligenceDeliberationRoutingPolicy,
} = loadTypeScriptModule(
  'src/core/intelligence/intelligenceDeliberationRouting.ts',
);

const policy = {
  complexityThreshold: 700,
  uncertaintyThreshold: 550,
  toolFailureThreshold: 1,
  reviewExternalTruth: true,
  minimumIndependentProviders: 2,
};

function signal(overrides = {}) {
  return {
    complexityScore: 300,
    uncertaintyScore: 200,
    externalTruthRequired: false,
    failedToolAttempts: 0,
    verificationRequired: false,
    eligibleIndependentProviders: 3,
    ...overrides,
  };
}

test('simple low-uncertainty work stays on one model', () => {
  assert.equal(
    validateIntelligenceDeliberationSignal(signal()),
    true,
  );
  assert.equal(
    validateIntelligenceDeliberationRoutingPolicy(policy),
    true,
  );

  assert.deepEqual(
    decideIntelligenceDeliberationMode(
      signal(),
      policy,
    ),
    {
      mode: 'single',
      reason: 'single_sufficient',
    },
  );
});

test('complexity uncertainty truth and tool failure can trigger review', () => {
  const cases = [
    [
      signal({ complexityScore: 800 }),
      'complexity',
    ],
    [
      signal({ uncertaintyScore: 700 }),
      'uncertainty',
    ],
    [
      signal({ externalTruthRequired: true }),
      'external_truth',
    ],

    [
      signal({ failedToolAttempts: 1 }),
      'tool_failure',
    ],
  ];

  for (const [input, reason] of cases) {
    assert.deepEqual(
      decideIntelligenceDeliberationMode(
        input,
        policy,
      ),
      {
        mode: 'parallel-review',
        reason,
      },
    );
  }
});

test('mandatory verification blocks if independent review is unavailable', () => {
  assert.deepEqual(
    decideIntelligenceDeliberationMode(
      signal({
        verificationRequired: true,
        eligibleIndependentProviders: 1,
      }),
      policy,
    ),
    {
      mode: 'blocked',
      reason: 'independent_review_unavailable',
    },
  );
});

test('optional review degrades to single when independent providers are unavailable', () => {
  assert.deepEqual(
    decideIntelligenceDeliberationMode(
      signal({
        complexityScore: 900,
        eligibleIndependentProviders: 1,
      }),
      policy,
    ),

    {
      mode: 'single',
      reason: 'independent_review_unavailable',
    },
  );
});

test('invalid routing metadata fails closed', () => {
  assert.deepEqual(
    decideIntelligenceDeliberationMode(
      signal({ uncertaintyScore: 1001 }),
      policy,
    ),
    {
      mode: 'blocked',
      reason: 'invalid_input',
    },
  );

  assert.equal(
    validateIntelligenceDeliberationRoutingPolicy({
      ...policy,
      minimumIndependentProviders: 0,
    }),
    false,
  );
});
