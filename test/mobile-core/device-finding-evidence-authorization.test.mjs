import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const evidenceModule = loadTypeScriptModule(
  'src/core/deviceFinding/deviceFindingEvidenceAuthorization.ts',
);

const ACCOUNT =
  'acct_0123456789abcdef';
const TARGET =
  'dev_0123456789abcdef';
const COLLECTOR =
  'dev_fedcba9876543210';
const NOW = 10_000_000;

function trust(
  deviceId = COLLECTOR,
  state = 'active',
) {
  const isTarget =
    deviceId === TARGET;
  const suffix =
    isTarget
      ? '0123456789abcdef'
      : 'fedcba9876543210';
  const thumb =
    isTarget
      ? 'A'.repeat(43)
      : 'B'.repeat(43);

  return {
    device: {
      deviceId,
      accountId: ACCOUNT,
      deviceKeyId:
        `dkey_${suffix}`,
      publicKeyThumbprint: thumb,
      state,
      hardwareBacked: true,
    },
    expectedAccountId: ACCOUNT,
    expectedDeviceId: deviceId,
    expectedDeviceKeyId:
      `dkey_${suffix}`,
    expectedPublicKeyThumbprint:
      thumb,
  };
}

function signal(overrides = {}) {
  return {
    finderSessionId:
      'find_0123456789abcdef',
    signalId:
      'fds_0123456789abcdef',
    sequence: 0,
    targetDeviceId: TARGET,
    component: 'whole',
    kind: 'uwb',
    observedAtMs: NOW - 100,
    reliability: 0.95,
    precision: 'exact',
    roomRef: 'room_living001',
    zoneRef: null,
    furnitureRef: 'furn_chair0001',
    distanceMeters: 1.2,
    directionDegrees: 35,
    ...overrides,
  };
}

function sensorAuthorization(
  overrides = {},
) {
  return {
    privacyState: 'active',
    runtimeAvailability: 'available',
    permission: 'granted',
    deviceTrust: 'trusted',
    explicitUserRequest: true,
    ...overrides,
  };
}

function evidence(overrides = {}) {
  return {
    accountId: ACCOUNT,
    expectedTargetDeviceId: TARGET,
    collectorDeviceId: COLLECTOR,
    targetDeviceTrustInput:
      trust(TARGET),
    collectorDeviceTrustInput:
      trust(COLLECTOR),
    signal: signal(),
    sensorAuthorization:
      sensorAuthorization(),
    ...overrides,
  };
}

test(
  'trusted authorized current sensor evidence is accepted without granting authority',
  () => {
    const result =
      evidenceModule
        .authorizeDeviceFindingEvidence(
          evidence(),
          NOW,
        );

    assert.equal(result.accepted, true);
    assert.equal(result.reason, 'accepted');
    assert.equal(result.freshness, 'fresh');
    assert.equal(result.signal.kind, 'uwb');
    assert.equal(
      result.grantsAuthority,
      false,
    );
  },
);

test(
  'revoked or mismatched collector trust cannot authenticate locating evidence',
  () => {
    const revoked =
      evidenceModule
        .authorizeDeviceFindingEvidence(
          evidence({
            collectorDeviceTrustInput:
              trust(COLLECTOR, 'revoked'),
          }),
          NOW,
        );

    assert.equal(
      revoked.reason,
      'collector_untrusted',
    );

    const mismatched =
      evidenceModule
        .authorizeDeviceFindingEvidence(
          evidence({
            collectorDeviceTrustInput: {
              ...trust(COLLECTOR),
              expectedDeviceId: TARGET,
            },
          }),
          NOW,
        );

    assert.equal(
      mismatched.reason,
      'collector_untrusted',
    );
  },
);

test(
  'target revoked after resolution cannot continue locating evidence',
  () => {
    const revoked =
      evidenceModule
        .authorizeDeviceFindingEvidence(
          evidence({
            targetDeviceTrustInput:
              trust(
                TARGET,
                'revoked',
              ),
          }),
          NOW,
        );

    assert.equal(
      revoked.accepted,
      false,
    );
    assert.equal(
      revoked.reason,
      'target_untrusted',
    );
  },
);

