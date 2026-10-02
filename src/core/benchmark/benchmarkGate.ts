import {
  BENCHMARK_DIMENSIONS,
  type BenchmarkDimension,
} from './benchmarkArena';

import {
  type BenchmarkAggregate,
} from './benchmarkScore';

export type BenchmarkGatePolicy =
  Readonly<{
    minimumAcceptedCases: number;
    maximumRejectedCases: number;
    minimumWeightedScorePermille: number;
    maximumOverallRegressionPermille: number;
    maximumDimensionRegressionPermille: number;
    requireDimensions: readonly BenchmarkDimension[];
  }>;

export type BenchmarkGateResult =
  Readonly<{
    accepted: boolean;
    reasons: readonly string[];
    overallDeltaPermille: number | null;
    dimensionDeltaPermille:
      Readonly<Record<BenchmarkDimension, number | null>>;
  }>;

const DIMENSION_SET =
  new Set<BenchmarkDimension>(BENCHMARK_DIMENSIONS);

function boundedInteger(
  value: number,
  minimum: number,
  maximum: number,
): boolean {
  return (
    Number.isSafeInteger(value)
    && value >= minimum
    && value <= maximum
  );
}

export function validateBenchmarkGatePolicy(
  policy: BenchmarkGatePolicy,
): boolean {
  if (
    !boundedInteger(policy.minimumAcceptedCases, 1, 100_000)
    || !boundedInteger(policy.maximumRejectedCases, 0, 100_000)
    || !boundedInteger(
      policy.minimumWeightedScorePermille,
      0,
      1000,
    )
    || !boundedInteger(
      policy.maximumOverallRegressionPermille,
      0,
      1000,
    )
    || !boundedInteger(
      policy.maximumDimensionRegressionPermille,
      0,
      1000,
    )
  ) {
    return false;
  }

  if (
    policy.requireDimensions.length < 1
    || policy.requireDimensions.length > BENCHMARK_DIMENSIONS.length
  ) {
    return false;
  }

  const seen = new Set<BenchmarkDimension>();
  for (const dimension of policy.requireDimensions) {
    if (
      !DIMENSION_SET.has(dimension)
      || seen.has(dimension)
    ) {
      return false;
    }
    seen.add(dimension);
  }

  return true;
}

function delta(
  current: number | null,
  baseline: number | null,
): number | null {
  if (current === null || baseline === null) {
    return null;
  }
  return current - baseline;
}

export function evaluateBenchmarkGate(
  current: BenchmarkAggregate,
  baseline: BenchmarkAggregate | null,
  policy: BenchmarkGatePolicy,
): BenchmarkGateResult {

  if (!validateBenchmarkGatePolicy(policy)) {
    return Object.freeze({
      accepted: false,
      reasons: Object.freeze(['invalid_gate_policy']),
      overallDeltaPermille: null,
      dimensionDeltaPermille:
        Object.freeze(
          Object.fromEntries(
            BENCHMARK_DIMENSIONS.map(
              (dimension) => [dimension, null],
            ),
          ) as Record<BenchmarkDimension, number | null>,
        ),
    });
  }

  const reasons: string[] = [];

  if (current.acceptedCases < policy.minimumAcceptedCases) {
    reasons.push('insufficient_case_coverage');
  }
  if (current.rejectedCases > policy.maximumRejectedCases) {
    reasons.push('too_many_rejected_cases');
  }
  if (
    current.weightedScorePermille
    < policy.minimumWeightedScorePermille
  ) {
    reasons.push('minimum_quality_not_met');
  }

  const dimensionDeltaPermille = {} as Record<
    BenchmarkDimension,
    number | null
  >;

  for (const dimension of BENCHMARK_DIMENSIONS) {
    const currentValue =
      current.dimensionScores[dimension];
    const baselineValue =
      baseline?.dimensionScores[dimension] ?? null;

    dimensionDeltaPermille[dimension] =
      delta(currentValue, baselineValue);
  }

  for (const dimension of policy.requireDimensions) {
    const currentValue =
      current.dimensionScores[dimension];

    if (currentValue === null) {
      reasons.push(
        'required_dimension_missing:' + dimension,
      );
      continue;
    }

    if (baseline) {
      const change =
        dimensionDeltaPermille[dimension];

      if (
        change !== null
        && change
          < -policy.maximumDimensionRegressionPermille
      ) {
        reasons.push(
          'dimension_regression:' + dimension,
        );
      }
    }
  }

  const overallDeltaPermille =
    baseline
      ? current.weightedScorePermille
        - baseline.weightedScorePermille
      : null;

  if (
    overallDeltaPermille !== null
    && overallDeltaPermille
      < -policy.maximumOverallRegressionPermille
  ) {
    reasons.push('overall_regression');
  }

  return Object.freeze({
    accepted: reasons.length === 0,
    reasons: Object.freeze(reasons),
    overallDeltaPermille,
    dimensionDeltaPermille:
      Object.freeze(dimensionDeltaPermille),
  });
}

export const DEFAULT_BENCHMARK_GATE_POLICY =
  Object.freeze({
    minimumAcceptedCases: 100,
    maximumRejectedCases: 0,
    minimumWeightedScorePermille: 780,
    maximumOverallRegressionPermille: 20,
    maximumDimensionRegressionPermille: 35,
    requireDimensions: Object.freeze([
      'correctness',
      'completion',
      'toolReliability',
      'factuality',
      'recovery',
    ] as BenchmarkDimension[]),
  } satisfies BenchmarkGatePolicy);
