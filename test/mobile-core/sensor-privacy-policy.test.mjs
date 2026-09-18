import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  applySensorState,
} = loadTypeScriptModule('src/core/privacy/sensorStateRegistry.ts');

const {
  evaluateSensorActivation,
} = loadTypeScriptModule('src/core/privacy/sensorActivationPolicy.ts');

const {
  evaluateObservationTruth,
  MAX_SENSOR_STATE_FRESHNESS_MS,
} = loadTypeScriptModule('src/core/privacy/observationTruth.ts');

const NOW = 70_000_000;
const DEVICE = 'dev_aaaaaaaaaaaaaaaa';

function sensor(overrides = {}) {
  return {
    sensorId: 'sens_aaaaaaaaaaaaaaaa',
    sourceDeviceId: DEVICE,
    type: 'camera',
    state: 'inactive',
    usage: 'passive_observation',
    permission: 'granted',
    deviceTrust: 'trusted',
    processing: 'local',
    retention: 'none',
    privacyScope: 'personal_private',
    featureId: 'companion.vision',
    reason: 'user_enabled',
    sequence: 1,
    lastTransitionAtMs: NOW - 100,
    verifiedAtMs: NOW,
    ...overrides,
  };
}

function activation(overrides = {}) {
  return {
    privacyState: 'active',
    runtimeAvailability: 'available',
    sensorType: 'camera',
    usage: 'passive_observation',
    permission: 'granted',
    deviceTrust: 'trusted',
    explicitUserRequest: false,
    ...overrides,
  };
}

function truth(input) {
  return evaluateObservationTruth(input, NOW);
}

test('sensor registry accepts monotonic updates and exact duplicates idempotently', () => {
  const first = applySensorState([], sensor());
  assert.equal(first.accepted, true);
  assert.equal(first.reason, 'accepted');
  assert.equal(first.records.length, 1);

  const duplicate = applySensorState(first.records, sensor());
  assert.equal(duplicate.accepted, true);
  assert.equal(duplicate.reason, 'duplicate_no_change');
  assert.equal(duplicate.records, first.records);

  const next = applySensorState(
    first.records,
    sensor({
      state: 'active',
      sequence: 2,
      lastTransitionAtMs: NOW,
      verifiedAtMs: NOW,
    }),
  );

  assert.equal(next.accepted, true);
  assert.equal(next.records[0].state, 'active');
  assert.equal(next.records[0].sequence, 2);
});

test('sensor registry rejects stale and conflicting same-sequence updates', () => {
  const current = applySensorState(
    [],
    sensor({ sequence: 5 }),
  ).records;

  assert.equal(
    applySensorState(current, sensor({ sequence: 4 })).reason,
    'stale_sequence',
  );

  assert.equal(
    applySensorState(
      current,
      sensor({ sequence: 5, state: 'active' }),
    ).reason,
    'conflicting_sequence',
  );
});

test('sensor registry rejects malformed trust permission ids timestamps and hidden fields', () => {
  for (const value of [
    sensor({ sensorId: 'camera-1' }),
    sensor({ sourceDeviceId: 'dev_short' }),
    sensor({ permission: 'always' }),
    sensor({ deviceTrust: 'admin' }),
    sensor({ sequence: -1 }),
    sensor({ lastTransitionAtMs: Number.MAX_SAFE_INTEGER + 1, verifiedAtMs: Number.MAX_SAFE_INTEGER + 1 }),
    sensor({ verifiedAtMs: Number.MAX_SAFE_INTEGER + 1 }),
    sensor({ verifiedAtMs: NOW - 200, lastTransitionAtMs: NOW }),
    { ...sensor(), rootAuthority: true },
  ]) {
    const result = applySensorState([], value);
    assert.equal(result.accepted, false);
    assert.equal(result.reason, 'invalid_record');
  }
});

