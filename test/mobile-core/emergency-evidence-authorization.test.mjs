import assert from 'node:assert/strict';
import test from 'node:test';

import { loadTypeScriptModule } from './loadTypeScriptModule.mjs';

const authorizationModule = loadTypeScriptModule(
  'src/core/emergency/emergencyEvidenceAuthorization.ts',
);

const NOW = 100_000;
const ACCOUNT = 'acct_0123456789abcdef';
const OTHER_ACCOUNT = 'acct_fedcba9876543210';
const DEVICE = 'dev_0123456789abcdef';
const SENSOR = 'sens_0123456789abcdef';
const KEY = 'dkey_0123456789abcdef';
const THUMB = 'A'.repeat(43);

function config(overrides = {}) {
  return {
    configId: 'egc_0123456789abcdef',
    accountId: ACCOUNT,
    revision: 0,
    enabled: true,
    mode: 'simulation',
    automaticEscalation: false,
    responsivenessTimeoutMs: 10_000,
    escalationCountdownMs: 15_000,
    evidenceSources: ['user_report', 'motion', 'responsiveness'],
    emergencyContactRefs: [],
    shareLocation: false,
    medicalProfileRef: null,
    shareMedicalProfile: false,
    updatedAtMs: 90_000,
    ...overrides,
  };
}

function evidence(overrides = {}) {
  return {
    emergencySessionId: 'ems_0123456789abcdef',
    evidenceId: 'eme_0123456789abcdef',
    sequence: 0,
    accountId: ACCOUNT,
    sourceDeviceId: DEVICE,
    kind: 'motion',
    finding: 'fall_detected',
    observedAtMs: 95_000,
    confidence: 0.9,
    sensorId: SENSOR,
    ...overrides,
  };
}

function trust(overrides = {}) {
  return {
    device: {
      deviceId: DEVICE,
      accountId: ACCOUNT,
      deviceKeyId: KEY,
      publicKeyThumbprint: THUMB,
      state: 'active',
      hardwareBacked: true,
    },
    expectedAccountId: ACCOUNT,
    expectedDeviceId: DEVICE,
    expectedDeviceKeyId: KEY,
    expectedPublicKeyThumbprint: THUMB,
    ...overrides,
  };
}

function sensorAuthorization(overrides = {}) {
  return {
    sensorId: SENSOR,
    privacyState: 'active',
    runtimeAvailability: 'available',
    permission: 'granted',
    deviceTrust: 'trusted',
    usage: 'passive_observation',
    explicitUserRequest: false,
    ...overrides,
  };
}

function grant(overrides = {}) {
  return {
    grantId: 'grant-emergency-motion-01',
    subjectId: DEVICE,
    capability: 'health.read.motion',
    scope: {
      resourceId: DEVICE,
      allowBackground: true,
    },
    ...overrides,
  };
}

function input(overrides = {}) {
  return {
    accountId: ACCOUNT,
    expectedEmergencySessionId: 'ems_0123456789abcdef',
    config: config(),
    collectorDeviceTrustInput: trust(),
    evidence: evidence(),
    capabilityGrants: [grant()],
    sensorAuthorization: sensorAuthorization(),
    ...overrides,
  };
}

test('authorized passive motion evidence requires trust sensor policy and scoped capability', () => {
  const decision = authorizationModule.authorizeEmergencyEvidence(
    input(),
    NOW,
  );

  assert.equal(decision.accepted, true);
  assert.equal(decision.reason, 'accepted');
  assert.equal(decision.freshness, 'fresh');
  assert.equal(decision.requiredCapability, 'health.read.motion');
  assert.equal(decision.grantId, 'grant-emergency-motion-01');
  assert.equal(decision.grantsAuthority, false);
});

test('disabled guardian and disabled evidence source fail closed', () => {
  assert.equal(
    authorizationModule.authorizeEmergencyEvidence(
      input({ config: config({ enabled: false }) }),
      NOW,
    ).reason,
    'guardian_disabled',
  );

  assert.equal(
    authorizationModule.authorizeEmergencyEvidence(
      input({ config: config({ evidenceSources: ['user_report'] }) }),
      NOW,
    ).reason,
    'source_not_enabled',
  );
});

test('session and account bindings cannot be swapped', () => {
  assert.equal(
    authorizationModule.authorizeEmergencyEvidence(
      input({ expectedEmergencySessionId: 'ems_fedcba9876543210' }),
      NOW,
    ).reason,
    'session_mismatch',
  );

  assert.equal(
    authorizationModule.authorizeEmergencyEvidence(
      input({ evidence: evidence({ accountId: OTHER_ACCOUNT }) }),
      NOW,
    ).reason,
    'account_mismatch',
  );

  assert.equal(
    authorizationModule.authorizeEmergencyEvidence(
      input({ config: config({ accountId: OTHER_ACCOUNT }) }),
      NOW,
    ).reason,
    'account_mismatch',
  );
});

