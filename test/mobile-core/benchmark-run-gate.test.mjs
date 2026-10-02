import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  parseBenchmarkRunManifest,
  validateBenchmarkRunBinding,
} = loadTypeScriptModule(
  'src/core/benchmark/benchmarkRun.ts',
);

const {
  evaluateBenchmarkGate,
  validateBenchmarkGatePolicy,
} = loadTypeScriptModule(
  'src/core/benchmark/benchmarkGate.ts',
);

const SHA_A = 'a'.repeat(40);
const SHA_B = 'b'.repeat(40);

function manifest(overrides = {}) {
  return {
    protocolVersion: '1.0',
    runId: 'benchmark_run_release_0000000000000001',
    suiteId: 'benchmark_suite_release_00000000000001',
    suiteRevision: 7,
    candidateSha: SHA_A,

    harnessSha: SHA_B,
    runtimeRef: 'runtime_ref_android_release_0001',
    evaluatorRef: 'evaluator_ref_blind_v1_00000001',
    environmentFingerprintRef:
      'environment_ref_samsung_api36_0001',
    contenderRefs: [
      'benchmark_contender_mudrik_000000000000001',
      'benchmark_contender_external_0000000000001',
    ],
    caseIds: [
      'benchmark_case_reasoning_0000000000000001',
      'benchmark_case_coding_000000000000000001',
    ],
    startedAtMs: 2_000_000_000,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
    ...overrides,
  };
}

function dimensions(overrides = {}) {
  return {
    correctness: 900,
    completion: 880,
    toolReliability: 860,
    factuality: 910,
    recovery: 820,
    latencyEfficiency: 700,

    costEfficiency: 760,
    userEffortEfficiency: 900,
    ...overrides,
  };
}

function aggregate(overrides = {}) {
  return {
    contenderRef:
      'benchmark_contender_mudrik_000000000000001',
    acceptedCases: 500,
    rejectedCases: 0,
    completedCases: 480,
    failedCases: 10,
    timeoutCases: 5,
    blockedCases: 5,
    weightedScorePermille: 875,
    medianDurationMs: 1200,
    p95DurationMs: 4100,
    totalCostMicros: 250000,
    totalInterventions: 8,
    dimensionScores: dimensions(),
    ...overrides,
  };
}

const policy = {
  minimumAcceptedCases: 400,
  maximumRejectedCases: 0,
  minimumWeightedScorePermille: 800,
  maximumOverallRegressionPermille: 25,
  maximumDimensionRegressionPermille: 40,
  requireDimensions: [
    'correctness',
    'completion',
    'toolReliability',

    'factuality',
    'recovery',
  ],
};

test('run manifest binds exact candidate and harness SHAs', () => {
  const parsed = parseBenchmarkRunManifest(manifest());
  assert.ok(parsed);

  assert.deepEqual(
    validateBenchmarkRunBinding(parsed, SHA_A, SHA_B),
    {
      accepted: true,
      reason: 'bound',
    },
  );

  assert.equal(
    validateBenchmarkRunBinding(
      parsed,
      'c'.repeat(40),
      SHA_B,
    ).reason,
    'candidate_sha_mismatch',
  );
});

test('run manifest rejects duplicate cases and authority fields', () => {
  assert.equal(
    parseBenchmarkRunManifest(
      manifest({
        caseIds: [
          'benchmark_case_reasoning_0000000000000001',
          'benchmark_case_reasoning_0000000000000001',
        ],
      }),
    ),

    null,
  );

  assert.equal(
    parseBenchmarkRunManifest(
      manifest({
        grantsApprovalAuthority: true,
      }),
    ),
    null,
  );
});

test('gate accepts healthy candidate with bounded regression', () => {
  assert.equal(
    validateBenchmarkGatePolicy(policy),
    true,
  );

  const current = aggregate();
  const baseline = aggregate({
    weightedScorePermille: 880,
    dimensionScores: dimensions({
      recovery: 840,
    }),
  });

  const result =
    evaluateBenchmarkGate(current, baseline, policy);

  assert.equal(result.accepted, true);
  assert.equal(result.overallDeltaPermille, -5);
  assert.equal(
    result.dimensionDeltaPermille.recovery,
    -20,
  );
});

test('gate blocks meaningful quality and coverage regression', () => {
  const current = aggregate({

    acceptedCases: 350,
    rejectedCases: 2,
    weightedScorePermille: 760,
    dimensionScores: dimensions({
      correctness: 810,
      toolReliability: null,
    }),
  });

  const baseline = aggregate({
    weightedScorePermille: 900,
    dimensionScores: dimensions({
      correctness: 900,
      toolReliability: 900,
    }),
  });

  const result =
    evaluateBenchmarkGate(current, baseline, policy);

  assert.equal(result.accepted, false);
  assert.ok(
    result.reasons.includes('insufficient_case_coverage'),
  );
  assert.ok(
    result.reasons.includes('too_many_rejected_cases'),
  );
  assert.ok(
    result.reasons.includes('minimum_quality_not_met'),
  );
  assert.ok(
    result.reasons.includes(
      'required_dimension_missing:toolReliability',
    ),
  );
  assert.ok(
    result.reasons.includes(
      'dimension_regression:correctness',
    ),

  );
  assert.ok(
    result.reasons.includes('overall_regression'),
  );
});

test('invalid gate policy fails closed', () => {
  const invalid = {
    ...policy,
    requireDimensions: [
      'correctness',
      'correctness',
    ],
  };

  assert.equal(
    validateBenchmarkGatePolicy(invalid),
    false,
  );

  const result =
    evaluateBenchmarkGate(
      aggregate(),
      null,
      invalid,
    );

  assert.equal(result.accepted, false);
  assert.deepEqual(
    result.reasons,
    ['invalid_gate_policy'],
  );
});
