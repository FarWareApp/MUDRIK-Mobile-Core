import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  buildPrivacyIndicators,
} = loadTypeScriptModule(
  'src/core/privacy/privacyIndicatorModel.ts',
);

function sensor(overrides = {}) {
  return {
    sensorId: 'sens_camera_primary_01',
    sourceDeviceId: 'dev_0123456789abcdef',
    type: 'camera',
    state: 'active',
    usage: 'passive_observation',
    permission: 'granted',
    deviceTrust: 'trusted',
    processing: 'local',
    retention: 'none',
    privacyScope: 'personal_private',
    featureId: 'privacy.camera',
    reason: 'active_for_test',
    sequence: 1,
    lastTransitionAtMs: 900,
    verifiedAtMs: 990,
    ...overrides,
  };
}

test('active allowed sensors become visible privacy indicators', () => {
  const result = buildPrivacyIndicators({
    privacyState: 'active',
    nowMs: 1000,
    records: [
      sensor(),
      sensor({
        sensorId: 'sens_microphone_main_01',
        type: 'microphone',
        processing: 'remote',
        retention: 'ephemeral',
      }),
    ],
  });

  assert.deepEqual(
    result.map((item) => [item.category, item.status]),
    [
      ['camera', 'active'],
      ['microphone', 'active'],
    ],
  );
});

test('camera active under privacy_lock is shown as policy violation', () => {
  const result = buildPrivacyIndicators({
    privacyState: 'privacy_lock',
    nowMs: 1000,
    records: [sensor()],
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].category, 'camera');
  assert.equal(result[0].status, 'policy_violation');
});

test('stale or unavailable sensor state is visible as unverifiable', () => {
  const result = buildPrivacyIndicators({
    privacyState: 'ambient_off',
    nowMs: 50_000,
    records: [
      sensor({
        sensorId: 'sens_location_main_01',
        type: 'location',
        state: 'active',
        verifiedAtMs: 1,
      }),
      sensor({
        sensorId: 'sens_health_stream_01',
        type: 'health',
        state: 'unavailable',
        verifiedAtMs: 49_999,
      }),
    ],
  });

  assert.deepEqual(
    result.map((item) => [item.category, item.status]),
    [
      ['health', 'unverifiable'],
      ['location', 'unverifiable'],
    ],
  );
});

test('direct user interaction can be active without changing passive privacy policy', () => {
  const result = buildPrivacyIndicators({
    privacyState: 'privacy_lock',
    nowMs: 1000,
    records: [
      sensor({
        sensorId: 'sens_microphone_direct_01',
        type: 'microphone',
        usage: 'direct_interaction',
      }),
    ],
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].category, 'microphone');
  assert.equal(result[0].status, 'active');
});

test('unauthorized active sensor is surfaced as policy violation', () => {
  const result = buildPrivacyIndicators({
    privacyState: 'active',
    nowMs: 1000,
    records: [
      sensor({
        permission: 'denied',
      }),
    ],
  });

  assert.equal(result[0].status, 'policy_violation');
});

test('inactive confirmed sensors do not create an active indicator', () => {
  const result = buildPrivacyIndicators({
    privacyState: 'active',
    nowMs: 1000,
    records: [sensor({ state: 'inactive' })],
  });

  assert.deepEqual(result, []);
});

test('malformed indicator input fails safely to an empty model', () => {
  for (const input of [
    null,
    [],
    { privacyState: 'admin', nowMs: 1, records: [] },
    { privacyState: 'active', nowMs: Number.NaN, records: [] },
    {
      privacyState: 'active',
      nowMs: 1,
      records: [],
      unexpectedAuthority: true,
    },
  ]) {
    assert.deepEqual(buildPrivacyIndicators(input), []);
  }
});
