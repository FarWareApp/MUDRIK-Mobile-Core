import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const disclosureModule = loadTypeScriptModule(
  'src/core/deviceFinding/deviceFindingDisclosurePolicy.ts',
);

const DEVICE =
  'dev_0123456789abcdef';

function surface(
  privacyClass,
  overrides = {},
) {
  const sharedSpace =
    privacyClass !== 'personal_private';

  return {
    surfaceId:
      'surf_0123456789abcdef',
    deviceId: DEVICE,
    kind: 'phone',
    privacyClass,
    capabilities: [
      'text',
      'audio_output',
    ],
    sharedSpace,
    ...overrides,
  };
}

function result(overrides = {}) {
  return {
    status: 'located',
    confidence: 'confirmed',
    precision: 'exact',
    roomRef: 'room_living001',
    zoneRef: 'zone_sofa0001',
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
  'personal private surface may receive the full evidenced device location',
  () => {
    const decision =
      disclosureModule
        .evaluateDeviceFindingDisclosure({
          surface:
            surface(
              'personal_private',
            ),
          result: result(),
          mode: 'text',
        });

    assert.equal(
      decision.allowed,
      true,
    );
    assert.equal(
      decision.precision,
      'exact',
    );
    assert.equal(
      decision.furnitureRef,
      'furn_chair0001',
    );
    assert.equal(
      decision.distanceMeters,
      1.2,
    );
  },
);

test(
  'personal shared space is downgraded to room precision',
  () => {
    const decision =
      disclosureModule
        .evaluateDeviceFindingDisclosure({
          surface:
            surface(
              'personal_shared_space',
            ),
          result: result(),
          mode: 'text',
        });

    assert.equal(
      decision.allowed,
      true,
    );
    assert.equal(
      decision.precision,
      'room',
    );
    assert.equal(
      decision.roomRef,
      'room_living001',
    );
    assert.equal(
      decision.zoneRef,
      null,
    );
    assert.equal(
      decision.furnitureRef,
      null,
    );
    assert.equal(
      decision.distanceMeters,
      null,
    );
    assert.equal(
      decision.reason,
      'downgraded_shared_surface',
    );
  },
);

test(
  'household shared surface receives only coarse proximity status',
  () => {
    const decision =
      disclosureModule
        .evaluateDeviceFindingDisclosure({
          surface:
            surface(
              'household_shared',
            ),
          result: result(),
          mode: 'audio_output',
        });

    assert.equal(
      decision.precision,
      'proximity',
    );
    assert.equal(
      decision.roomRef,
      null,
    );
    assert.equal(
      decision.distanceMeters,
      null,
    );
  },
);

test(
  'public or untrusted surface receives status only and no location detail',
  () => {
    const decision =
      disclosureModule
        .evaluateDeviceFindingDisclosure({
          surface:
            surface(
              'public_or_untrusted',
            ),
          result: result(),
          mode: 'text',
        });

    assert.equal(
      decision.allowed,
      true,
    );
    assert.equal(
      decision.precision,
      'unknown',
    );
    assert.equal(
      decision.roomRef,
      null,
    );
    assert.equal(
      decision.furnitureRef,
      null,
    );
    assert.equal(
      decision.reason,
      'status_only',
    );
  },
);

test(
  'surface presentation capability is independently required',
  () => {
    const decision =
      disclosureModule
        .evaluateDeviceFindingDisclosure({
          surface:
            surface(
              'personal_private',
              {
                capabilities: [
                  'text',
                ],
              },
            ),
          result: result(),
          mode: 'audio_output',
        });

    assert.equal(
      decision.allowed,
      false,
    );
    assert.equal(
      decision.reason,
      'surface_capability_missing',
    );
  },
);

test(
  'unknown result remains safe status-only on any valid surface',
  () => {
    const decision =
      disclosureModule
        .evaluateDeviceFindingDisclosure({
          surface:
            surface(
              'personal_private',
            ),
          result:
            result({
              status: 'unknown',
              confidence: 'unknown',
              precision: 'unknown',
              roomRef: null,
              zoneRef: null,
              furnitureRef: null,
              distanceMeters: null,
              directionDegrees: null,
              supportingSignalIds: [],
              historical: false,
              reason:
                'insufficient_evidence',
            }),
          mode: 'text',
        });

    assert.equal(
      decision.allowed,
      true,
    );
    assert.equal(
      decision.precision,
      'unknown',
    );
    assert.equal(
      decision.reason,
      'status_only',
    );
  },
);

test(
  'hidden result fields and inherited authority markers fail closed',
  () => {
    const hostile = [
      {
        ...result(),
        grantsAuthority: true,
      },
      {
        ...result(),
        preciseLocationToken:
          'forbidden',
      },
    ];

    for (const candidate of hostile) {
      const decision =
        disclosureModule
          .evaluateDeviceFindingDisclosure({
            surface:
              surface(
                'personal_private',
              ),
            result: candidate,
            mode: 'text',
          });

      assert.equal(
        decision.allowed,
        false,
      );
      assert.equal(
        decision.reason,
        'invalid_input',
      );
    }
  },
);
