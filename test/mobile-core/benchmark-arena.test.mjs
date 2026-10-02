import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  parseBenchmarkCase,
  parseBenchmarkObservation,
  validateObservationAgainstCase,
} = loadTypeScriptModule(
  'src/core/benchmark/benchmarkArena.ts',
);

const {
  aggregateBenchmarkResults,
} = loadTypeScriptModule(
  'src/core/benchmark/benchmarkScore.ts',
);

const CASE_ID =
  'benchmark_case_reasoning_0000000000000001';
const SUITE_ID =
  'benchmark_suite_competition_00000000000001';
const CONTENDER =
  'benchmark_contender_mudrik_000000000000001';

function benchmarkCase(overrides = {}) {
  return {
    protocolVersion: '1.0',
    suiteId: SUITE_ID,

    caseId: CASE_ID,
    category: 'reasoning',
    service: 'general',
    languageTag: 'ar',
    difficulty: 4,
    promptRef: 'prompt_ref_reasoning_0000000000001',
    dimensions: [
      'correctness',
      'completion',
      'factuality',
      'userEffortEfficiency',
    ],
    weight: 10,
    maxDurationMs: 30_000,
    requiresTools: false,
    requiresExternalTruth: true,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
    ...overrides,
  };
}

function scoreVector(overrides = {}) {
  return {
    correctness: 900,
    completion: 1000,
    toolReliability: null,

    factuality: 950,
    recovery: null,
    latencyEfficiency: null,
    costEfficiency: null,
    userEffortEfficiency: 1000,
    ...overrides,
  };
}

function observation(overrides = {}) {
  return {
    protocolVersion: '1.0',
    caseId: CASE_ID,
    contenderRef: CONTENDER,
    attempt: 1,
    status: 'completed',
    startedAtMs: 1_000_000,
    completedAtMs: 1_004_000,
    scores: scoreVector(),
    externalTruthVerified: true,
    costMicros: 2500,
    interventionCount: 0,
    errorCode: null,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
    ...overrides,
  };
}

test('benchmark case is strict, bounded and authority-free', () => {
  const parsed = parseBenchmarkCase(benchmarkCase());
  assert.ok(parsed);
  assert.equal(parsed.languageTag, 'ar');
  assert.equal(parsed.grantsExecutionAuthority, false);

  assert.equal(
    parseBenchmarkCase({
      ...benchmarkCase(),
      grantsExecutionAuthority: true,
    }),
    null,
  );
});

test('benchmark dimensions always include correctness and completion', () => {
  assert.equal(
    parseBenchmarkCase(
      benchmarkCase({
        dimensions: ['correctness', 'factuality'],
      }),
    ),
    null,
  );

  assert.equal(
    parseBenchmarkCase(
      benchmarkCase({
        dimensions: [
          'correctness',
          'completion',
          'completion',
        ],
      }),
    ),
    null,
  );
});

test('observation rejects hidden fields and invalid scores', () => {
  assert.equal(
    parseBenchmarkObservation({
      ...observation(),
      hiddenApproval: true,
    }),
    null,
  );

  assert.equal(
    parseBenchmarkObservation({
      ...observation(),
      scores: scoreVector({ factuality: 1001 }),
    }),
    null,
  );
});

test('case validation requires exact dimensions and external truth', () => {
  const parsedCase = parseBenchmarkCase(benchmarkCase());
  const parsedObservation =
    parseBenchmarkObservation(observation());

  assert.ok(parsedCase);
  assert.ok(parsedObservation);
  assert.deepEqual(
    validateObservationAgainstCase(
      parsedCase,
      parsedObservation,
    ),
    {
      accepted: true,
      reason: 'valid',
    },
  );

  const missingTruth =
    parseBenchmarkObservation(
      observation({
        externalTruthVerified: false,
      }),
    );

  assert.ok(missingTruth);
  assert.equal(
    validateObservationAgainstCase(
      parsedCase,
      missingTruth,
    ).reason,
    'external_truth_missing',
  );

  const extraDimension =
    parseBenchmarkObservation(
      observation({
        scores: scoreVector({
          latencyEfficiency: 800,
        }),
      }),
    );

  assert.ok(extraDimension);
  assert.equal(
    validateObservationAgainstCase(
      parsedCase,
      extraDimension,
    ).reason,
    'dimension_mismatch',
  );
});

test('failed observations cannot retain positive success scores', () => {
  const parsedCase = parseBenchmarkCase(benchmarkCase());
  const failed = parseBenchmarkObservation(
    observation({
      status: 'failed',
      errorCode: 'benchmark_failure_model_error',
    }),
  );

  assert.ok(parsedCase);
  assert.ok(failed);

  assert.equal(
    validateObservationAgainstCase(
      parsedCase,
      failed,
    ).reason,
    'failure_scored_as_success',
  );
});

test('aggregation is weighted, duplicate-safe and reports raw burden', () => {
  const parsedCase = parseBenchmarkCase(benchmarkCase());
  const first = parseBenchmarkObservation(observation());
  const duplicate = parseBenchmarkObservation(observation());
  const failed = parseBenchmarkObservation(
    observation({
      attempt: 2,
      status: 'failed',
      completedAtMs: 1_005_000,
      scores: scoreVector({
        correctness: 0,
        completion: 0,
        factuality: 0,
        userEffortEfficiency: 0,
      }),
      externalTruthVerified: true,
      costMicros: 500,
      interventionCount: 2,
      errorCode: 'benchmark_failure_timeout_guard',
    }),
  );

  assert.ok(parsedCase);
  assert.ok(first);
  assert.ok(duplicate);
  assert.ok(failed);

  const summary = aggregateBenchmarkResults(
    [parsedCase],
    [first, duplicate, failed],
    CONTENDER,
  );

  assert.equal(summary.acceptedCases, 2);
  assert.equal(summary.rejectedCases, 1);
  assert.equal(summary.completedCases, 1);
  assert.equal(summary.failedCases, 1);
  assert.equal(summary.totalCostMicros, 3000);
  assert.equal(summary.totalInterventions, 2);
  assert.equal(summary.medianDurationMs, 4000);
  assert.equal(summary.p95DurationMs, 5000);
  assert.ok(summary.weightedScorePermille > 0);
  assert.ok(summary.weightedScorePermille < 1000);
});
