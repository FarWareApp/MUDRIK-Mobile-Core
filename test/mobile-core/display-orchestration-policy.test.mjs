import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const layoutModule =
  loadTypeScriptModule(
    'src/core/orchestration/displayLayoutContract.ts',
  );

const placementModule =
  loadTypeScriptModule(
    'src/core/orchestration/companionPlacementPolicy.ts',
  );

const privacyModule =
  loadTypeScriptModule(
    'src/core/orchestration/displayPrivacyPolicy.ts',
  );

function layout(overrides = {}) {
  return {
    viewportWidth: 1_000,
    viewportHeight: 600,
    companionWidth: 200,
    companionHeight: 120,
    currentPlacement: null,
    preferredPlacement: null,
    reducedMotion: false,
    reservedRegions: [],
    ...overrides,
  };
}

function region(overrides = {}) {
  return {
    regionId:
      'region_aaaaaaaa',
    x: 700,
    y: 400,
    width: 300,
    height: 200,
    importance: 'critical',
    ...overrides,
  };
}

function surface(
  privacyClass = 'personal_private',
  overrides = {},
) {
  return {
    surfaceId:
      'surf_aaaaaaaaaaaaaaaa',
    deviceId:
      'dev_aaaaaaaaaaaaaaaa',
    kind: 'television',
    privacyClass,
    capabilities: [
      'text',
      'audio_output',
      'avatar',
      'private_audio',
    ],
    sharedSpace:
      privacyClass
        !== 'personal_private',
    ...overrides,
  };
}

test(
  'layout metadata is bounded and cannot grant screen capture authority',
  () => {
    const parsed =
      layoutModule
        .parseDisplayLayoutSnapshot(
          layout(),
        );

    assert.ok(parsed);
    assert.equal(
      parsed.grantsScreenCaptureAuthority,
      false,
    );

    for (const invalid of [
      {
        ...layout(),
        screenCapturePermission:
          true,
      },
      layout({
        viewportWidth: 0,
      }),
      layout({
        reservedRegions: [
          region({
            x: 900,
            width: 200,
          }),
        ],
      }),
      layout({
        reservedRegions: [
          region(),
          region(),
        ],
      }),
    ]) {
      assert.equal(
        layoutModule
          .parseDisplayLayoutSnapshot(
            invalid,
          ),
        null,
      );
    }
  },
);

test(
  'placement avoids reserved content and uses deterministic safe fallback',
  () => {
    const decision =
      placementModule
        .decideCompanionPlacement(
          layout({
            reservedRegions: [
              region(),
            ],
          }),
        );

    assert.equal(
      decision.placement,
      'bottom_left',
    );
    assert.equal(
      decision.reason,
      'safe_reposition',
    );
    assert.equal(
      decision.requiresVisionAuthority,
      false,
    );
  },
);

test(
  'safe current placement stays stable and preferred hidden or minimal is respected',
  () => {
    const current =
      placementModule
        .decideCompanionPlacement(
          layout({
            currentPlacement:
              'top_left',
          }),
        );

    assert.equal(
      current.placement,
      'top_left',
    );
    assert.equal(
      current.reason,
      'current_kept',
    );
    assert.equal(
      current.automaticMovement,
      false,
    );

    const hidden =
      placementModule
        .decideCompanionPlacement(
          layout({
            currentPlacement:
              'top_left',
            preferredPlacement:
              'hidden',
          }),
        );

    assert.equal(
      hidden.placement,
      'hidden',
    );
    assert.equal(
      hidden.animate,
      false,
    );

    const minimal =
      placementModule
        .decideCompanionPlacement(
          layout({
            preferredPlacement:
              'minimal',
          }),
        );

    assert.equal(
      minimal.placement,
      'minimal',
    );
  },
);