test(
  'visual and spatial evidence require independently authorized sensor policy',
  () => {
    const visualSignal =
      signal({
        kind: 'visual',
      });

    for (const authorization of [
      null,
      sensorAuthorization({
        permission: 'denied',
      }),
      sensorAuthorization({
        deviceTrust: 'untrusted',
      }),
      sensorAuthorization({
        explicitUserRequest: false,
      }),
    ]) {
      const result =
        evidenceModule
          .authorizeDeviceFindingEvidence(
            evidence({
              signal: visualSignal,
              sensorAuthorization:
                authorization,
            }),
            NOW,
          );

      assert.equal(
        result.accepted,
        false,
      );
      assert.ok(
        result.reason
          === 'sensor_authorization_required'
        || result.reason
          === 'sensor_not_authorized',
      );
    }
  },
);

test(
  'signal target binding and hidden authorization fields fail closed',
  () => {
    const mismatch =
      evidenceModule
        .authorizeDeviceFindingEvidence(
          evidence({
            expectedTargetDeviceId:
              'dev_1111111111111111',
          }),
          NOW,
        );

    assert.equal(
      mismatch.reason,
      'target_mismatch',
    );

    const hostile =
      evidenceModule
        .authorizeDeviceFindingEvidence(
          {
            ...evidence(),
            inheritedToolScopes: [
              'terminal.execute',
            ],
          },
          NOW,
        );

    assert.equal(
      hostile.reason,
      'invalid_input',
    );

    const hostileSensor =
      evidenceModule
        .authorizeDeviceFindingEvidence(
          evidence({
            sensorAuthorization: {
              ...sensorAuthorization(),
              cameraToken: 'forbidden',
            },
          }),
          NOW,
        );

    assert.equal(
      hostileSensor.reason,
      'sensor_authorization_required',
    );
  },
);

test(
  'trusted external time rejects future and expired evidence',
  () => {
    const future =
      evidenceModule
        .authorizeDeviceFindingEvidence(
          evidence({
            signal: signal({
              observedAtMs: NOW + 1,
            }),
          }),
          NOW,
        );

    assert.equal(
      future.reason,
      'future_signal',
    );

    const expired =
      evidenceModule
        .authorizeDeviceFindingEvidence(
          evidence({
            signal: signal({
              kind:
                'bluetooth_proximity',
              precision: 'proximity',
              roomRef: null,
              furnitureRef: null,
              distanceMeters: 2,
              directionDegrees: null,
              observedAtMs:
                NOW - 20_000,
            }),
          }),
          NOW,
        );

    assert.equal(
      expired.reason,
      'expired_signal',
    );

    const invalidTime =
      evidenceModule
        .authorizeDeviceFindingEvidence(
          evidence(),
          Number.MAX_SAFE_INTEGER + 1,
        );

    assert.equal(
      invalidTime.reason,
      'invalid_time',
    );
  },
);

test(
  'non-sensor historical evidence is accepted only without fabricated sensor authorization',
  () => {
    const historicalSignal =
      signal({
        kind: 'last_seen',
        observedAtMs:
          NOW - 2 * 60_000,
      });

    const accepted =
      evidenceModule
        .authorizeDeviceFindingEvidence(
          evidence({
            signal: historicalSignal,
            sensorAuthorization: null,
          }),
          NOW,
        );

    assert.equal(
      accepted.accepted,
      true,
    );
    assert.equal(
      accepted.freshness,
      'historical',
    );

    const fabricated =
      evidenceModule
        .authorizeDeviceFindingEvidence(
          evidence({
            signal: historicalSignal,
            sensorAuthorization:
              sensorAuthorization(),
          }),
          NOW,
        );

    assert.equal(
      fabricated.reason,
      'invalid_input',
    );
  },
);
