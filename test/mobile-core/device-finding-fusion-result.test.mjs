import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const resultModule = loadTypeScriptModule(
  'src/core/deviceFinding/deviceFindingFusionResult.ts',
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
  'fusion result parser accepts a semantically consistent bounded result',
  () => {
    const parsed =
      resultModule
        .parseDeviceFindingFusionResult(
          result(),
        );

    assert.ok(parsed);
    assert.equal(
      parsed.confidence,
      'confirmed',
    );
    assert.equal(
      parsed.precision,
      'exact',
    );
  },
);

test(
  'fusion result parser rejects malformed spatial and signal identifiers',
  () => {
    for (const candidate of [
      result({
        roomRef: 'living room',
      }),
      result({
        furnitureRef:
          'chair<script>',
      }),
      result({
        supportingSignalIds: [
          'not-a-signal',
        ],
      }),
      result({
        supportingSignalIds: [
          'fds_0123456789abcdef',
          'fds_0123456789abcdef',
        ],
      }),
    ]) {
      assert.equal(
        resultModule
          .parseDeviceFindingFusionResult(
            candidate,
          ),
        null,
      );
    }
  },
);

test(
  'confidence and reason cannot contradict each other',
  () => {
    assert.equal(
      resultModule
        .parseDeviceFindingFusionResult(
          result({
            confidence: 'high',
          }),
        ),
      null,
    );

    assert.equal(
      resultModule
        .parseDeviceFindingFusionResult(
          result({
            reason:
              'corroborated_current_evidence',
          }),
        ),
      null,
    );
  },
);

test(
  'historical state cannot masquerade as a live located result',
  () => {
    const validHistorical =
      resultModule
        .parseDeviceFindingFusionResult(
          result({
            status: 'historical',
            confidence: 'low',
            historical: true,
            reason: 'historical_only',
          }),
        );

    assert.ok(validHistorical);

    assert.equal(
      resultModule
        .parseDeviceFindingFusionResult(
          result({
            status: 'located',
            historical: true,
          }),
        ),
      null,
    );
  },
);

test(
  'precision shape cannot contain finer hidden location detail',
  () => {
    for (const candidate of [
      result({
        confidence: 'medium',
        reason:
          'single_current_evidence',
        precision: 'room',
        zoneRef: null,
        furnitureRef:
          'furn_chair0001',
        distanceMeters: null,
        directionDegrees: null,
      }),
      result({
        confidence: 'medium',
        reason:
          'single_current_evidence',
        precision: 'proximity',
        roomRef:
          'room_living001',
        zoneRef: null,
        furnitureRef: null,
        distanceMeters: 3,
        directionDegrees: null,
      }),
      result({
        confidence: 'unknown',
        status: 'unknown',
        reason:
          'insufficient_evidence',
        precision: 'unknown',
        roomRef:
          'room_living001',
        zoneRef: null,
        furnitureRef: null,
        distanceMeters: null,
        directionDegrees: null,
        supportingSignalIds: [],
      }),
    ]) {
      assert.equal(
        resultModule
          .parseDeviceFindingFusionResult(
            candidate,
          ),
        null,
      );
    }
  },
);

test(
  'hidden fields and inherited authority are rejected',
  () => {
    assert.equal(
      resultModule
        .parseDeviceFindingFusionResult({
          ...result(),
          rawCoordinates: [
            1,
            2,
          ],
        }),
      null,
    );

    assert.equal(
      resultModule
        .parseDeviceFindingFusionResult(
          result({
            grantsAuthority: true,
          }),
        ),
      null,
    );
  },
);
