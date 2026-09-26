import assert from 'node:assert/strict';
import test from 'node:test';

import { loadTypeScriptModule } from './loadTypeScriptModule.mjs';

const riskModule = loadTypeScriptModule(
  'src/core/emergency/emergencyRiskAssessment.ts',
);

const NOW = 100_000;
const ACCOUNT = 'acct_0123456789abcdef';
const DEVICE = 'dev_0123456789abcdef';
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
    evidenceSources: [
      'user_report',
      'motion',
      'heart_rate',
      'oxygen',
      'camera',
      'responsiveness',
      'location',
    ],
    emergencyContactRefs: [],
    shareLocation: false,
    medicalProfileRef: null,
    shareMedicalProfile: false,
    updatedAtMs: 90_000,
    ...overrides,
  };
}

function trust(state = 'active') {
  return {
    device: {
      deviceId: DEVICE,
      accountId: ACCOUNT,
      deviceKeyId: KEY,
      publicKeyThumbprint: THUMB,
      state,
      hardwareBacked: true,
    },
    expectedAccountId: ACCOUNT,
    expectedDeviceId: DEVICE,
    expectedDeviceKeyId: KEY,
    expectedPublicKeyThumbprint: THUMB,
  };
}

function evidence(id, overrides = {}) {
  return {
    emergencySessionId: 'ems_0123456789abcdef',
    evidenceId: id,
    sequence: 0,
    accountId: ACCOUNT,
    sourceDeviceId: DEVICE,
    kind: 'motion',
    finding: 'fall_detected',
    observedAtMs: 95_000,
    confidence: 0.9,
    sensorId: 'sens_0123456789abcdef',
    ...overrides,
  };
}

const CAPABILITY = {
  motion: 'health.read.motion',
  heart_rate: 'health.read.heart_rate',
  oxygen: 'health.read.oxygen',
  camera: 'camera.observe',
  location: 'emergency.location.read',
};

function candidate(value, overrides = {}) {
  const capability = CAPABILITY[value.kind] ?? null;
  const sensorAuthorization = value.sensorId === null
    ? null
    : {
        sensorId: value.sensorId,
        privacyState: 'active',
        runtimeAvailability: 'available',
        permission: 'granted',
        deviceTrust: 'trusted',
        usage: 'passive_observation',
        explicitUserRequest: false,
      };

  return {
    evidence: value,
    collectorDeviceTrustInput: trust(),
    capabilityGrants: capability
      ? [{
          grantId: `grant-${value.evidenceId}`,
          subjectId: DEVICE,
          capability,
          scope: {
            resourceId: DEVICE,
            allowBackground: true,
          },
        }]
      : [],
    sensorAuthorization,
    ...overrides,
  };
}

function input(candidates, overrides = {}) {
  return {
    accountId: ACCOUNT,
    emergencySessionId: 'ems_0123456789abcdef',
    config: config(),
    candidates,
    ...overrides,
  };
}

test('no authorized current evidence yields unknown and no external action', () => {
  const result = riskModule.assessEmergencyRisk(input([]), NOW);
  assert.equal(result.risk, 'unknown');
  assert.equal(result.reason, 'no_authorized_evidence');
  assert.equal(result.recommendedEvent, null);
  assert.equal(result.diagnosticClaim, false);
  assert.equal(result.grantsAuthority, false);
  assert.equal(result.performsExternalAction, false);
});

test('one physiological alert requests a check but never becomes critical', () => {
  const value = evidence('eme_1111111111111111', {
    kind: 'heart_rate',
    finding: 'heart_rate_alert',
    sensorId: 'sens_1111111111111111',
  });
  const result = riskModule.assessEmergencyRisk(
    input([candidate(value)]),
    NOW,
  );

  assert.equal(result.risk, 'check_user');
  assert.equal(result.recommendedEvent, 'request_check');
  assert.notEqual(result.risk, 'critical');
});

test('one weak alert remains watch', () => {
  const value = evidence('eme_1111111111111111', {
    confidence: 0.3,
  });
  const result = riskModule.assessEmergencyRisk(
    input([candidate(value)]),
    NOW,
  );

  assert.equal(result.risk, 'watch');
  assert.equal(result.recommendedEvent, 'risk_watch');
});

test('direct help or severe symptom report is urgent without a diagnosis', () => {
  for (const finding of ['help_requested', 'severe_symptoms_reported']) {
    const value = evidence('eme_1111111111111111', {
      kind: 'user_report',
      finding,
      sensorId: null,
    });
    const result = riskModule.assessEmergencyRisk(
      input([candidate(value)]),
      NOW,
    );

    assert.equal(result.risk, 'urgent');
    assert.equal(result.reason, 'urgent_user_report');
    assert.equal(result.diagnosticClaim, false);
    assert.equal(result.performsExternalAction, false);
  }
});