test('revoked or mismatched collector device cannot authenticate evidence', () => {
  const revoked = trust({
    device: {
      deviceId: DEVICE,
      accountId: ACCOUNT,
      deviceKeyId: KEY,
      publicKeyThumbprint: THUMB,
      state: 'revoked',
      hardwareBacked: true,
    },
  });

  assert.equal(
    authorizationModule.authorizeEmergencyEvidence(
      input({ collectorDeviceTrustInput: revoked }),
      NOW,
    ).reason,
    'collector_untrusted',
  );

  assert.equal(
    authorizationModule.authorizeEmergencyEvidence(
      input({
        collectorDeviceTrustInput: trust({
          expectedAccountId: OTHER_ACCOUNT,
        }),
      }),
      NOW,
    ).reason,
    'collector_untrusted',
  );
});

test('sensor authorization is required and must bind the exact evidence sensor', () => {
  assert.equal(
    authorizationModule.authorizeEmergencyEvidence(
      input({ sensorAuthorization: null }),
      NOW,
    ).reason,
    'sensor_authorization_required',
  );

  assert.equal(
    authorizationModule.authorizeEmergencyEvidence(
      input({
        sensorAuthorization: sensorAuthorization({
          sensorId: 'sens_fedcba9876543210',
        }),
      }),
      NOW,
    ).reason,
    'sensor_binding_mismatch',
  );
});

test('sensor permission privacy trust and availability remain independently enforced', () => {
  const cases = [
    sensorAuthorization({ permission: 'denied' }),
    sensorAuthorization({ deviceTrust: 'untrusted' }),
    sensorAuthorization({ runtimeAvailability: 'unavailable' }),
    sensorAuthorization({ privacyState: 'ambient_off' }),
  ];

  for (const value of cases) {
    assert.equal(
      authorizationModule.authorizeEmergencyEvidence(
        input({ sensorAuthorization: value }),
        NOW,
      ).reason,
      'sensor_not_authorized',
    );
  }
});

test('passive monitoring requires a capability grant that explicitly permits background use', () => {
  const deniedCases = [
    [],
    [grant({ capability: 'health.read.heart_rate' })],
    [grant({ scope: { resourceId: DEVICE } })],
    [grant({ expiresAtMs: NOW })],
    [grant({ revokedAtMs: NOW - 1 })],
  ];

  for (const capabilityGrants of deniedCases) {
    assert.equal(
      authorizationModule.authorizeEmergencyEvidence(
        input({ capabilityGrants }),
        NOW,
      ).reason,
      'capability_denied',
    );
  }
});

test('direct sensor interaction requires explicit user request but not background scope', () => {
  const directGrant = grant({
    scope: { resourceId: DEVICE },
  });

  assert.equal(
    authorizationModule.authorizeEmergencyEvidence(
      input({
        capabilityGrants: [directGrant],
        sensorAuthorization: sensorAuthorization({
          usage: 'direct_interaction',
          explicitUserRequest: false,
        }),
      }),
      NOW,
    ).reason,
    'sensor_not_authorized',
  );

  const accepted = authorizationModule.authorizeEmergencyEvidence(
    input({
      capabilityGrants: [directGrant],
      sensorAuthorization: sensorAuthorization({
        usage: 'direct_interaction',
        explicitUserRequest: true,
      }),
    }),
    NOW,
  );

  assert.equal(accepted.reason, 'accepted');
});

test('direct user report needs trusted device binding but no sensor or health grant', () => {
  const userReport = evidence({
    kind: 'user_report',
    finding: 'help_requested',
    sensorId: null,
  });

  const decision = authorizationModule.authorizeEmergencyEvidence(
    input({
      evidence: userReport,
      capabilityGrants: [],
      sensorAuthorization: null,
    }),
    NOW,
  );

  assert.equal(decision.accepted, true);
  assert.equal(decision.requiredCapability, null);
  assert.equal(decision.grantId, null);
  assert.equal(decision.grantsAuthority, false);

  assert.equal(
    authorizationModule.authorizeEmergencyEvidence(
      input({
        evidence: userReport,
        capabilityGrants: [],
        sensorAuthorization: sensorAuthorization(),
      }),
      NOW,
    ).reason,
    'invalid_input',
  );
});

test('historical evidence stays historical while future and expired evidence fail', () => {
  const historical = authorizationModule.authorizeEmergencyEvidence(
    input({
      evidence: evidence({ observedAtMs: 20_000 }),
    }),
    NOW,
  );
  assert.equal(historical.accepted, true);
  assert.equal(historical.freshness, 'historical');

  assert.equal(
    authorizationModule.authorizeEmergencyEvidence(
      input({ evidence: evidence({ observedAtMs: NOW + 1 }) }),
      NOW,
    ).reason,
    'future_evidence',
  );

  assert.equal(
    authorizationModule.authorizeEmergencyEvidence(
      input(),
      1_000_001,
    ).reason,
    'expired_evidence',
  );
});

test('hidden authority fields and invalid trusted time are rejected', () => {
  assert.equal(
    authorizationModule.authorizeEmergencyEvidence(
      { ...input(), forceEscalation: true },
      NOW,
    ).reason,
    'invalid_input',
  );

  assert.equal(
    authorizationModule.authorizeEmergencyEvidence(
      input(),
      Number.NaN,
    ).reason,
    'invalid_input',
  );
});
