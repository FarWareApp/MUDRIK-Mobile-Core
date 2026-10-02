import {
  exactObject,
  isSafePublicReference,
  safeInteger,
} from '../intelligence/intelligenceSecurity';

const BODY =
  '[a-z0-9][a-z0-9_-]{15,127}';

const RUN_ID =
  new RegExp('^benchmark_run_' + BODY + '$');

const SUITE_ID =
  new RegExp('^benchmark_suite_' + BODY + '$');

const CASE_ID =
  new RegExp('^benchmark_case_' + BODY + '$');

const CONTENDER_REF =
  new RegExp('^benchmark_contender_' + BODY + '$');

const COMMIT_SHA =
  /^[0-9a-f]{40}$/;

export type BenchmarkRunManifest =
  Readonly<{
    protocolVersion: '1.0';
    runId: string;
    suiteId: string;
    suiteRevision: number;

    candidateSha: string;
    harnessSha: string;
    runtimeRef: string;
    evaluatorRef: string;
    environmentFingerprintRef: string;
    contenderRefs: readonly string[];
    caseIds: readonly string[];
    startedAtMs: number;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

const KEYS =
  new Set([
    'protocolVersion',
    'runId',
    'suiteId',
    'suiteRevision',
    'candidateSha',
    'harnessSha',
    'runtimeRef',
    'evaluatorRef',
    'environmentFingerprintRef',
    'contenderRefs',
    'caseIds',
    'startedAtMs',
    'grantsExecutionAuthority',
    'grantsSensorAuthority',

    'grantsApprovalAuthority',
    'grantsCapabilityAuthority',
  ]);

function parseUniqueRefs(
  value: unknown,
  pattern: RegExp,
  maxItems: number,
): readonly string[] | null {
  if (
    !Array.isArray(value)
    || value.length < 1
    || value.length > maxItems
  ) {
    return null;
  }

  const output: string[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    if (
      typeof item !== 'string'
      || !pattern.test(item)
      || seen.has(item)
    ) {
      return null;
    }

    seen.add(item);

    output.push(item);
  }

  return Object.freeze(output);
}

export function parseBenchmarkRunManifest(
  input: unknown,
): BenchmarkRunManifest | null {
  const record = exactObject(input, KEYS);

  if (
    !record
    || record.protocolVersion !== '1.0'
    || typeof record.runId !== 'string'
    || !RUN_ID.test(record.runId)
    || typeof record.suiteId !== 'string'
    || !SUITE_ID.test(record.suiteId)
    || !safeInteger(record.suiteRevision)
    || Number(record.suiteRevision) < 1
    || Number(record.suiteRevision) > 1_000_000
    || typeof record.candidateSha !== 'string'
    || !COMMIT_SHA.test(record.candidateSha)
    || typeof record.harnessSha !== 'string'
    || !COMMIT_SHA.test(record.harnessSha)
    || !isSafePublicReference(record.runtimeRef, 240)
    || !isSafePublicReference(record.evaluatorRef, 240)

    || !isSafePublicReference(
      record.environmentFingerprintRef,
      240,
    )
    || !safeInteger(record.startedAtMs)
    || record.grantsExecutionAuthority !== false
    || record.grantsSensorAuthority !== false
    || record.grantsApprovalAuthority !== false
    || record.grantsCapabilityAuthority !== false
  ) {
    return null;
  }

  const contenderRefs =
    parseUniqueRefs(
      record.contenderRefs,
      CONTENDER_REF,
      16,
    );
  const caseIds =
    parseUniqueRefs(
      record.caseIds,
      CASE_ID,
      10_000,
    );

  if (!contenderRefs || !caseIds) {
    return null;
  }

  return Object.freeze({
    protocolVersion: '1.0',

    runId: record.runId as string,
    suiteId: record.suiteId as string,
    suiteRevision: record.suiteRevision as number,
    candidateSha: record.candidateSha as string,
    harnessSha: record.harnessSha as string,
    runtimeRef: record.runtimeRef as string,
    evaluatorRef: record.evaluatorRef as string,
    environmentFingerprintRef:
      record.environmentFingerprintRef as string,
    contenderRefs,
    caseIds,
    startedAtMs: record.startedAtMs as number,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}

export type BenchmarkRunBinding =
  Readonly<{
    accepted: boolean;
    reason:
      | 'bound'
      | 'candidate_sha_mismatch'
      | 'harness_sha_mismatch';
  }>;

export function validateBenchmarkRunBinding(

  manifest: BenchmarkRunManifest,
  expectedCandidateSha: string,
  expectedHarnessSha: string,
): BenchmarkRunBinding {
  if (manifest.candidateSha !== expectedCandidateSha) {
    return Object.freeze({
      accepted: false,
      reason: 'candidate_sha_mismatch',
    });
  }

  if (manifest.harnessSha !== expectedHarnessSha) {
    return Object.freeze({
      accepted: false,
      reason: 'harness_sha_mismatch',
    });
  }

  return Object.freeze({
    accepted: true,
    reason: 'bound',
  });
}
