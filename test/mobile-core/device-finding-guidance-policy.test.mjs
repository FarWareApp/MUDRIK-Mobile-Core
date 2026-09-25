import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const guidanceModule = loadTypeScriptModule(
  'src/core/deviceFinding/deviceFindingGuidancePolicy.ts',
);

function result(overrides = {}) {
  return {
    status: 'located',
    confidence: 'confirmed',
    precision: 'exact',
    roomRef: 'room_living001',
    zoneRef: null,
    furnitureRef: 'furn_chair0001',
    distanceMeters: 1.2,
    directionDegrees: 35,
    supportingSignalIds: [
      'fds_0123456789abcdef',
    ],
    historical: false,
    reason:
      'confirmed_current_evidence',
    grantsAuthority: false,
    ...overrides,
  };
}

test(
  'directional guidance requires exact directional evidence',
  () => {
    const decision =
      guidanceModule
        .chooseDeviceFindingGuidance({
          result: result(),
          capabilities: [
            'direction',
            'distance',
          ],
        });

    assert.equal(
      decision.mode,
      'directional',
    );
    assert.equal(
      decision.precisionUsed,
      'exact',
    );
    assert.equal(
      decision.directionDegrees,
      35,
    );
    assert.equal(
      decision.grantsAuthority,
      false,
    );
  },
);

test(
  'distance guidance never invents direction',
  () => {
    const decision =
      guidanceModule
        .chooseDeviceFindingGuidance({
          result: result({
            precision: 'proximity',
            roomRef: null,
            furnitureRef: null,
            distanceMeters: 3.4,
            directionDegrees: null,
          }),
          capabilities: [
            'distance',
          ],
        });

    assert.equal(
      decision.mode,
      'distance',
    );
    assert.equal(
      decision.precisionUsed,
      'proximity',
    );
    assert.equal(
      decision.distanceMeters,
      3.4,
    );
    assert.equal(
      decision.directionDegrees,
      null,
    );
  },
);

test(
  'room navigation deliberately downgrades finer evidence to room precision',
  () => {
    const decision =
      guidanceModule
        .chooseDeviceFindingGuidance({
          result: result(),
          capabilities: [
            'room_navigation',
          ],
        });

    assert.equal(
      decision.mode,
      'room_navigation',
    );
    assert.equal(
      decision.precisionUsed,
      'room',
    );
    assert.equal(
      decision.roomRef,
      'room_living001',
    );
    assert.equal(
      decision.distanceMeters,
      null,
    );
    assert.equal(
      decision.directionDegrees,
      null,
    );
  },
);

test(
  'historical evidence never becomes live guidance',
  () => {
    const decision =
      guidanceModule
        .chooseDeviceFindingGuidance({
          result: result({
            status: 'historical',
            confidence: 'low',
            historical: true,
            reason: 'historical_only',
          }),
          capabilities: [
            'direction',
            'distance',
            'room_navigation',
            'proximity_trend',
          ],
        });

    assert.equal(
      decision.mode,
      'historical_recovery',
    );
    assert.equal(
      decision.live,
      false,
    );
    assert.equal(
      decision.directionDegrees,
      null,
    );
  },
);

test(
  'missing hardware support falls back to manual search without false precision',
  () => {
    const decision =
      guidanceModule
        .chooseDeviceFindingGuidance({
          result: result(),
          capabilities: [],
        });

    assert.equal(
      decision.mode,
      'manual_search',
    );
    assert.equal(
      decision.precisionUsed,
      'unknown',
    );
    assert.equal(
      decision.live,
      false,
    );
  },
);

test(
  'unknown result cannot generate live guidance',
  () => {
    const decision =
      guidanceModule
        .chooseDeviceFindingGuidance({
          result: result({
            status: 'unknown',
            confidence: 'unknown',
            precision: 'unknown',
            roomRef: null,
            zoneRef: null,
            furnitureRef: null,
            distanceMeters: null,
            directionDegrees: null,
            supportingSignalIds: [],
            reason:
              'insufficient_evidence',
          }),
          capabilities: [
            'proximity_trend',
          ],
        });

    assert.equal(
      decision.mode,
      'manual_search',
    );
    assert.equal(
      decision.reason,
      'insufficient_live_evidence',
    );
  },
);

test(
  'hidden capabilities and inherited authority fail closed',
  () => {
    const hiddenResult =
      guidanceModule
        .chooseDeviceFindingGuidance({
          result: {
            ...result(),
            grantsAuthority: true,
          },
          capabilities: [
            'direction',
          ],
        });

    assert.equal(
      hiddenResult.reason,
      'invalid_input',
    );

    const duplicateCapability =
      guidanceModule
        .chooseDeviceFindingGuidance({
          result: result(),
          capabilities: [
            'direction',
            'direction',
          ],
        });

    assert.equal(
      duplicateCapability.reason,
      'invalid_input',
    );
  },
);
