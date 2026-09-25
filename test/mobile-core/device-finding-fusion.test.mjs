import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const fusionModule = loadTypeScriptModule(
  'src/core/deviceFinding/deviceFindingFusion.ts',
);

const ACCOUNT =
  'acct_0123456789abcdef';
const TARGET =
  'dev_0123456789abcdef';
const COLLECTOR =
  'dev_fedcba9876543210';
const SESSION =
  'find_0123456789abcdef';
const NOW = 10_000_000;

function trust() {
  return {
    device: {
      deviceId: COLLECTOR,
      accountId: ACCOUNT,
      deviceKeyId:
        'dkey_fedcba9876543210',
      publicKeyThumbprint:
        'B'.repeat(43),
      state: 'active',
      hardwareBacked: true,
    },
    expectedAccountId: ACCOUNT,
    expectedDeviceId: COLLECTOR,
    expectedDeviceKeyId:
      'dkey_fedcba9876543210',
    expectedPublicKeyThumbprint:
      'B'.repeat(43),
  };
}

function sensorAuthorization() {
  return {
    privacyState: 'active',
    runtimeAvailability: 'available',
    permission: 'granted',
    deviceTrust: 'trusted',
    explicitUserRequest: true,
  };
}

function signal(
  signalId,
  overrides = {},
) {
  return {
    finderSessionId: SESSION,
    signalId,
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

function requiresSensor(kind) {
  return [
    'uwb',
    'bluetooth_proximity',
    'wifi_presence',
    'visual',
    'spatial',
  ].includes(kind);
}

function evidence(
  signalId,
  overrides = {},
) {
  const nextSignal =
    signal(signalId, overrides.signal ?? {});
  const sensor =
    overrides.sensorAuthorization
      !== undefined
      ? overrides.sensorAuthorization
      : requiresSensor(nextSignal.kind)
        ? sensorAuthorization()
        : null;

  return {
    accountId: ACCOUNT,
    expectedTargetDeviceId: TARGET,
    collectorDeviceId: COLLECTOR,
    collectorDeviceTrustInput: trust(),
    signal: nextSignal,
    sensorAuthorization: sensor,
    ...overrides.envelope,
  };
}

function fusionInput(evidenceItems) {
  return {
    accountId: ACCOUNT,
    finderSessionId: SESSION,
    targetDeviceId: TARGET,
    component: 'whole',
    evidence: evidenceItems,
  };
}

test(
  'strong current UWB evidence can be confirmed without exceeding its own precision',
  () => {
    const result =
      fusionModule
        .fuseDeviceFindingEvidence(
          fusionInput([
            evidence(
              'fds_1111111111111111',
            ),
          ]),
          NOW,
        );

    assert.equal(
      result.status,
      'located',
    );
    assert.equal(
      result.confidence,
      'confirmed',
    );
    assert.equal(
      result.precision,
      'exact',
    );
    assert.equal(
      result.roomRef,
      'room_living001',
    );
    assert.equal(
      result.furnitureRef,
      'furn_chair0001',
    );
    assert.equal(
      result.grantsAuthority,
      false,
    );
  },
);

test(
  'two independent current kinds can corroborate only the precision they share',
  () => {
    const items = [
      evidence(
        'fds_2222222222222222',
        {
          signal: {
            kind: 'wifi_presence',
            reliability: 0.82,
            precision: 'room',
            roomRef:
              'room_living001',
            zoneRef: null,
            furnitureRef: null,
            distanceMeters: null,
            directionDegrees: null,
          },
        },
      ),
      evidence(
        'fds_3333333333333333',
        {
          signal: {
            kind: 'device_report',
            reliability: 0.88,
            precision: 'room',
            roomRef:
              'room_living001',
            zoneRef: null,
            furnitureRef: null,
            distanceMeters: null,
            directionDegrees: null,
          },
        },
      ),
    ];

    const result =
      fusionModule
        .fuseDeviceFindingEvidence(
          fusionInput(items),
          NOW,
        );

    assert.equal(
      result.confidence,
      'high',
    );
    assert.equal(
      result.precision,
      'room',
    );
    assert.equal(
      result.roomRef,
      'room_living001',
    );
    assert.equal(
      result.zoneRef,
      null,
    );
    assert.equal(
      result.furnitureRef,
      null,
    );
    assert.equal(
      result.distanceMeters,
      null,
    );
    assert.equal(
      result.directionDegrees,
      null,
    );
  },
);

test(
  'fusion is deterministic under evidence input reordering',
  () => {
    const items = [
      evidence(
        'fds_4444444444444444',
        {
          signal: {
            kind:
              'bluetooth_proximity',
            reliability: 0.8,
            precision: 'proximity',
            roomRef: null,
            zoneRef: null,
            furnitureRef: null,
            distanceMeters: 3,
            directionDegrees: null,
          },
        },
      ),
      evidence(
        'fds_5555555555555555',
        {
          signal: {
            kind: 'device_report',
            reliability: 0.81,
            precision: 'room',
            roomRef:
              'room_living001',
            zoneRef: null,
            furnitureRef: null,
            distanceMeters: null,
            directionDegrees: null,
          },
        },
      ),
    ];

    const forward =
      fusionModule
        .fuseDeviceFindingEvidence(
          fusionInput(items),
          NOW,
        );
    const reversed =
      fusionModule
        .fuseDeviceFindingEvidence(
          fusionInput(
            [...items].reverse(),
          ),
          NOW,
        );

    assert.deepEqual(
      forward,
      reversed,
    );
  },
);

test(
  'expired strong evidence cannot override weaker fresh evidence',
  () => {
    const result =
      fusionModule
        .fuseDeviceFindingEvidence(
          fusionInput([
            evidence(
              'fds_6666666666666666',
              {
                signal: {
                  observedAtMs:
                    NOW - 6_000,
                  reliability: 1,
                },
              },
            ),
            evidence(
              'fds_7777777777777777',
              {
                signal: {
                  kind:
                    'bluetooth_proximity',
                  observedAtMs:
                    NOW - 100,
                  reliability: 0.65,
                  precision:
                    'proximity',
                  roomRef: null,
                  zoneRef: null,
                  furnitureRef: null,
                  distanceMeters: 4,
                  directionDegrees: null,
                },
              },
            ),
          ]),
          NOW,
        );

    assert.equal(
      result.confidence,
      'medium',
    );
    assert.equal(
      result.precision,
      'proximity',
    );
    assert.deepEqual(
      result.supportingSignalIds,
      ['fds_7777777777777777'],
    );
  },
);

test(
  'reliable current room conflict fails closed instead of choosing a location',
  () => {
    const result =
      fusionModule
        .fuseDeviceFindingEvidence(
          fusionInput([
            evidence(
              'fds_8888888888888888',
              {
                signal: {
                  kind:
                    'wifi_presence',
                  reliability: 0.8,
                  precision: 'room',
                  roomRef:
                    'room_living001',
                  zoneRef: null,
                  furnitureRef: null,
                  distanceMeters: null,
                  directionDegrees: null,
                },
              },
            ),
            evidence(
              'fds_9999999999999999',
              {
                signal: {
                  kind:
                    'device_report',
                  reliability: 0.8,
                  precision: 'room',
                  roomRef:
                    'room_bedroom01',
                  zoneRef: null,
                  furnitureRef: null,
                  distanceMeters: null,
                  directionDegrees: null,
                },
              },
            ),
          ]),
          NOW,
        );

    assert.equal(
      result.status,
      'unknown',
    );
    assert.equal(
      result.confidence,
      'unknown',
    );
    assert.equal(
      result.precision,
      'unknown',
    );
    assert.equal(
      result.reason,
      'conflicting_evidence',
    );
  },
);

test(
  'historical last-seen remains visibly historical and never becomes current',
  () => {
    const result =
      fusionModule
        .fuseDeviceFindingEvidence(
          fusionInput([
            evidence(
              'fds_aaaaaaaaaaaaaaaa',
              {
                signal: {
                  kind: 'last_seen',
                  observedAtMs:
                    NOW - 2 * 60_000,
                  reliability: 0.9,
                },
              },
            ),
          ]),
          NOW,
        );

    assert.equal(
      result.status,
      'historical',
    );
    assert.equal(
      result.confidence,
      'low',
    );
    assert.equal(
      result.historical,
      true,
    );
    assert.equal(
      result.reason,
      'historical_only',
    );
  },
);

test(
  'unauthorized visual evidence is excluded and cannot improve a result',
  () => {
    const result =
      fusionModule
        .fuseDeviceFindingEvidence(
          fusionInput([
            evidence(
              'fds_bbbbbbbbbbbbbbbb',
              {
                signal: {
                  kind: 'visual',
                },
                sensorAuthorization: {
                  ...sensorAuthorization(),
                  permission: 'denied',
                },
              },
            ),
          ]),
          NOW,
        );

    assert.equal(
      result.status,
      'unknown',
    );
    assert.equal(
      result.reason,
      'insufficient_evidence',
    );
  },
);

test(
  'cross-session or account-mismatched evidence invalidates the fusion envelope',
  () => {
    const crossSession =
      fusionModule
        .fuseDeviceFindingEvidence(
          fusionInput([
            evidence(
              'fds_cccccccccccccccc',
              {
                signal: {
                  finderSessionId:
                    'find_fedcba9876543210',
                },
              },
            ),
          ]),
          NOW,
        );

    assert.equal(
      crossSession.status,
      'invalid_input',
    );

    const wrongAccount =
      fusionModule
        .fuseDeviceFindingEvidence(
          fusionInput([
            evidence(
              'fds_dddddddddddddddd',
              {
                envelope: {
                  accountId:
                    'acct_fedcba9876543210',
                },
              },
            ),
          ]),
          NOW,
        );

    assert.equal(
      wrongAccount.status,
      'invalid_input',
    );
  },
);
