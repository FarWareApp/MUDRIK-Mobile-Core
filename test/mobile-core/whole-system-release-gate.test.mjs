import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  parseWholeSystemReleaseManifest,
  evaluateWholeSystemReleaseGate,
} = loadTypeScriptModule(
  'src/core/release/wholeSystemReleaseGate.ts',
);

const NOW = 2_200_000_000;
const SHA =
  'a'.repeat(40);

function sections(
  layer4Status = 'deferred',
) {
  return Array.from(
    { length: 19 },
    (_, index) => ({
      section: index + 1,
      preDeviceComplete: true,
      layer4Status,
      unresolvedBlockerCriticalHigh: 0,
    }),
  );
}

function manifest(overrides = {}) {
  return {
    protocolVersion: '1.0',
    candidateSha: SHA,
    generatedAtMs: NOW - 100,
    sections: sections(),
    mobileCoreValidation: 'passed',
    codeql: 'passed',
    dependencyHighCriticalGate:
      'passed',
    fullHistorySecretScan: 'passed',
    physicalAndroidValidation:
      'pending',
    realProviderValidation: 'pending',
    realIntegrationValidation:
      'pending',
    productionLikeControlPlaneAgent:
      'pending',
    independentSecurityReview:
      'pending',
    privacyRegulatoryReview: 'pending',
    disasterRecoveryExercise: 'pending',
    keyRotationExercise: 'pending',
    incidentResponseExercise: 'pending',
    loadReliabilityValidation: 'pending',
    upgradeRollbackValidation: 'pending',
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
    ...overrides,
  };
}

function productionReadyManifest(
  overrides = {},
) {
  return manifest({
    sections: sections('passed'),
    physicalAndroidValidation:
      'passed',
    realProviderValidation: 'passed',
    realIntegrationValidation: 'passed',
    productionLikeControlPlaneAgent:
      'passed',
    independentSecurityReview:
      'passed',
    privacyRegulatoryReview: 'passed',
    disasterRecoveryExercise: 'passed',
    keyRotationExercise: 'passed',
    incidentResponseExercise: 'passed',
    loadReliabilityValidation: 'passed',
    upgradeRollbackValidation: 'passed',
    ...overrides,
  });
}
test(
  'current deferred Layer 4 inventory can never authorize production release',
  () => {
    const value =
      manifest();

    assert.ok(
      parseWholeSystemReleaseManifest(
        value,
      ),
    );

    const decision =
      evaluateWholeSystemReleaseGate(
        value,
        NOW,
      );

    assert.equal(
      decision.productionAllowed,
      false,
    );
    assert.ok(
      decision.blockers.includes(
        'section_layer4_open',
      ),
    );
    assert.ok(
      decision.blockers.includes(
        'physical_android_open',
      ),
    );
    assert.ok(
      decision.blockers.includes(
        'independent_security_review_open',
      ),
    );
    assert.equal(
      decision.grantsAuthority,
      false,
    );
  },
);

test(
  'production release requires every Layer 4 and certification check to pass',
  () => {
    const decision =
      evaluateWholeSystemReleaseGate(
        productionReadyManifest(),
        NOW,
      );

    assert.equal(
      decision.productionAllowed,
      true,
    );
    assert.deepEqual(
      decision.blockers,
      [],
    );
    assert.equal(
      decision.candidateSha,
      SHA,
    );
    assert.equal(
      decision.grantsAuthority,
      false,
    );
  },
);
test(
  'failed Layer 4 evidence is distinct from deferred evidence and always blocks release',
  () => {
    const values =
      sections('passed');

    values[4] = {
      ...values[4],
      layer4Status: 'failed',
    };

    const decision =
      evaluateWholeSystemReleaseGate(
        productionReadyManifest({
          sections: values,
        }),
        NOW,
      );

    assert.equal(
      decision.productionAllowed,
      false,
    );
    assert.ok(
      decision.blockers.includes(
        'section_layer4_failed',
      ),
    );
  },
);

test(
  'pre-device incompleteness and unresolved high severity defects block release',
  () => {
    const values =
      sections('passed');

    values[10] = {
      ...values[10],
      preDeviceComplete: false,
    };
    values[17] = {
      ...values[17],
      unresolvedBlockerCriticalHigh: 1,
    };

    const decision =
      evaluateWholeSystemReleaseGate(
        productionReadyManifest({
          sections: values,
        }),
        NOW,
      );

    assert.equal(
      decision.productionAllowed,
      false,
    );
    assert.ok(
      decision.blockers.includes(
        'section_pre_device_incomplete',
      ),
    );
    assert.ok(
      decision.blockers.includes(
        'section_high_severity_open',
      ),
    );
  },
);
test(
  'future manifest time fails against trusted evaluation time',
  () => {
    const decision =
      evaluateWholeSystemReleaseGate(
        productionReadyManifest({
          generatedAtMs: NOW + 1,
        }),
        NOW,
      );

    assert.equal(
      decision.productionAllowed,
      false,
    );
    assert.ok(
      decision.blockers.includes(
        'trusted_time_invalid',
      ),
    );

    const noTrustedTime =
      evaluateWholeSystemReleaseGate(
        productionReadyManifest(),
        'not-trusted-time',
      );

    assert.equal(
      noTrustedTime.productionAllowed,
      false,
    );
    assert.ok(
      noTrustedTime.blockers.includes(
        'trusted_time_invalid',
      ),
    );
  },
);

test(
  'manifest parser requires exactly one evidence row for every section 1 through 19',
  () => {
    const duplicate =
      sections('passed');

    duplicate[18] = {
      ...duplicate[18],
      section: 18,
    };

    assert.equal(
      parseWholeSystemReleaseManifest(
        productionReadyManifest({
          sections: duplicate,
        }),
      ),
      null,
    );

    assert.equal(
      parseWholeSystemReleaseManifest({
        ...productionReadyManifest(),
        hiddenReleaseOverride: true,
      }),
      null,
    );
  },
);
test(
  'automated validation and each production certification class remain independent blockers',
  () => {
    const automated =
      evaluateWholeSystemReleaseGate(
        productionReadyManifest({
          codeql: 'failed',
        }),
        NOW,
      );

    assert.equal(
      automated.productionAllowed,
      false,
    );
    assert.ok(
      automated.blockers.includes(
        'automated_validation_open',
      ),
    );

    const recovery =
      evaluateWholeSystemReleaseGate(
        productionReadyManifest({
          disasterRecoveryExercise:
            'failed',
          upgradeRollbackValidation:
            'pending',
        }),
        NOW,
      );

    assert.equal(
      recovery.productionAllowed,
      false,
    );
    assert.ok(
      recovery.blockers.includes(
        'disaster_recovery_open',
      ),
    );
    assert.ok(
      recovery.blockers.includes(
        'upgrade_rollback_open',
      ),
    );
  },
);

test(
  'release manifest cannot carry authority flags',
  () => {
    assert.equal(
      parseWholeSystemReleaseManifest({
        ...productionReadyManifest(),
        grantsCapabilityAuthority: true,
      }),
      null,
    );
  },
);
