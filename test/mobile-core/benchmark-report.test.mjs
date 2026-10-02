import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  parseBenchmarkCase,
  parseBenchmarkObservation,
} = loadTypeScriptModule(
  'src/core/benchmark/benchmarkArena.ts',
);

const {
  parseBenchmarkRunManifest,
} = loadTypeScriptModule(
  'src/core/benchmark/benchmarkRun.ts',
);

const {
  buildBenchmarkReport,
} = loadTypeScriptModule(
  'src/core/benchmark/benchmarkReport.ts',
);

const CASE_ID =
  'benchmark_case_reasoning_0000000000000001';
const SUITE_ID =
  'benchmark_suite_release_00000000000001';
const CONTENDER =
  'benchmark_contender_mudrik_000000000000001';

function benchmarkCase(overrides = {}) {
  return {
    protocolVersion: '1.0',
    suiteId: SUITE_ID,

    caseId: CASE_ID,
    category: 'reasoning',
    service: 'general',
    languageTag: 'en',
    difficulty: 3,
    promptRef: 'prompt_ref_release_000000000000001',
    dimensions: [
      'correctness',
      'completion',
      'factuality',
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

function manifest(overrides = {}) {
  return {
    protocolVersion: '1.0',
    runId: 'benchmark_run_release_0000000000000001',
    suiteId: SUITE_ID,
    suiteRevision: 1,
    candidateSha: 'a'.repeat(40),
    harnessSha: 'b'.repeat(40),
    runtimeRef: 'runtime_ref_release_000000000001',

    evaluatorRef: 'evaluator_ref_release_0000000001',
    environmentFingerprintRef:
      'environment_ref_release_0000000001',
    contenderRefs: [CONTENDER],
    caseIds: [CASE_ID],
    startedAtMs: 2_000_000_000,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
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
    startedAtMs: 2_000_000_100,
    completedAtMs: 2_000_001_100,
    scores: {
      correctness: 900,
      completion: 950,
      toolReliability: null,
      factuality: 920,
      recovery: null,
      latencyEfficiency: null,
      costEfficiency: null,
      userEffortEfficiency: null,
    },

    externalTruthVerified: true,
    costMicros: 1200,
    interventionCount: 0,
    errorCode: null,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
    ...overrides,
  };
}

test('report binds exact case and contender inventories', () => {
  const parsedManifest =
    parseBenchmarkRunManifest(manifest());
  const parsedCase =
    parseBenchmarkCase(benchmarkCase());
  const parsedObservation =
    parseBenchmarkObservation(observation());

  assert.ok(parsedManifest);
  assert.ok(parsedCase);
  assert.ok(parsedObservation);

  const report = buildBenchmarkReport(
    parsedManifest,
    [parsedCase],
    [parsedObservation],
  );

  assert.equal(report.accepted, true);
  assert.equal(report.value?.caseCount, 1);
  assert.equal(report.value?.contenderCount, 1);
  assert.equal(
    report.value?.contenders[0]?.completedCases,
    1,
  );
});

test('report rejects wrong suite and unknown contender observations', () => {
  const parsedManifest =
    parseBenchmarkRunManifest(manifest());
  const wrongSuite =
    parseBenchmarkCase(
      benchmarkCase({
        suiteId:
          'benchmark_suite_other_000000000000001',
      }),
    );
  const unknownObservation =
    parseBenchmarkObservation(
      observation({
        contenderRef:
          'benchmark_contender_other_00000000000001',
      }),
    );

  assert.ok(parsedManifest);
  assert.ok(wrongSuite);
  assert.ok(unknownObservation);

  assert.equal(
    buildBenchmarkReport(
      parsedManifest,
      [wrongSuite],
      [],
    ).reason,
    'suite_binding_mismatch',
  );

  const parsedCase =
    parseBenchmarkCase(benchmarkCase());
  assert.ok(parsedCase);

  assert.equal(
    buildBenchmarkReport(
      parsedManifest,
      [parsedCase],
      [unknownObservation],
    ).reason,
    'observation_binding_mismatch',
  );
});