test('passive observation is denied when runtime permission or device trust is not proven', () => {
  assert.equal(
    evaluateSensorActivation(
      activation({ runtimeAvailability: 'unknown' }),
    ).reason,
    'runtime_unavailable',
  );
  assert.equal(
    evaluateSensorActivation(
      activation({ permission: 'unknown' }),
    ).reason,
    'permission_required',
  );
  assert.equal(
    evaluateSensorActivation(
      activation({ permission: 'denied' }),
    ).reason,
    'permission_required',
  );
  assert.equal(
    evaluateSensorActivation(
      activation({ deviceTrust: 'unknown' }),
    ).reason,
    'trusted_device_required',
  );
  assert.equal(
    evaluateSensorActivation(
      activation({ deviceTrust: 'untrusted' }),
    ).reason,
    'trusted_device_required',
  );
});

test('visual_off blocks passive visual sensors but not an otherwise authorized microphone', () => {
  assert.equal(
    evaluateSensorActivation(
      activation({ privacyState: 'visual_off', sensorType: 'camera' }),
    ).reason,
    'visual_observation_blocked',
  );

  assert.equal(
    evaluateSensorActivation(
      activation({ privacyState: 'visual_off', sensorType: 'spatial' }),
    ).reason,
    'visual_observation_blocked',
  );

  assert.equal(
    evaluateSensorActivation(
      activation({ privacyState: 'visual_off', sensorType: 'microphone' }),
    ).allowed,
    true,
  );
});

test('ambient_off and privacy_lock block all passive observation types', () => {
  for (const privacyState of ['ambient_off', 'privacy_lock']) {
    for (const sensorType of ['camera', 'microphone', 'location', 'health', 'presence']) {
      const result = evaluateSensorActivation(
        activation({ privacyState, sensorType }),
      );
      assert.equal(result.allowed, false);
      assert.equal(result.reason, 'passive_observation_blocked');
    }
  }
});

test('direct interaction requires explicit user request and never changes passive privacy policy', () => {
  const denied = evaluateSensorActivation(
    activation({
      privacyState: 'privacy_lock',
      usage: 'direct_interaction',
      sensorType: 'microphone',
      explicitUserRequest: false,
    }),
  );
  assert.equal(denied.reason, 'explicit_user_request_required');

  const allowed = evaluateSensorActivation(
    activation({
      privacyState: 'privacy_lock',
      usage: 'direct_interaction',
      sensorType: 'microphone',
      explicitUserRequest: true,
    }),
  );
  assert.equal(allowed.allowed, true);
  assert.equal(allowed.changesPrivacyPolicy, false);
});

test('truth resolver reports verified passive visual observation from active fresh camera', () => {
  const result = truth({
    privacyState: 'active',
    records: [sensor({ state: 'active' })],
    nowMs: NOW,
  });

  assert.equal(result.status, 'passive_observation_active');
  assert.equal(result.fullyVerified, true);
  assert.equal(result.passiveObservationActive, true);
  assert.equal(result.visualObservationActive, true);
  assert.deepEqual(result.activeSensorIds, ['sens_aaaaaaaaaaaaaaaa']);
});

test('truth resolver reports policy violation when passive sensor is active against privacy policy', () => {
  for (const privacyState of ['visual_off', 'ambient_off', 'privacy_lock']) {
    const result = truth({
      privacyState,
      records: [sensor({ state: 'active' })],
      nowMs: NOW,
    });

    assert.equal(result.status, 'policy_violation');
    assert.deepEqual(result.violatingSensorIds, ['sens_aaaaaaaaaaaaaaaa']);
  }
});

test('truth resolver treats active sensor without current permission or device trust as policy violation', () => {
  for (const overrides of [
    { permission: 'denied' },
    { permission: 'unknown' },
    { deviceTrust: 'untrusted' },
    { deviceTrust: 'unknown' },
  ]) {
    const result = truth({
      privacyState: 'active',
      records: [sensor({ state: 'active', ...overrides })],
      nowMs: NOW,
    });
    assert.equal(result.status, 'policy_violation');
  }
});

