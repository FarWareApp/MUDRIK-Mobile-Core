import assert from 'node:assert/strict';
import test from 'node:test';

import { loadTypeScriptModule } from './loadTypeScriptModule.mjs';

const evidenceModule = loadTypeScriptModule(
  'src/core/emergency/emergencyEvidence.ts',
);
const registryModule = loadTypeScriptModule(
  'src/core/emergency/emergencyEvidenceRegistry.ts',
);

const NOW = 100_000;
const ACCOUNT = 'acct_0123456789abcdef';
const DEVICE = 'dev_0123456789abcdef';
const SENSOR = 'sens_0123456789abcdef';

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

test('derived sensor evidence is bounded and authority free', () => {
  const parsed = evidenceModule.parseEmergencyEvidence(evidence());
  assert.ok(parsed);
  assert.equal(parsed.medicalClaim, false);
  assert.equal(parsed.grantsAuthority, false);
  assert.equal(parsed.finding, 'fall_detected');
});

test('direct user and responsiveness evidence require no sensor reference', () => {
  for (const value of [
    evidence({
      kind: 'user_report',
      finding: 'help_requested',
      sensorId: null,
    }),
    evidence({
      kind: 'responsiveness',
      finding: 'responsive',
      sensorId: null,
    }),
  ]) {
    assert.ok(evidenceModule.parseEmergencyEvidence(value));
  }

  assert.equal(
    evidenceModule.parseEmergencyEvidence(evidence({
      kind: 'user_report',
      finding: 'help_requested',
      sensorId: SENSOR,
    })),
    null,
  );
});

test('sensor-backed evidence requires a valid sensor reference', () => {
  assert.equal(
    evidenceModule.parseEmergencyEvidence(evidence({ sensorId: null })),
    null,
  );
  assert.equal(
    evidenceModule.parseEmergencyEvidence(evidence({ sensorId: 'bad' })),
    null,
  );
});

test('finding must match its evidence kind', () => {
  const cases = [
    evidence({ kind: 'heart_rate', finding: 'fall_detected' }),
    evidence({ kind: 'camera', finding: 'heart_rate_alert' }),
    evidence({ kind: 'responsiveness', finding: 'help_requested', sensorId: null }),
  ];

  for (const value of cases) {
    assert.equal(evidenceModule.parseEmergencyEvidence(value), null);
  }
});

test('hidden raw values streams and authority fields fail closed', () => {
  const cases = [
    { ...evidence(), rawValue: 190 },
    { ...evidence(), rawPayload: { sample: [1, 2, 3] } },
    { ...evidence(), permissions: ['all'] },
    { ...evidence(), medicalClaim: true },
  ];

  for (const value of cases) {
    assert.equal(evidenceModule.parseEmergencyEvidence(value), null);
  }
});

test('unsafe numeric values fail closed', () => {
  const cases = [
    evidence({ sequence: Number.MAX_SAFE_INTEGER + 1 }),
    evidence({ observedAtMs: Number.NaN }),
    evidence({ confidence: Number.NaN }),
    evidence({ confidence: Number.POSITIVE_INFINITY }),
    evidence({ confidence: -0.01 }),
    evidence({ confidence: 1.01 }),
  ];

  for (const value of cases) {
    assert.equal(evidenceModule.parseEmergencyEvidence(value), null);
  }
});

test('freshness is derived only from trusted evaluation time', () => {
  const parsed = evidenceModule.parseEmergencyEvidence(evidence());
  assert.ok(parsed);

  assert.equal(
    evidenceModule.evaluateEmergencyEvidenceTime(parsed, NOW).freshness,
    'fresh',
  );
  assert.equal(
    evidenceModule.evaluateEmergencyEvidenceTime(
      { ...parsed, observedAtMs: 20_000 },
      NOW,
    ).freshness,
    'historical',
  );
  assert.equal(
    evidenceModule.evaluateEmergencyEvidenceTime(
      parsed,
      1_000_001,
    ).freshness,
    'expired',
  );
  assert.equal(
    evidenceModule.evaluateEmergencyEvidenceTime(
      { ...parsed, observedAtMs: NOW + 1 },
      NOW,
    ).freshness,
    'future',
  );
  assert.equal(
    evidenceModule.evaluateEmergencyEvidenceTime(parsed, Number.NaN).freshness,
    'invalid_time',
  );
});