test(
  'reduced motion permits necessary repositioning without animation',
  () => {
    const decision =
      placementModule
        .decideCompanionPlacement(
          layout({
            currentPlacement:
              'bottom_right',
            reducedMotion: true,
            reservedRegions: [
              region(),
            ],
          }),
        );

    assert.equal(
      decision.placement,
      'bottom_left',
    );
    assert.equal(
      decision.automaticMovement,
      true,
    );
    assert.equal(
      decision.animate,
      false,
    );
  },
);

test(
  'fully occupied layout falls back to minimal presentation',
  () => {
    const decision =
      placementModule
        .decideCompanionPlacement(
          layout({
            reservedRegions: [
              region({
                x: 0,
                y: 0,
                width: 1_000,
                height: 600,
              }),
            ],
          }),
        );

    assert.equal(
      decision.placement,
      'minimal',
    );
    assert.equal(
      decision.reason,
      'minimal_fallback',
    );
  },
);

test(
  'display privacy never widens Section 07 presentation authority',
  () => {
    const denied =
      privacyModule
        .evaluateDisplayPrivacy({
          surface:
            surface(),
          presencePresentationAuthorized:
            false,
          contentSensitivity:
            'public',
          requestedModes: [
            'text',
            'audio_output',
          ],
        });

    assert.deepEqual(
      denied.allowedModes,
      [],
    );
    assert.equal(
      denied.reason,
      'presence_not_authorized',
    );
    assert.equal(
      denied.grantsAdditionalDisclosureAuthority,
      false,
    );
  },
);

test(
  'sensitive and private content is suppressed on insufficiently private surfaces',
  () => {
    const sensitiveShared =
      privacyModule
        .evaluateDisplayPrivacy({
          surface:
            surface(
              'personal_shared_space',
            ),
          presencePresentationAuthorized:
            true,
          contentSensitivity:
            'sensitive',
          requestedModes: [
            'text',
          ],
        });

    assert.equal(
      sensitiveShared.reason,
      'privacy_suppressed',
    );

    const privateHousehold =
      privacyModule
        .evaluateDisplayPrivacy({
          surface:
            surface(
              'household_shared',
            ),
          presencePresentationAuthorized:
            true,
          contentSensitivity:
            'private',
          requestedModes: [
            'text',
          ],
        });

    assert.equal(
      privateHousehold.reason,
      'privacy_suppressed',
    );

    const privatePublic =
      privacyModule
        .evaluateDisplayPrivacy({
          surface:
            surface(
              'public_or_untrusted',
            ),
          presencePresentationAuthorized:
            true,
          contentSensitivity:
            'private',
          requestedModes: [
            'avatar',
          ],
        });

    assert.equal(
      privatePublic.reason,
      'privacy_suppressed',
    );
  },
);

test(
  'shared private audio requires private-audio capability and can partially suppress modes',
  () => {
    const decision =
      privacyModule
        .evaluateDisplayPrivacy({
          surface:
            surface(
              'personal_shared_space',
              {
                capabilities: [
                  'text',
                  'audio_output',
                  'avatar',
                ],
              },
            ),
          presencePresentationAuthorized:
            true,
          contentSensitivity:
            'private',
          requestedModes: [
            'text',
            'audio_output',
          ],
        });

    assert.deepEqual(
      decision.allowedModes,
      ['text'],
    );
    assert.equal(
      decision.reason,
      'partially_allowed',
    );
  },
);

test(
  'public content may use supported modes on a manually authorized public surface',
  () => {
    const decision =
      privacyModule
        .evaluateDisplayPrivacy({
          surface:
            surface(
              'public_or_untrusted',
              {
                capabilities: [
                  'text',
                  'audio_output',
                  'avatar',
                ],
              },
            ),
          presencePresentationAuthorized:
            true,
          contentSensitivity:
            'public',
          requestedModes: [
            'text',
            'avatar',
          ],
        });

    assert.deepEqual(
      decision.allowedModes,
      [
        'text',
        'avatar',
      ],
    );
    assert.equal(
      decision.reason,
      'allowed',
    );
  },
);
