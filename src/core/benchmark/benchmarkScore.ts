import {
  BENCHMARK_DIMENSIONS,
  DEFAULT_BENCHMARK_WEIGHTS,
  validateObservationAgainstCase,
  type BenchmarkCase,
  type BenchmarkDimension,
  type BenchmarkObservation,
} from './benchmarkArena';

export type BenchmarkAggregate =
  Readonly<{
    contenderRef: string;
    acceptedCases: number;
    rejectedCases: number;
    completedCases: number;
    failedCases: number;
    timeoutCases: number;
    blockedCases: number;
    weightedScorePermille: number;
    medianDurationMs: number | null;
    p95DurationMs: number | null;
    totalCostMicros: number | null;
    totalInterventions: number;
    dimensionScores:
      Readonly<Record<BenchmarkDimension, number | null>>;
  }>;

function percentile(
  values: readonly number[],
  percentileValue: number,
): number | null {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.ceil(percentileValue * sorted.length) - 1,
  );
  return sorted[index] ?? null;
}

function scoreObservation(
  benchmarkCase: BenchmarkCase,
  observation: BenchmarkObservation,
): number {
  let numerator = 0;
  let denominator = 0;

  for (const dimension of benchmarkCase.dimensions) {
    const value = observation.scores[dimension];
    const weight = DEFAULT_BENCHMARK_WEIGHTS[dimension];

    if (value !== null) {
      numerator += value * weight;
      denominator += weight;
    }
  }

  if (denominator === 0) {
    return 0;
  }

  return Math.round(numerator / denominator);
}

export function aggregateBenchmarkResults(
  cases: readonly BenchmarkCase[],
  observations: readonly BenchmarkObservation[],
  contenderRef: string,
): BenchmarkAggregate {
  const caseById =
    new Map(cases.map((item) => [item.caseId, item]));
  const relevant =
    observations.filter(
      (item) => item.contenderRef === contenderRef,
    );

  const accepted: {
    benchmarkCase: BenchmarkCase;
    observation: BenchmarkObservation;
  }[] = [];
  let rejectedCases = 0;

  const seen = new Set<string>();

  for (const observation of relevant) {
    const key =
      observation.caseId + ':' + observation.attempt;
    const benchmarkCase = caseById.get(observation.caseId);

    if (
      seen.has(key)
      || !benchmarkCase
      || !validateObservationAgainstCase(
        benchmarkCase,
        observation,
      ).accepted
    ) {
      rejectedCases += 1;
      continue;
    }

    seen.add(key);
    accepted.push({
      benchmarkCase,
      observation,
    });
  }

  const durations =
    accepted.map(({ observation }) =>
      observation.completedAtMs
      - observation.startedAtMs,
    );

  const dimensionScores = {} as Record<
    BenchmarkDimension,
    number | null
  >;

  for (const dimension of BENCHMARK_DIMENSIONS) {
    let weighted = 0;
    let weight = 0;

    for (const item of accepted) {
      if (!item.benchmarkCase.dimensions.includes(dimension)) {
        continue;
      }

      const value = item.observation.scores[dimension];
      if (value === null) {
        continue;
      }

      weighted += value * item.benchmarkCase.weight;
      weight += item.benchmarkCase.weight;
    }

    dimensionScores[dimension] =
      weight === 0
        ? null
        : Math.round(weighted / weight);
  }

  let totalWeightedScore = 0;
  let totalCaseWeight = 0;

  for (const item of accepted) {
    totalWeightedScore +=
      scoreObservation(
        item.benchmarkCase,
        item.observation,
      ) * item.benchmarkCase.weight;
    totalCaseWeight += item.benchmarkCase.weight;
  }

  const costValues =
    accepted
      .map(({ observation }) => observation.costMicros)
      .filter((value): value is number => value !== null);

  const statusCount = (status: BenchmarkObservation['status']) =>
    accepted.filter(
      ({ observation }) => observation.status === status,
    ).length;

  return Object.freeze({
    contenderRef,
    acceptedCases: accepted.length,
    rejectedCases,
    completedCases: statusCount('completed'),
    failedCases: statusCount('failed'),
    timeoutCases: statusCount('timeout'),
    blockedCases: statusCount('blocked'),
    weightedScorePermille:
      totalCaseWeight === 0
        ? 0
        : Math.round(
            totalWeightedScore / totalCaseWeight,
          ),
    medianDurationMs: percentile(durations, 0.5),
    p95DurationMs: percentile(durations, 0.95),
    totalCostMicros:
      costValues.length === 0
        ? null
        : costValues.reduce((sum, value) => sum + value, 0),
    totalInterventions:
      accepted.reduce(
        (sum, item) =>
          sum + item.observation.interventionCount,
        0,
      ),
    dimensionScores: Object.freeze(dimensionScores),
  });
}
