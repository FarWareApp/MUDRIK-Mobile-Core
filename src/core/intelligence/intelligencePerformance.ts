import {
  INTELLIGENCE_MODEL_REF,
  INTELLIGENCE_PROVIDER_REF,
  exactObject,
  safeInteger,
} from './intelligenceSecurity';

import {
  INTELLIGENCE_SERVICE_KINDS,
  type IntelligenceServiceKind,
} from './intelligenceProvider';

const BODY =
  '[a-z0-9][a-z0-9_-]{15,127}';

const SAMPLE_ID =
  new RegExp(
    '^intelligence_sample_' + BODY + '$',
  );

export type IntelligencePerformanceObservation =
  Readonly<{
    protocolVersion: '1.0';
    sampleId: string;
    providerRef: string;
    modelRef: string;
    service: IntelligenceServiceKind;
    succeeded: boolean;
    qualityScore: number | null;
    firstResultMs: number | null;
    costMicrosPer1kUnits: number | null;
    observedAtMs: number;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

export type IntelligencePerformancePolicy =
  Readonly<{
    ewmaAlphaPermille: number;
    maximumSamples: number;
    maximumObservationAgeMs: number;
  }>;

export type IntelligencePerformanceProfile =
  Readonly<{
    providerRef: string;
    modelRef: string;
    service: IntelligenceServiceKind;
    sampleCount: number;
    successRatePermille: number;
    failureRatePermille: number;
    qualityScore: number | null;
    firstResultMs: number | null;
    costMicrosPer1kUnits: number | null;
    lastObservedAtMs: number;
  }>;

const KEYS =
  new Set([
    'protocolVersion',
    'sampleId',
    'providerRef',
    'modelRef',
    'service',
    'succeeded',
    'qualityScore',
    'firstResultMs',
    'costMicrosPer1kUnits',
    'observedAtMs',
    'grantsExecutionAuthority',
    'grantsSensorAuthority',
    'grantsApprovalAuthority',
    'grantsCapabilityAuthority',
  ]);

function score(
  value: unknown,
): value is number {
  return (
    safeInteger(value)
    && Number(value) <= 1000
  );
}

export function parseIntelligencePerformanceObservation(
  input: unknown,
): IntelligencePerformanceObservation | null {
  const record = exactObject(input, KEYS);

  if (
    !record
    || record.protocolVersion !== '1.0'
    || typeof record.sampleId !== 'string'
    || !SAMPLE_ID.test(record.sampleId)
    || typeof record.providerRef !== 'string'
    || !INTELLIGENCE_PROVIDER_REF.test(
      record.providerRef,
    )
    || typeof record.modelRef !== 'string'
    || !INTELLIGENCE_MODEL_REF.test(
      record.modelRef,
    )
    || typeof record.service !== 'string'
    || !(INTELLIGENCE_SERVICE_KINDS as readonly string[])
      .includes(record.service)
    || typeof record.succeeded !== 'boolean'
    || (
      record.qualityScore !== null
      && !score(record.qualityScore)
    )
    || (
      record.firstResultMs !== null
      && (
        !safeInteger(record.firstResultMs)
        || Number(record.firstResultMs)
          > 3_600_000
      )
    )
    || (
      record.costMicrosPer1kUnits !== null
      && (
        !safeInteger(
          record.costMicrosPer1kUnits,
        )
        || Number(
          record.costMicrosPer1kUnits,
        ) > 1_000_000_000_000
      )
    )
    || !safeInteger(record.observedAtMs)
    || record.grantsExecutionAuthority !== false
    || record.grantsSensorAuthority !== false
    || record.grantsApprovalAuthority !== false
    || record.grantsCapabilityAuthority !== false
  ) {
    return null;
  }

  if (
    !record.succeeded
    && record.qualityScore !== null
  ) {
    return null;
  }

  return Object.freeze({
    protocolVersion: '1.0',
    sampleId: record.sampleId as string,
    providerRef: record.providerRef as string,
    modelRef: record.modelRef as string,
    service:
      record.service as IntelligenceServiceKind,
    succeeded: record.succeeded as boolean,
    qualityScore:
      record.qualityScore as number | null,
    firstResultMs:
      record.firstResultMs as number | null,
    costMicrosPer1kUnits:
      record.costMicrosPer1kUnits as
        number | null,
    observedAtMs:
      record.observedAtMs as number,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}

export function validateIntelligencePerformancePolicy(
  policy: IntelligencePerformancePolicy,
): boolean {
  return (
    safeInteger(policy.ewmaAlphaPermille)
    && policy.ewmaAlphaPermille >= 1
    && policy.ewmaAlphaPermille <= 1000
    && safeInteger(policy.maximumSamples)
    && policy.maximumSamples >= 1
    && policy.maximumSamples <= 100_000
    && safeInteger(policy.maximumObservationAgeMs)
    && policy.maximumObservationAgeMs >= 1_000
    && policy.maximumObservationAgeMs
      <= 365 * 24 * 60 * 60 * 1000
  );
}

function profileKey(
  providerRef: string,
  modelRef: string,
  service: IntelligenceServiceKind,
): string {
  return [
    providerRef,
    modelRef,
    service,
  ].join(':');
}

function ewma(
  previous: number | null,
  next: number,
  alphaPermille: number,
): number {
  if (previous === null) {
    return next;
  }

  return Math.round(
    (
      next * alphaPermille
      + previous * (1000 - alphaPermille)
    ) / 1000,
  );
}

type MutableProfile = {
  providerRef: string;
  modelRef: string;
  service: IntelligenceServiceKind;
  sampleCount: number;
  failureRatePermille: number;
  qualityScore: number | null;
  firstResultMs: number | null;
  costMicrosPer1kUnits: number | null;
  lastObservedAtMs: number;
};

export class IntelligencePerformanceLedger {
  private readonly profiles =
    new Map<string, MutableProfile>();

  private readonly sampleIds =
    new Set<string>();

  constructor(
    private readonly policy:
      IntelligencePerformancePolicy,
  ) {
    if (
      !validateIntelligencePerformancePolicy(
        policy,
      )
    ) {
      throw new TypeError(
        'Invalid intelligence performance policy.',
      );
    }
  }

  record(
    input: unknown,
    trustedNowMs: number,
  ): boolean {
    const observation =
      parseIntelligencePerformanceObservation(
        input,
      );

    if (
      !observation
      || !safeInteger(trustedNowMs)
      || observation.observedAtMs
        > trustedNowMs
      || trustedNowMs
        - observation.observedAtMs
        > this.policy.maximumObservationAgeMs
      || this.sampleIds.has(
        observation.sampleId,
      )
      || this.sampleIds.size
        >= this.policy.maximumSamples
    ) {
      return false;
    }

    const key =
      profileKey(
        observation.providerRef,
        observation.modelRef,
        observation.service,
      );
    const current =
      this.profiles.get(key);
    const alpha =
      this.policy.ewmaAlphaPermille;
    const failureSample =
      observation.succeeded ? 0 : 1000;

    if (
      current
      && observation.observedAtMs
        < current.lastObservedAtMs
    ) {
      return false;
    }

    if (!current) {
      this.profiles.set(
        key,
        {
          providerRef:
            observation.providerRef,
          modelRef:
            observation.modelRef,
          service:
            observation.service,
          sampleCount: 1,
          failureRatePermille:
            failureSample,
          qualityScore:
            observation.qualityScore,
          firstResultMs:
            observation.firstResultMs,
          costMicrosPer1kUnits:
            observation.costMicrosPer1kUnits,
          lastObservedAtMs:
            observation.observedAtMs,
        },
      );
    } else {
      current.sampleCount += 1;
      current.failureRatePermille =
        ewma(
          current.failureRatePermille,
          failureSample,
          alpha,
        );

      if (
        observation.qualityScore !== null
      ) {
        current.qualityScore =
          ewma(
            current.qualityScore,
            observation.qualityScore,
            alpha,
          );
      }

      if (
        observation.firstResultMs !== null
      ) {
        current.firstResultMs =
          ewma(
            current.firstResultMs,
            observation.firstResultMs,
            alpha,
          );
      }

      if (
        observation.costMicrosPer1kUnits
          !== null
      ) {
        current.costMicrosPer1kUnits =
          ewma(
            current.costMicrosPer1kUnits,
            observation.costMicrosPer1kUnits,
            alpha,
          );
      }

      current.lastObservedAtMs =
        Math.max(
          current.lastObservedAtMs,
          observation.observedAtMs,
        );
    }

    this.sampleIds.add(
      observation.sampleId,
    );
    return true;
  }

  getProfile(
    providerRef: string,
    modelRef: string,
    service: IntelligenceServiceKind,
  ): IntelligencePerformanceProfile | null {
    const value =
      this.profiles.get(
        profileKey(
          providerRef,
          modelRef,
          service,
        ),
      );

    if (!value) {
      return null;
    }

    return Object.freeze({
      providerRef: value.providerRef,
      modelRef: value.modelRef,
      service: value.service,
      sampleCount: value.sampleCount,
      successRatePermille:
        1000 - value.failureRatePermille,
      failureRatePermille:
        value.failureRatePermille,
      qualityScore: value.qualityScore,
      firstResultMs: value.firstResultMs,
      costMicrosPer1kUnits:
        value.costMicrosPer1kUnits,
      lastObservedAtMs:
        value.lastObservedAtMs,
    });
  }

  getProfiles():
    readonly IntelligencePerformanceProfile[] {
    return Object.freeze(
      [...this.profiles.values()]
        .map((value) =>
          Object.freeze({
            providerRef:
              value.providerRef,
            modelRef:
              value.modelRef,
            service:
              value.service,
            sampleCount:
              value.sampleCount,
            successRatePermille:
              1000 - value.failureRatePermille,
            failureRatePermille:
              value.failureRatePermille,
            qualityScore:
              value.qualityScore,
            firstResultMs:
              value.firstResultMs,
            costMicrosPer1kUnits:
              value.costMicrosPer1kUnits,
            lastObservedAtMs:
              value.lastObservedAtMs,
          }),
        )
        .sort(
          (left, right) =>
            left.providerRef.localeCompare(
              right.providerRef,
            )
            || left.modelRef.localeCompare(
              right.modelRef,
            )
            || left.service.localeCompare(
              right.service,
            ),
        ),
    );
  }
}

export const DEFAULT_INTELLIGENCE_PERFORMANCE_POLICY =
  Object.freeze({
    ewmaAlphaPermille: 250,
    maximumSamples: 50_000,
    maximumObservationAgeMs:
      30 * 24 * 60 * 60 * 1000,
  } satisfies IntelligencePerformancePolicy);