test('registry enforces first sequence zero duplicate conflict gaps and stale updates', () => {
  const registry = new registryModule.EmergencyEvidenceRegistry();

  assert.equal(
    registry.apply(evidence({ sequence: 1 }), NOW).reason,
    'sequence_gap',
  );
  assert.equal(registry.apply(evidence(), NOW).reason, 'accepted');
  assert.equal(registry.apply(evidence(), NOW).reason, 'duplicate');

  assert.equal(
    registry.apply(evidence({ confidence: 0.8 }), NOW).reason,
    'sequence_conflict',
  );
  assert.equal(
    registry.apply(evidence({ sequence: 2, observedAtMs: 96_000 }), NOW).reason,
    'sequence_gap',
  );
  assert.equal(
    registry.apply(evidence({ sequence: 1, observedAtMs: 96_000 }), NOW).reason,
    'accepted',
  );
  assert.equal(
    registry.apply(evidence({ sequence: 0 }), NOW).reason,
    'stale_sequence',
  );
});

test('registry blocks cross-session replay and evidence binding swaps', () => {
  const registry = new registryModule.EmergencyEvidenceRegistry();
  assert.equal(registry.apply(evidence(), NOW).reason, 'accepted');

  assert.equal(
    registry.apply(evidence({
      emergencySessionId: 'ems_fedcba9876543210',
      sequence: 1,
      observedAtMs: 96_000,
    }), NOW).reason,
    'cross_session_replay',
  );

  assert.equal(
    registry.apply(evidence({
      sourceDeviceId: 'dev_fedcba9876543210',
      sequence: 1,
      observedAtMs: 96_000,
    }), NOW).reason,
    'evidence_binding_conflict',
  );
});

test('registry rejects future expired and invalid-time evidence', () => {
  const future = evidence({ observedAtMs: NOW + 1 });
  assert.equal(registryModule
    .EmergencyEvidenceRegistry.prototype.apply
    .call(new registryModule.EmergencyEvidenceRegistry(), future, NOW).reason,
    'future_evidence',
  );

  const registry = new registryModule.EmergencyEvidenceRegistry();
  assert.equal(
    registry.apply(
      evidence(),
      1_000_001,
    ).reason,
    'expired_evidence',
  );
  assert.equal(
    registry.apply(evidence(), Number.NaN).reason,
    'invalid_time',
  );
});

test('session listing is bounded to the requested valid session', () => {
  const registry = new registryModule.EmergencyEvidenceRegistry();
  registry.apply(evidence(), NOW);
  registry.apply(evidence({
    evidenceId: 'eme_1111111111111111',
    kind: 'user_report',
    finding: 'help_requested',
    sensorId: null,
  }), NOW);

  const listed = registry.listForSession(
    'ems_0123456789abcdef',
    NOW,
  );
  assert.equal(listed.length, 2);
  assert.equal(
    registry.listForSession('invalid', NOW).length,
    0,
  );
  assert.equal(registry.getLast('bad', NOW), null);
});

test('registry recomputes freshness at read and duplicate time', () => {
  const registry = new registryModule.EmergencyEvidenceRegistry();
  const value = evidence({ observedAtMs: 95_000 });

  assert.equal(registry.apply(value, NOW).freshness, 'fresh');
  assert.equal(
    registry.getLast(value.evidenceId, 140_000).freshness,
    'historical',
  );
  assert.equal(
    registry.listForSession(
      value.emergencySessionId,
      1_000_001,
    )[0].freshness,
    'expired',
  );
  assert.equal(
    registry.apply(value, 140_000).freshness,
    'historical',
  );
});
