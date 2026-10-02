import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  buildIntelligenceDeliberationExecutionPlan,
} = loadTypeScriptModule(
  'src/core/intelligence/intelligenceDeliberationPlan.ts',
);

const policy = {
  complexityThreshold: 700,
  uncertaintyThreshold: 550,
  toolFailureThreshold: 1,
  reviewExternalTruth: true,
  minimumIndependentProviders: 2,
};

function candidate(
  providerRef,
  modelRef,
  rank,
) {
  return {
    providerRef,
    modelRef,
    service: 'general',
    executionMode: 'online',
    status: 'ready',
    qualityScore: 900 - rank,
    firstResultMs: 250 + rank,
    costMicrosPer1kUnits: 800 + rank,

    failureRatePermille: 5,
    rank,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  };
}

const A = candidate(
  'provider_1111111111111111',
  'model_1111111111111111',
  1,
);
const B = candidate(
  'provider_2222222222222222',
  'model_2222222222222222',
  2,
);
const C = candidate(
  'provider_3333333333333333',
  'model_3333333333333333',
  3,
);

function routePlan(overrides = {}) {
  return {
    protocolVersion: '1.0',
    planId: 'intelligence_plan_1111111111111111',
    requestId:
      'intelligence_request_1111111111111111',
    accountId: 'acct_1111111111111111',
    workspaceId: 'workspace_1111111111111111',

    policyId:
      'intelligence_policy_1111111111111111',
    policyRevision: 1,
    service: 'general',
    generatedAtMs: 2_000_000_000,
    primary: A,
    fallbacks: [B, C],
    providerIndependent: true,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
    ...overrides,
  };
}

function signal(overrides = {}) {
  return {
    complexityScore: 200,
    uncertaintyScore: 200,
    externalTruthRequired: false,
    failedToolAttempts: 0,
    verificationRequired: false,
    eligibleIndependentProviders: 0,
    ...overrides,
  };
}

test('simple work preserves route primary without extra model cost', () => {
  const result =
    buildIntelligenceDeliberationExecutionPlan(
      routePlan(),
      signal(),
      policy,
      3,
    );

  assert.equal(result.accepted, true);
  assert.equal(result.mode, 'single');
  assert.deepEqual(
    result.candidates.map((item) => item.providerRef),
    [A.providerRef],
  );
});

test('complex work fans out across ranked independent providers', () => {
  const result =
    buildIntelligenceDeliberationExecutionPlan(
      routePlan(),
      signal({ complexityScore: 900 }),
      policy,
      3,
    );

  assert.equal(result.accepted, true);
  assert.equal(result.mode, 'parallel-review');
  assert.deepEqual(
    result.candidates.map((item) => item.providerRef),
    [
      A.providerRef,
      B.providerRef,
      C.providerRef,
    ],
  );
});

test('parallel plan respects proposal budget', () => {
  const result =
    buildIntelligenceDeliberationExecutionPlan(
      routePlan(),
      signal({ externalTruthRequired: true }),
      policy,
      2,
    );

  assert.equal(result.accepted, true);
  assert.equal(result.candidates.length, 2);
});

test('mandatory verification blocks when no independent fallback exists', () => {
  const result =
    buildIntelligenceDeliberationExecutionPlan(
      routePlan({ fallbacks: [] }),
      signal({ verificationRequired: true }),
      policy,
      3,
    );

  assert.equal(result.accepted, false);
  assert.equal(result.mode, 'blocked');
  assert.equal(result.reason, 'verification_blocked');
});

test('malformed route plan fails closed', () => {
  const result =
    buildIntelligenceDeliberationExecutionPlan(
      {
        ...routePlan(),
        grantsExecutionAuthority: true,
      },
      signal({ complexityScore: 900 }),
      policy,
      3,
    );

  assert.equal(result.accepted, false);
  assert.equal(result.reason, 'invalid_input');
});