test('critical requires unresponsiveness incident and abnormal physiological corroboration', () => {
  const unresponsive = evidence('eme_1111111111111111', {
    kind: 'responsiveness',
    finding: 'unresponsive',
    sensorId: null,
    confidence: 0.95,
  });
  const fall = evidence('eme_2222222222222222', {
    confidence: 0.9,
  });
  const heart = evidence('eme_3333333333333333', {
    kind: 'heart_rate',
    finding: 'heart_rate_alert',
    sensorId: 'sens_3333333333333333',
    confidence: 0.88,
  });

  const withoutPhysiology = riskModule.assessEmergencyRisk(
    input([candidate(unresponsive), candidate(fall)]),
    NOW,
  );
  assert.notEqual(withoutPhysiology.risk, 'critical');

  const result = riskModule.assessEmergencyRisk(
    input([
      candidate(unresponsive),
      candidate(fall),
      candidate(heart),
    ]),
    NOW,
  );

  assert.equal(result.risk, 'critical');
  assert.equal(result.reason, 'critical_corroborated');
  assert.equal(result.recommendedEvent, 'risk_critical');
  assert.equal(result.supportingEvidenceIds.length, 3);
  assert.equal(result.performsExternalAction, false);
});

test('critical corroboration outranks an additional urgent user report', () => {
  const unresponsive = evidence('eme_1111111111111111', {
    kind: 'responsiveness',
    finding: 'unresponsive',
    sensorId: null,
    confidence: 0.95,
  });
  const fall = evidence('eme_2222222222222222', {
    confidence: 0.9,
  });
  const heart = evidence('eme_3333333333333333', {
    kind: 'heart_rate',
    finding: 'heart_rate_alert',
    sensorId: 'sens_3333333333333333',
    confidence: 0.9,
  });
  const report = evidence('eme_4444444444444444', {
    kind: 'user_report',
    finding: 'severe_symptoms_reported',
    sensorId: null,
    confidence: 1,
  });

  const result = riskModule.assessEmergencyRisk(
    input([
      candidate(unresponsive),
      candidate(fall),
      candidate(heart),
      candidate(report),
    ]),
    NOW,
  );

  assert.equal(result.risk, 'critical');
  assert.equal(result.reason, 'critical_corroborated');
});

test('historical evidence cannot create current critical state', () => {
  const oldUnresponsive = evidence('eme_1111111111111111', {
    kind: 'responsiveness',
    finding: 'unresponsive',
    sensorId: null,
    observedAtMs: 20_000,
    confidence: 0.95,
  });
  const fall = evidence('eme_2222222222222222', {
    confidence: 0.9,
  });

  const result = riskModule.assessEmergencyRisk(
    input([
      candidate(oldUnresponsive),
      candidate(fall),
    ]),
    NOW,
  );

  assert.equal(result.risk, 'check_user');
  assert.equal(result.reason, 'check_user');
  assert.deepEqual(
    result.historicalEvidenceIds,
    ['eme_1111111111111111'],
  );
});

test('unauthorized corroborator is ignored and cannot manufacture critical risk', () => {
  const unresponsive = evidence('eme_1111111111111111', {
    kind: 'responsiveness',
    finding: 'unresponsive',
    sensorId: null,
    confidence: 0.95,
  });
  const camera = evidence('eme_2222222222222222', {
    kind: 'camera',
    finding: 'collapse_pattern_detected',
    sensorId: 'sens_2222222222222222',
    confidence: 0.95,
  });
  const blockedCamera = candidate(camera);
  blockedCamera.sensorAuthorization = {
    ...blockedCamera.sensorAuthorization,
    permission: 'denied',
  };

  const result = riskModule.assessEmergencyRisk(
    input([
      candidate(unresponsive),
      blockedCamera,
    ]),
    NOW,
  );

  assert.equal(result.risk, 'check_user');
  assert.equal(result.rejectedEvidenceCount, 1);
  assert.notEqual(result.risk, 'critical');
});

