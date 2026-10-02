import {
  LANGUAGE_TAG,
  exactObject,
  isSafePublicReference,
  safeInteger,
} from '../intelligence/intelligenceSecurity';

import {
  type IntelligenceServiceKind,
} from '../intelligence/intelligenceProvider';

const BODY =
  '[a-z0-9][a-z0-9_-]{15,127}';

const CASE_ID =
  new RegExp('^benchmark_case_' + BODY + '$');

const SUITE_ID =
  new RegExp('^benchmark_suite_' + BODY + '$');

const CONTENDER_REF =
  new RegExp('^benchmark_contender_' + BODY + '$');

export const BENCHMARK_CATEGORIES =
  Object.freeze([
    'reasoning',
    'coding',
    'debugging',
    'research',
    'tool-use',
    'computer-use',
    'vision',
    'voice',
    'memory',
    'multilingual',
    'recovery',
  ] as const);

export type BenchmarkCategory =
  typeof BENCHMARK_CATEGORIES[number];

export const BENCHMARK_DIMENSIONS =
  Object.freeze([
    'correctness',
    'completion',
    'toolReliability',
    'factuality',
    'recovery',
    'latencyEfficiency',
    'costEfficiency',
    'userEffortEfficiency',
  ] as const);

export type BenchmarkDimension =
  typeof BENCHMARK_DIMENSIONS[number];

