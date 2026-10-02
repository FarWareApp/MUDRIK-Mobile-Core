import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  validateRuntimeIntegrityManifest,
  evaluateRuntimeIntegrity,
} = loadTypeScriptModule(
  'src/core/security/runtimeIntegrityAttestation.ts',
);

const NOW = 2_000_000_000;
const SHA_A = 'a'.repeat(64);
const SHA_B = 'b'.repeat(64);

function manifest(overrides = {}) {
  return {
    protocolVersion: '1.0',
    manifestId:
      'runtime_manifest_release_0000000000000001',
    candidateSha: 'c'.repeat(64),
    buildRef: 'build_ref_release_000000000001',
    generation: 7,
    issuedAtMs: NOW - 10_000,
    expiresAtMs: NOW + 60_000,
    artifacts: [
      {
        artifactRef:
          'artifact_ref_brain_000000000000001',
        class: 'brain',
        expectedSha256: SHA_A,
        critical: true,
      },
      {
        artifactRef:
          'artifact_ref_optional_00000000001',
        class: 'configuration',
        expectedSha256: SHA_B,
        critical: false,
      },
    ],
    ...overrides,
  };
}

function measurements(overrides = {}) {
  return [
    {
      artifactRef:
        'artifact_ref_brain_000000000000001',
      observedSha256: SHA_A,
      observedAtMs: NOW - 100,
    },
    {
      artifactRef:
        'artifact_ref_optional_00000000001',
      observedSha256: SHA_B,
      observedAtMs: NOW - 100,
    },
    ...overrides.extra ?? [],
  ];
}

test('valid runtime manifest and exact measurements are trusted', () => {
  const value = manifest();
  assert.equal(
    validateRuntimeIntegrityManifest(value),
    true,
  );

  assert.deepEqual(
    evaluateRuntimeIntegrity(
      value,
      measurements(),
      NOW,
      6,
    ),
    {
      accepted: true,
      reason: 'trusted',
      mismatchedArtifactRef: null,
      enterRestrictedMode: false,
    },
  );
});

test('critical digest mismatch forces restricted mode', () => {
  const result =
    evaluateRuntimeIntegrity(
      manifest(),
      [
        {
          artifactRef:
            'artifact_ref_brain_000000000000001',
          observedSha256: 'd'.repeat(64),
          observedAtMs: NOW - 100,
        },
      ],
      NOW,
      7,
    );

  assert.equal(result.accepted, false);
  assert.equal(result.reason, 'digest_mismatch');
  assert.equal(result.enterRestrictedMode, true);
});

test('optional artifact mismatch is reported without forcing restricted mode', () => {
  const result =
    evaluateRuntimeIntegrity(
      manifest(),
      [
        {
          artifactRef:
            'artifact_ref_brain_000000000000001',
          observedSha256: SHA_A,
          observedAtMs: NOW - 100,
        },
        {
          artifactRef:
            'artifact_ref_optional_00000000001',
          observedSha256: 'e'.repeat(64),
          observedAtMs: NOW - 100,
        },
      ],
      NOW,
      7,
    );

  assert.equal(result.accepted, false);
  assert.equal(result.reason, 'digest_mismatch');
  assert.equal(result.enterRestrictedMode, false);
});

test('missing critical artifact and generation rollback fail closed', () => {
  assert.equal(
    evaluateRuntimeIntegrity(
      manifest(),
      [],
      NOW,
      7,
    ).reason,
    'artifact_missing',
  );

  assert.equal(
    evaluateRuntimeIntegrity(
      manifest({ generation: 5 }),
      measurements(),
      NOW,
      6,
    ).reason,
    'generation_rollback',
  );
});

test('stale future and unexpected measurements are rejected', () => {
  assert.equal(
    evaluateRuntimeIntegrity(
      manifest(),
      [
        {
          artifactRef:
            'artifact_ref_brain_000000000000001',
          observedSha256: SHA_A,
          observedAtMs: NOW - 400_000,
        },
      ],
      NOW,
      7,
      300_000,
    ).reason,
    'measurement_stale',
  );

  assert.equal(
    evaluateRuntimeIntegrity(
      manifest(),
      [
        {
          artifactRef:
            'artifact_ref_brain_000000000000001',
          observedSha256: SHA_A,
          observedAtMs: NOW + 1,
        },
      ],
      NOW,
      7,
    ).reason,
    'measurement_future',
  );

  assert.equal(
    evaluateRuntimeIntegrity(
      manifest(),
      [
        {
          artifactRef:
            'artifact_ref_unknown_0000000000001',
          observedSha256: SHA_A,
          observedAtMs: NOW,
        },
      ],
      NOW,
      7,
    ).reason,
    'artifact_unexpected',
  );
});
