import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  execFileSync,
  spawnSync,
} from 'node:child_process';
import test from 'node:test';

const HEAD =
  execFileSync(
    'git',
    ['rev-parse', 'HEAD'],
    { encoding: 'utf8' },
  ).trim();

function manifest(
  layer4Status = 'passed',
) {
  return {
    protocolVersion: '1.0',
    candidateSha: HEAD,
    generatedAtMs: Date.now() - 100,
    sections: Array.from(
      { length: 19 },
      (_, index) => ({
        section: index + 1,
        preDeviceComplete: true,
        layer4Status,
        unresolvedBlockerCriticalHigh: 0,
      }),
    ),
    mobileCoreValidation: 'passed',
    codeql: 'passed',
    dependencyHighCriticalGate: 'passed',
    fullHistorySecretScan: 'passed',
    physicalAndroidValidation: 'passed',
    realProviderValidation: 'passed',
    realIntegrationValidation: 'passed',
    productionLikeControlPlaneAgent: 'passed',
    independentSecurityReview: 'passed',
    privacyRegulatoryReview: 'passed',
    disasterRecoveryExercise: 'passed',
    keyRotationExercise: 'passed',
    incidentResponseExercise: 'passed',
    loadReliabilityValidation: 'passed',
    upgradeRollbackValidation: 'passed',
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  };
}

function withManifest(
  value,
  callback,
) {
  const root =
    fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        'mudrik-release-manifest-',
      ),
    );
  const file =
    path.join(
      root,
      'manifest.json',
    );

  fs.writeFileSync(
    file,
    JSON.stringify(value),
  );

  try {
    return callback(file);
  } finally {
    fs.rmSync(
      root,
      {
        recursive: true,
        force: true,
      },
    );
  }
}

function runPreflight(
  manifestPath,
) {
  const env = {
    ...process.env,
  };

  if (manifestPath === null) {
    delete env.MUDRIK_RELEASE_MANIFEST;
  } else {
    env.MUDRIK_RELEASE_MANIFEST =
      manifestPath;
  }

  return spawnSync(
    process.execPath,
    [
      'scripts/production-release-preflight.mjs',
    ],
    {
      cwd: process.cwd(),
      env,
      encoding: 'utf8',
    },
  );
}

test(
  'production preflight fails closed when Section 20 manifest is absent',
  () => {
    const result =
      runPreflight(null);

    assert.equal(
      result.status,
      1,
    );
    assert.match(
      result.stderr,
      /MUDRIK_RELEASE_MANIFEST/,
    );
  },
);

test(
  'production preflight rejects an exact-SHA manifest with deferred Layer 4',
  () => {
    withManifest(
      manifest('deferred'),
      (file) => {
        const result =
          runPreflight(file);

        assert.equal(
          result.status,
          1,
        );
        assert.match(
          result.stderr,
          /section_layer4_open/,
        );
      },
    );
  },
);

test(
  'production preflight accepts only an exact-SHA fully-passed certification manifest',
  () => {
    withManifest(
      manifest('passed'),
      (file) => {
        const result =
          runPreflight(file);

        assert.equal(
          result.status,
          0,
          result.stderr,
        );
        assert.match(
          result.stdout,
          /PRODUCTION RELEASE PREFLIGHT: PASS/,
        );
        assert.match(
          result.stdout,
          /"section20ReleaseGate": "passed"/,
        );
      },
    );
  },
);

test(
  'production preflight rejects a certification manifest for another SHA',
  () => {
    const value = {
      ...manifest('passed'),
      candidateSha:
        'b'.repeat(40),
    };

    withManifest(
      value,
      (file) => {
        const result =
          runPreflight(file);

        assert.equal(
          result.status,
          1,
        );
        assert.match(
          result.stderr,
          /candidateSha does not match current HEAD/,
        );
      },
    );
  },
);