test('conflicting responsiveness evidence degrades to check user', () => {
  const responsive = evidence('eme_1111111111111111', {
    kind: 'responsiveness',
    finding: 'responsive',
    sensorId: null,
    confidence: 0.9,
  });
  const unresponsive = evidence('eme_2222222222222222', {
    kind: 'responsiveness',
    finding: 'unresponsive',
    sensorId: null,
    confidence: 0.9,
  });

  const result = riskModule.assessEmergencyRisk(
    input([
      candidate(responsive),
      candidate(unresponsive),
    ]),
    NOW,
  );

  assert.equal(result.risk, 'check_user');
  assert.equal(result.reason, 'conflicting_evidence');
  assert.equal(result.recommendedEvent, 'request_check');
});

test('two independent strong noncritical alert kinds can become urgent but not diagnostic', () => {
  const heart = evidence('eme_1111111111111111', {
    kind: 'heart_rate',
    finding: 'heart_rate_alert',
    sensorId: 'sens_1111111111111111',
    confidence: 0.85,
  });
  const oxygen = evidence('eme_2222222222222222', {
    kind: 'oxygen',
    finding: 'oxygen_alert',
    sensorId: 'sens_2222222222222222',
    confidence: 0.8,
  });

  const result = riskModule.assessEmergencyRisk(
    input([
      candidate(heart),
      candidate(oxygen),
    ]),
    NOW,
  );

  assert.equal(result.risk, 'urgent');
  assert.equal(result.reason, 'urgent_corroborated');
  assert.equal(result.diagnosticClaim, false);
  assert.notEqual(result.risk, 'critical');
});

test('location-only evidence never creates a medical risk state', () => {
  const location = evidence('eme_1111111111111111', {
    kind: 'location',
    finding: 'location_available',
    sensorId: 'sens_1111111111111111',
    confidence: 1,
  });

  const result = riskModule.assessEmergencyRisk(
    input([candidate(location)]),
    NOW,
  );

  assert.equal(result.risk, 'unknown');
  assert.equal(result.recommendedEvent, null);
});

test('strong contradictory readings degrade to check user', () => {
  const alert = evidence('eme_1111111111111111', {
    kind: 'heart_rate',
    finding: 'heart_rate_alert',
    sensorId: 'sens_1111111111111111',
    confidence: 0.9,
  });
  const normal = evidence('eme_2222222222222222', {
    kind: 'heart_rate',
    finding: 'heart_rate_normal',
    sensorId: 'sens_2222222222222222',
    confidence: 0.9,
  });

  const result = riskModule.assessEmergencyRisk(
    input([candidate(alert), candidate(normal)]),
    NOW,
  );

  assert.equal(result.risk, 'check_user');
  assert.equal(result.reason, 'conflicting_evidence');
  assert.equal(result.recommendedEvent, 'request_check');
});

test('assessment is deterministic under candidate reordering', () => {
  const heart = evidence('eme_1111111111111111', {
    kind: 'heart_rate',
    finding: 'heart_rate_alert',
    sensorId: 'sens_1111111111111111',
    confidence: 0.85,
  });
  const oxygen = evidence('eme_2222222222222222', {
    kind: 'oxygen',
    finding: 'oxygen_alert',
    sensorId: 'sens_2222222222222222',
    confidence: 0.8,
  });

  const forward = riskModule.assessEmergencyRisk(
    input([candidate(heart), candidate(oxygen)]),
    NOW,
  );
  const reversed = riskModule.assessEmergencyRisk(
    input([candidate(oxygen), candidate(heart)]),
    NOW,
  );

  assert.deepEqual(forward, reversed);
});

test('duplicate evidence ids and hidden top-level authority fail closed', () => {
  const value = evidence('eme_1111111111111111');
  const duplicate = riskModule.assessEmergencyRisk(
    input([candidate(value), candidate(value)]),
    NOW,
  );
  assert.equal(duplicate.reason, 'invalid_input');

  const hidden = riskModule.assessEmergencyRisk(
    {
      ...input([]),
      forceCall: true,
    },
    NOW,
  );
  assert.equal(hidden.reason, 'invalid_input');
});

test('disabled guardian cannot produce a risk recommendation', () => {
  const result = riskModule.assessEmergencyRisk(
    input([], {
      config: config({ enabled: false }),
    }),
    NOW,
  );

  assert.equal(result.risk, 'unknown');
  assert.equal(result.reason, 'guardian_disabled');
  assert.equal(result.recommendedEvent, null);
});

test('risk assessment provenance rejects copied results', () => {
  const result = riskModule.assessEmergencyRisk(
    input([]),
    NOW,
  );

  assert.equal(
    riskModule.isEmergencyRiskAssessment(result),
    true,
  );
  assert.equal(
    riskModule.isEmergencyRiskAssessment({
      ...result,
    }),
    false,
  );
});
