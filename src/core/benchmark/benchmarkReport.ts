import {
  type BenchmarkCase,
  type BenchmarkObservation,
} from './benchmarkArena';

import {
  aggregateBenchmarkResults,
  type BenchmarkAggregate,
} from './benchmarkScore';

import {
  type BenchmarkRunManifest,
} from './benchmarkRun';

export type BenchmarkReport =
  Readonly<{
    protocolVersion: '1.0';
    runId: string;
    suiteId: string;
    suiteRevision: number;
    candidateSha: string;
    harnessSha: string;
    caseCount: number;
    contenderCount: number;
    contenders: readonly BenchmarkAggregate[];
  }>;

export type BenchmarkReportResult =
  Readonly<{
    accepted: boolean;
    reason:
      | 'report_built'
      | 'case_inventory_mismatch'
      | 'suite_binding_mismatch'
      | 'observation_binding_mismatch';
    value: BenchmarkReport | null;
  }>;

export function buildBenchmarkReport(
  manifest: BenchmarkRunManifest,
  cases: readonly BenchmarkCase[],
  observations: readonly BenchmarkObservation[],
): BenchmarkReportResult {
  const manifestCases = new Set(manifest.caseIds);
  const seenCases = new Set<string>();

  if (cases.length !== manifest.caseIds.length) {
    return Object.freeze({
      accepted: false,
      reason: 'case_inventory_mismatch',
      value: null,
    });
  }

  for (const benchmarkCase of cases) {
    if (
      benchmarkCase.suiteId !== manifest.suiteId
      || !manifestCases.has(benchmarkCase.caseId)
      || seenCases.has(benchmarkCase.caseId)
    ) {
      return Object.freeze({
        accepted: false,
        reason:
          benchmarkCase.suiteId !== manifest.suiteId
            ? 'suite_binding_mismatch'
            : 'case_inventory_mismatch',
        value: null,
      });
    }

    seenCases.add(benchmarkCase.caseId);
  }

  const contenderRefs =
    new Set(manifest.contenderRefs);

  for (const observation of observations) {
    if (
      !manifestCases.has(observation.caseId)
      || !contenderRefs.has(observation.contenderRef)
    ) {
      return Object.freeze({
        accepted: false,
        reason: 'observation_binding_mismatch',
        value: null,
      });
    }
  }

  const contenders =
    manifest.contenderRefs.map(
      (contenderRef) =>
        aggregateBenchmarkResults(
          cases,
          observations,
          contenderRef,
        ),
    );

  return Object.freeze({
    accepted: true,
    reason: 'report_built',
    value: Object.freeze({
      protocolVersion: '1.0',
      runId: manifest.runId,
      suiteId: manifest.suiteId,
      suiteRevision: manifest.suiteRevision,
      candidateSha: manifest.candidateSha,
      harnessSha: manifest.harnessSha,
      caseCount: cases.length,
      contenderCount: contenders.length,
      contenders: Object.freeze(contenders),
    }),
  });
}
