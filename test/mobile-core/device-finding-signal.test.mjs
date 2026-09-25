import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const signalModule = loadTypeScriptModule(
  'src/core/deviceFinding/deviceFindingSignal.ts',
);
const registryModule = loadTypeScriptModule(
  'src/core/deviceFinding/deviceFindingSignalRegistry.ts',
);

const SESSION = 'find_0123456789abcdef';
const OTHER_SESSION = 'find_fedcba9876543210';
const DEVICE = 'dev_0123456789abcdef';
const NOW = 10_000_000;

function signal(overrides = {}) {
  return {
    finderSessionId: SESSION,
    signalId: 'fds_0123456789abcdef',
    sequence: 0,
    targetDeviceId: DEVICE,
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

test(
  'device finding signal parser is exact bounded and rejects raw or hidden payloads',
  () => {
    assert.ok(
      signalModule
        .parseDeviceFindingSignal(
          signal(),
        ),
    );

    for (const invalid of [
      signal({
        observedAtMs:
          Number.MAX_SAFE_INTEGER + 1,
      }),
      signal({
        reliability: Number.NaN,
      }),
      signal({
        reliability: 1.1,
      }),
      signal({
        directionDegrees: 360,
      }),
      signal({
        kind:
          'bluetooth_proximity',
        precision: 'room',
        roomRef:
          'room_living001',
        furnitureRef: null,
      }),
      signal({
        precision: 'furniture',
        roomRef: null,
      }),
      {
        ...signal(),
        rawSamples: [1, 2, 3],
      },
      {
        ...signal(),
        apiKey: 'forbidden',
      },
    ]) {
      assert.equal(
        signalModule
          .parseDeviceFindingSignal(
            invalid,
          ),
        null,
      );
    }
  },
);

test(
  'trusted evaluation time rejects future and expired current evidence',
  () => {
    const parsed =
      signalModule
        .parseDeviceFindingSignal(
          signal(),
        );

    assert.equal(
      signalModule
        .evaluateDeviceFindingSignalTime(
          parsed,
          NOW,
        ).freshness,
      'fresh',
    );

    assert.equal(
      signalModule
        .evaluateDeviceFindingSignalTime(
          parsed,
          null,
        ).freshness,
      'invalid_time',
    );

    const future =
      signalModule
        .parseDeviceFindingSignal(
          signal({
            observedAtMs:
              NOW + 1,
          }),
        );

    assert.equal(
      signalModule
        .evaluateDeviceFindingSignalTime(
          future,
          NOW,
        ).freshness,
      'future',
    );

    const staleBluetooth =
      signalModule
        .parseDeviceFindingSignal(
          signal({
            kind:
              'bluetooth_proximity',
            precision: 'proximity',
            roomRef: null,
            furnitureRef: null,
            distanceMeters: 3,
            directionDegrees: null,
            observedAtMs:
              NOW - 20_000,
          }),
        );

    assert.equal(
      signalModule
        .evaluateDeviceFindingSignalTime(
          staleBluetooth,
          NOW,
        ).freshness,
      'expired',
    );
  },
);

test(
  'last seen evidence remains explicitly historical within bounded retention',
  () => {
    const historical =
      signalModule
        .parseDeviceFindingSignal(
          signal({
            kind: 'last_seen',
            observedAtMs:
              NOW - 2 * 60_000,
          }),
        );

    const evaluated =
      signalModule
        .evaluateDeviceFindingSignalTime(
          historical,
          NOW,
        );

    assert.equal(
      evaluated.accepted,
      true,
    );
    assert.equal(
      evaluated.freshness,
      'historical',
    );
    assert.equal(
      evaluated.ageMs,
      2 * 60_000,
    );
  },
);

test(
  'signal registry enforces monotonic sequences exact duplicate idempotence and conflicts',
  () => {
    const registry =
      new registryModule
        .DeviceFindingSignalRegistry();

    assert.equal(
      registry.apply(
        signal(),
        NOW,
      ).reason,
      'accepted',
    );

    assert.equal(
      registry.apply(
        signal(),
        NOW,
      ).reason,
      'duplicate',
    );

    assert.equal(
      registry.apply(
        signal({
          reliability: 0.5,
        }),
        NOW,
      ).reason,
      'sequence_conflict',
    );

    assert.equal(
      registry.apply(
        signal({
          sequence: 2,
        }),
        NOW,
      ).reason,
      'sequence_gap',
    );

    assert.equal(
      registry.apply(
        signal({
          sequence: 1,
          observedAtMs: NOW,
        }),
        NOW,
      ).reason,
      'accepted',
    );

    assert.equal(
      registry.apply(
        signal({
          sequence: 0,
        }),
        NOW,
      ).reason,
      'stale_sequence',
    );
  },
);

test(
  'signal id cannot be replayed across finder sessions or rebound to another target',
  () => {
    const registry =
      new registryModule
        .DeviceFindingSignalRegistry();

    assert.equal(
      registry.apply(
        signal(),
        NOW,
      ).accepted,
      true,
    );

    assert.equal(
      registry.apply(
        signal({
          finderSessionId:
            OTHER_SESSION,
        }),
        NOW,
      ).reason,
      'cross_session_replay',
    );

    assert.equal(
      registry.apply(
        signal({
          targetDeviceId:
            'dev_fedcba9876543210',
        }),
        NOW,
      ).reason,
      'signal_binding_conflict',
    );
  },
);

test(
  'historical evidence cannot be silently converted into fresh registry truth',
  () => {
    const registry =
      new registryModule
        .DeviceFindingSignalRegistry();

    const result =
      registry.apply(
        signal({
          kind: 'last_seen',
          observedAtMs:
            NOW - 3 * 60_000,
        }),
        NOW,
      );

    assert.equal(
      result.accepted,
      true,
    );
    assert.equal(
      result.freshness,
      'historical',
    );

    const stored =
      registry.getLast(
        'fds_0123456789abcdef',
      );

    assert.equal(
      stored.freshness,
      'historical',
    );
  },
);