test('truth resolver never claims not observing when registry is empty stale unknown or unavailable', () => {
  assert.equal(
    truth({
      privacyState: 'privacy_lock',
      records: [],
      nowMs: NOW,
    }).status,
    'unverifiable',
  );

  for (const value of [
    sensor({
      verifiedAtMs: NOW - MAX_SENSOR_STATE_FRESHNESS_MS - 1,
    }),
    sensor({ state: 'unknown' }),
    sensor({ state: 'unavailable' }),
  ]) {
    const result = truth({
      privacyState: 'privacy_lock',
      records: [value],
      nowMs: NOW,
    });
    assert.equal(result.status, 'unverifiable');
    assert.equal(result.fullyVerified, false);
  }
});

test('untrusted input time cannot roll stale sensor evidence back into freshness', () => {
  const staleVerifiedAtMs = NOW - MAX_SENSOR_STATE_FRESHNESS_MS - 1;
  const result = evaluateObservationTruth(
    {
      privacyState: 'privacy_lock',
      records: [
        sensor({
          verifiedAtMs: staleVerifiedAtMs,
          lastTransitionAtMs: staleVerifiedAtMs,
        }),
      ],
      nowMs: staleVerifiedAtMs,
    },
    NOW,
  );

  assert.equal(result.status, 'unverifiable');
  assert.equal(result.fullyVerified, false);
  assert.deepEqual(result.unverifiableSensorIds, ['sens_aaaaaaaaaaaaaaaa']);
});

test('untrusted freshness override can narrow but never widen the reviewed truth window', () => {
  const widened = evaluateObservationTruth(
    {
      privacyState: 'privacy_lock',
      records: [sensor()],
      nowMs: NOW,
      maxFreshnessMs: MAX_SENSOR_STATE_FRESHNESS_MS + 1,
    },
    NOW,
  );
  assert.equal(widened.status, 'unverifiable');
  assert.equal(widened.fullyVerified, false);

  const narrowed = evaluateObservationTruth(
    {
      privacyState: 'privacy_lock',
      records: [
        sensor({
          verifiedAtMs: NOW - 101,
          lastTransitionAtMs: NOW - 101,
        }),
      ],
      nowMs: NOW,
      maxFreshnessMs: 100,
    },
    NOW,
  );
  assert.equal(narrowed.status, 'unverifiable');
});

test('truth resolver requires trusted evaluation time and strict unique sensor records', () => {
  const input = {
    privacyState: 'privacy_lock',
    records: [sensor()],
    nowMs: NOW,
  };

  assert.equal(evaluateObservationTruth(input).status, 'unverifiable');
  assert.equal(evaluateObservationTruth(input, Number.NaN).status, 'unverifiable');

  assert.equal(
    evaluateObservationTruth(
      {
        ...input,
        records: [{ ...sensor(), hiddenAuthority: true }],
      },
      NOW,
    ).status,
    'unverifiable',
  );

  assert.equal(
    evaluateObservationTruth(
      {
        ...input,
        records: [sensor(), sensor()],
      },
      NOW,
    ).status,
    'unverifiable',
  );
});

test('direct sensor interaction is distinguished from passive monitoring', () => {
  const result = truth({
    privacyState: 'privacy_lock',
    records: [
      sensor({
        type: 'microphone',
        state: 'active',
        usage: 'direct_interaction',
        featureId: 'voice.push_to_talk',
      }),
    ],
    nowMs: NOW,
  });

  assert.equal(result.status, 'direct_sensor_use_only');
  assert.equal(result.passiveObservationActive, false);
  assert.equal(result.directInteractionActive, true);
});

test('all-fresh inactive sensor state can truthfully report not_observing', () => {
  const result = truth({
    privacyState: 'privacy_lock',
    records: [sensor({ state: 'inactive' })],
    nowMs: NOW,
  });

  assert.equal(result.status, 'not_observing');
  assert.equal(result.fullyVerified, true);
  assert.equal(result.passiveObservationActive, false);
});