export type BenchmarkCase =
  Readonly<{
    protocolVersion: '1.0';
    suiteId: string;
    caseId: string;
    category: BenchmarkCategory;
    service: IntelligenceServiceKind;
    languageTag: string;
    difficulty: number;
    promptRef: string;
    dimensions: readonly BenchmarkDimension[];
    weight: number;
    maxDurationMs: number;
    requiresTools: boolean;
    requiresExternalTruth: boolean;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

export type BenchmarkStatus =
  | 'completed'
  | 'failed'
  | 'timeout'
  | 'blocked';

export type BenchmarkScoreVector =
  Readonly<Record<BenchmarkDimension, number | null>>;

export type BenchmarkObservation =
  Readonly<{
    protocolVersion: '1.0';
    caseId: string;
    contenderRef: string;
    attempt: number;
    status: BenchmarkStatus;
    startedAtMs: number;
    completedAtMs: number;
    scores: BenchmarkScoreVector;
    externalTruthVerified: boolean;
    costMicros: number | null;
    interventionCount: number;
    errorCode: string | null;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

const CATEGORY_SET =
  new Set<BenchmarkCategory>(BENCHMARK_CATEGORIES);
const DIMENSION_SET =
  new Set<BenchmarkDimension>(BENCHMARK_DIMENSIONS);
const SERVICE_SET =
  new Set<IntelligenceServiceKind>([
    'general', 'coding', 'vision', 'stt', 'tts',
  ]);

const CASE_KEYS =
  new Set([
    'protocolVersion',
    'suiteId',
    'caseId',
    'category',
    'service',
    'languageTag',
    'difficulty',
    'promptRef',
    'dimensions',
    'weight',
    'maxDurationMs',
    'requiresTools',
    'requiresExternalTruth',
    'grantsExecutionAuthority',
    'grantsSensorAuthority',
    'grantsApprovalAuthority',
    'grantsCapabilityAuthority',
  ]);

const OBSERVATION_KEYS =
  new Set([
    'protocolVersion',
    'caseId',
    'contenderRef',
    'attempt',
    'status',
    'startedAtMs',
    'completedAtMs',
    'scores',
    'externalTruthVerified',
    'costMicros',
    'interventionCount',
    'errorCode',
    'grantsExecutionAuthority',
    'grantsSensorAuthority',
    'grantsApprovalAuthority',
    'grantsCapabilityAuthority',
  ]);

const SCORE_KEYS =
  new Set<string>(BENCHMARK_DIMENSIONS);

function parseDimensions(
  value: unknown,
): readonly BenchmarkDimension[] | null {
  if (
    !Array.isArray(value)
    || value.length < 2
    || value.length > BENCHMARK_DIMENSIONS.length
  ) {
    return null;
  }

  const output: BenchmarkDimension[] = [];
  const seen = new Set<BenchmarkDimension>();

  for (const item of value) {
    if (
      typeof item !== 'string'
      || !DIMENSION_SET.has(item as BenchmarkDimension)
      || seen.has(item as BenchmarkDimension)
    ) {
      return null;
    }
    seen.add(item as BenchmarkDimension);
    output.push(item as BenchmarkDimension);
  }

  if (
    !seen.has('correctness')
    || !seen.has('completion')
  ) {
    return null;
  }

  return Object.freeze(output);
}

export function parseBenchmarkCase(
  input: unknown,
): BenchmarkCase | null {
  const record = exactObject(input, CASE_KEYS);

  if (
    !record
    || record.protocolVersion !== '1.0'
    || typeof record.suiteId !== 'string'
    || !SUITE_ID.test(record.suiteId)
    || typeof record.caseId !== 'string'
    || !CASE_ID.test(record.caseId)
    || typeof record.category !== 'string'
    || !CATEGORY_SET.has(record.category as BenchmarkCategory)
    || typeof record.service !== 'string'
    || !SERVICE_SET.has(record.service as IntelligenceServiceKind)
    || typeof record.languageTag !== 'string'
    || !LANGUAGE_TAG.test(record.languageTag)
    || !safeInteger(record.difficulty)
    || Number(record.difficulty) < 1
    || Number(record.difficulty) > 5
    || !isSafePublicReference(record.promptRef, 240)
    || !safeInteger(record.weight)
    || Number(record.weight) < 1
    || Number(record.weight) > 100
    || !safeInteger(record.maxDurationMs)
    || Number(record.maxDurationMs) < 100
    || Number(record.maxDurationMs) > 3_600_000
    || typeof record.requiresTools !== 'boolean'
    || typeof record.requiresExternalTruth !== 'boolean'
  ) {
    return null;
  }

  if (
    record.grantsExecutionAuthority !== false
    || record.grantsSensorAuthority !== false
    || record.grantsApprovalAuthority !== false
    || record.grantsCapabilityAuthority !== false
  ) {
    return null;
  }

  const dimensions = parseDimensions(record.dimensions);
  if (!dimensions) {
    return null;
  }

  return Object.freeze({
    protocolVersion: '1.0',
    suiteId: record.suiteId as string,
    caseId: record.caseId as string,
    category: record.category as BenchmarkCategory,
    service: record.service as IntelligenceServiceKind,
    languageTag: (record.languageTag as string).toLowerCase(),
    difficulty: record.difficulty as number,
    promptRef: record.promptRef as string,
    dimensions,
    weight: record.weight as number,
    maxDurationMs: record.maxDurationMs as number,
    requiresTools: record.requiresTools as boolean,
    requiresExternalTruth: record.requiresExternalTruth as boolean,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}

function parseScoreVector(
  input: unknown,
): BenchmarkScoreVector | null {
  const record = exactObject(input, SCORE_KEYS);
  if (!record) {
    return null;
  }

  const output = {} as Record<
    BenchmarkDimension,
    number | null
  >;

  for (const dimension of BENCHMARK_DIMENSIONS) {
    const value = record[dimension];
    if (
      value !== null
      && (
        !safeInteger(value)
        || Number(value) > 1000
      )
    ) {
      return null;
    }
    output[dimension] =
      value === null ? null : Number(value);
  }

  return Object.freeze(output);
}

export function parseBenchmarkObservation(
  input: unknown,
): BenchmarkObservation | null {
  const record = exactObject(input, OBSERVATION_KEYS);

  const statuses =
    new Set<BenchmarkStatus>([
      'completed',
      'failed',
      'timeout',
      'blocked',
    ]);

  if (
    !record
    || record.protocolVersion !== '1.0'
    || typeof record.caseId !== 'string'
    || !CASE_ID.test(record.caseId)
    || typeof record.contenderRef !== 'string'
    || !CONTENDER_REF.test(record.contenderRef)
    || !safeInteger(record.attempt)
    || Number(record.attempt) < 1
    || Number(record.attempt) > 20
    || typeof record.status !== 'string'
    || !statuses.has(record.status as BenchmarkStatus)
    || !safeInteger(record.startedAtMs)
    || !safeInteger(record.completedAtMs)
    || Number(record.completedAtMs) < Number(record.startedAtMs)
    || typeof record.externalTruthVerified !== 'boolean'
    || !safeInteger(record.interventionCount)
    || Number(record.interventionCount) > 100
  ) {
    return null;
  }

  if (
    record.costMicros !== null
    && (
      !safeInteger(record.costMicros)
      || Number(record.costMicros) > 1_000_000_000_000
    )
  ) {
    return null;
  }

  if (
    record.errorCode !== null
    && !isSafePublicReference(record.errorCode, 120)
  ) {
    return null;
  }

  if (
    record.grantsExecutionAuthority !== false
    || record.grantsSensorAuthority !== false
    || record.grantsApprovalAuthority !== false
    || record.grantsCapabilityAuthority !== false
  ) {
    return null;
  }

  const scores = parseScoreVector(record.scores);
  if (!scores) {
    return null;
  }

  return Object.freeze({
    protocolVersion: '1.0',
    caseId: record.caseId as string,
    contenderRef: record.contenderRef as string,

    attempt: record.attempt as number,
    status: record.status as BenchmarkStatus,
    startedAtMs: record.startedAtMs as number,
    completedAtMs: record.completedAtMs as number,
    scores,
    externalTruthVerified:
      record.externalTruthVerified as boolean,
    costMicros: record.costMicros as number | null,
    interventionCount:
      record.interventionCount as number,
    errorCode: record.errorCode as string | null,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}

export type BenchmarkCaseValidation =
  Readonly<{
    accepted: boolean;
    reason:
      | 'valid'
      | 'case_mismatch'
      | 'dimension_mismatch'
      | 'external_truth_missing'
      | 'duration_exceeded'
      | 'failure_scored_as_success';
  }>;

export function validateObservationAgainstCase(
  benchmarkCase: BenchmarkCase,
  observation: BenchmarkObservation,
): BenchmarkCaseValidation {

  if (benchmarkCase.caseId !== observation.caseId) {
    return Object.freeze({
      accepted: false,
      reason: 'case_mismatch',
    });
  }

  const applicable =
    new Set(benchmarkCase.dimensions);

  for (const dimension of BENCHMARK_DIMENSIONS) {
    const value = observation.scores[dimension];
    if (
      applicable.has(dimension)
        ? value === null
        : value !== null
    ) {
      return Object.freeze({
        accepted: false,
        reason: 'dimension_mismatch',
      });
    }
  }

  if (
    benchmarkCase.requiresExternalTruth
    && !observation.externalTruthVerified
  ) {
    return Object.freeze({
      accepted: false,
      reason: 'external_truth_missing',
    });
  }

  const duration =
    observation.completedAtMs - observation.startedAtMs;

  if (duration > benchmarkCase.maxDurationMs) {
    return Object.freeze({
      accepted: false,
      reason: 'duration_exceeded',
    });
  }

  if (
    observation.status !== 'completed'
    && (
      (observation.scores.correctness ?? 0) > 0
      || (observation.scores.completion ?? 0) > 0
    )
  ) {
    return Object.freeze({
      accepted: false,
      reason: 'failure_scored_as_success',
    });
  }

  return Object.freeze({
    accepted: true,
    reason: 'valid',
  });
}

export const DEFAULT_BENCHMARK_WEIGHTS =
  Object.freeze({
    correctness: 280,
    completion: 220,
    toolReliability: 140,
    factuality: 140,
    recovery: 80,
    latencyEfficiency: 50,
    costEfficiency: 40,
    userEffortEfficiency: 50,
  } satisfies Readonly<Record<BenchmarkDimension, number>>);
