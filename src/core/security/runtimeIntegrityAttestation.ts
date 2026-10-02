const DIGEST =
  /^[a-f0-9]{64}$/;

const SAFE_REF =
  /^[A-Za-z0-9][A-Za-z0-9._:@/+\-]{2,239}$/;

const BODY =
  '[a-z0-9][a-z0-9_-]{15,127}';

const MANIFEST_ID =
  new RegExp(
    '^runtime_manifest_' + BODY + '$',
  );

export type RuntimeArtifactClass =
  | 'brain'
  | 'policy'
  | 'orchestration'
  | 'security'
  | 'storage'
  | 'adapter'
  | 'configuration';

export type RuntimeArtifactExpectation =
  Readonly<{
    artifactRef: string;
    class: RuntimeArtifactClass;
    expectedSha256: string;
    critical: boolean;
  }>;

export type RuntimeIntegrityManifest =
  Readonly<{
    protocolVersion: '1.0';
    manifestId: string;
    candidateSha: string;
    buildRef: string;
    generation: number;
    issuedAtMs: number;
    expiresAtMs: number | null;
    artifacts: readonly RuntimeArtifactExpectation[];
  }>;

export type RuntimeArtifactMeasurement =
  Readonly<{
    artifactRef: string;
    observedSha256: string;
    observedAtMs: number;
  }>;

export type RuntimeIntegrityDecision =
  Readonly<{
    accepted: boolean;
    reason:
      | 'trusted'
      | 'invalid_manifest'
      | 'invalid_measurement'
      | 'manifest_expired'
      | 'future_manifest'
      | 'artifact_missing'
      | 'artifact_unexpected'
      | 'digest_mismatch'
      | 'measurement_stale'
      | 'measurement_future'
      | 'generation_rollback';
    mismatchedArtifactRef: string | null;
    enterRestrictedMode: boolean;
  }>;

function safeInteger(
  value: unknown,
): value is number {
  return (
    Number.isSafeInteger(value)
    && Number(value) >= 0
  );
}

function validArtifact(
  artifact: RuntimeArtifactExpectation,
): boolean {
  return (
    SAFE_REF.test(artifact.artifactRef)
    && [
      'brain',
      'policy',
      'orchestration',
      'security',
      'storage',
      'adapter',
      'configuration',
    ].includes(artifact.class)
    && DIGEST.test(artifact.expectedSha256)
    && typeof artifact.critical === 'boolean'
  );
}

export function validateRuntimeIntegrityManifest(
  input: RuntimeIntegrityManifest,
): boolean {
  if (
    input.protocolVersion !== '1.0'
    || !MANIFEST_ID.test(input.manifestId)
    || !DIGEST.test(input.candidateSha)
    || !SAFE_REF.test(input.buildRef)
    || !safeInteger(input.generation)
    || !safeInteger(input.issuedAtMs)
    || (
      input.expiresAtMs !== null
      && (
        !safeInteger(input.expiresAtMs)
        || input.expiresAtMs <= input.issuedAtMs
      )
    )
    || !Array.isArray(input.artifacts)
    || input.artifacts.length < 1
    || input.artifacts.length > 1024
  ) {
    return false;
  }

  const seen = new Set<string>();
  let criticalCount = 0;

  for (const artifact of input.artifacts) {
    if (
      !validArtifact(artifact)
      || seen.has(artifact.artifactRef)
    ) {
      return false;
    }

    seen.add(artifact.artifactRef);
    criticalCount += Number(artifact.critical);
  }

  return criticalCount >= 1;
}

function decision(
  accepted: boolean,
  reason: RuntimeIntegrityDecision['reason'],
  mismatchedArtifactRef: string | null = null,
  enterRestrictedMode = !accepted,
): RuntimeIntegrityDecision {
  return Object.freeze({
    accepted,
    reason,
    mismatchedArtifactRef,
    enterRestrictedMode,
  });
}

export function evaluateRuntimeIntegrity(
  manifest: RuntimeIntegrityManifest,
  measurements: readonly RuntimeArtifactMeasurement[],
  trustedNowMs: number,
  previousGeneration: number | null,
  maxMeasurementAgeMs = 5 * 60 * 1000,
): RuntimeIntegrityDecision {
  if (
    !validateRuntimeIntegrityManifest(manifest)
    || !safeInteger(trustedNowMs)
    || !safeInteger(maxMeasurementAgeMs)
    || maxMeasurementAgeMs < 1_000
    || maxMeasurementAgeMs > 24 * 60 * 60 * 1000
    || (
      previousGeneration !== null
      && !safeInteger(previousGeneration)
    )
  ) {
    return decision(false, 'invalid_manifest');
  }

  if (
    previousGeneration !== null
    && manifest.generation < previousGeneration
  ) {
    return decision(false, 'generation_rollback');
  }

  if (manifest.issuedAtMs > trustedNowMs) {
    return decision(false, 'future_manifest');
  }

  if (
    manifest.expiresAtMs !== null
    && manifest.expiresAtMs <= trustedNowMs
  ) {
    return decision(false, 'manifest_expired');
  }

  if (
    !Array.isArray(measurements)
    || measurements.length > 2048
  ) {
    return decision(false, 'invalid_measurement');
  }

  const expected =
    new Map(
      manifest.artifacts.map(
        (artifact) => [artifact.artifactRef, artifact],
      ),
    );
  const observed =
    new Map<string, RuntimeArtifactMeasurement>();

  for (const measurement of measurements) {
    if (
      !SAFE_REF.test(measurement.artifactRef)
      || !DIGEST.test(measurement.observedSha256)
      || !safeInteger(measurement.observedAtMs)
      || observed.has(measurement.artifactRef)
    ) {
      return decision(
        false,
        'invalid_measurement',
        measurement.artifactRef ?? null,
      );
    }

    if (!expected.has(measurement.artifactRef)) {
      return decision(
        false,
        'artifact_unexpected',
        measurement.artifactRef,
      );
    }

    if (measurement.observedAtMs > trustedNowMs) {
      return decision(
        false,
        'measurement_future',
        measurement.artifactRef,
      );
    }

    if (
      trustedNowMs - measurement.observedAtMs
        > maxMeasurementAgeMs
    ) {
      return decision(
        false,
        'measurement_stale',
        measurement.artifactRef,
      );
    }

    observed.set(
      measurement.artifactRef,
      measurement,
    );
  }

  for (const artifact of manifest.artifacts) {
    const measurement =
      observed.get(artifact.artifactRef);

    if (!measurement) {
      if (artifact.critical) {
        return decision(
          false,
          'artifact_missing',
          artifact.artifactRef,
        );
      }
      continue;
    }

    if (
      measurement.observedSha256
        !== artifact.expectedSha256
    ) {
      return decision(
        false,
        'digest_mismatch',
        artifact.artifactRef,
        artifact.critical,
      );
    }
  }

  return decision(
    true,
    'trusted',
    null,
    false,
  );
}
