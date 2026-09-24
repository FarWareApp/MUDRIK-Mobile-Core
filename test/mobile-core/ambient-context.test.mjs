import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const ambientModule =
  loadTypeScriptModule(
    'src/core/orchestration/ambientContext.ts',
  );

const DEVICE_A =
  'dev_aaaaaaaaaaaaaaaa';
const DEVICE_B =
  'dev_bbbbbbbbbbbbbbbb';

function context(overrides = {}) {
  return {
    orchestrationSessionId:
      'orch_aaaaaaaaaaaaaaaa',
    sequence: 0,
    observedAt: 1_000,
    expiresAt: 61_000,
    roomRef: 'room_living_01',
    timeOfDay: 'evening',
    lightingLevel: 35,
    lightingSceneRef:
      'scene_relax_01',
    activeDisplayDeviceId:
      DEVICE_A,
    activeAudioDeviceId:
      DEVICE_B,
    recentMediaCategoryRef:
      'category_music_01',
    currentRoutineRef:
      'routine_evening_01',
    householdQuietMode: false,
    presenceConfidence: 90,
    manualMoodPresetRef:
      'preset_relax_01',
    ...overrides,
  };
}

test(
  'ambient context is ephemeral non-authoritative context and never an emotion assertion',
  () => {
    const parsed =
      ambientModule
        .parseAmbientContext(
          context(),
        );

    assert.ok(parsed);
    assert.equal(
      parsed.persistByDefault,
      false,
    );
    assert.equal(
      parsed.grantsMemoryAuthority,
      false,
    );
    assert.equal(
      parsed.assertsEmotion,
      false,
    );
    assert.equal(
      Object.isFrozen(parsed),
      true,
    );
  },
);

test(
  'ambient context rejects inferred emotion authority and hidden fields',
  () => {
    for (const invalid of [
      {
        ...context(),
        inferredEmotion: 'sad',
      },
      {
        ...context(),
        mentalState: 'focused',
      },
      {
        ...context(),
        memoryPermission: true,
      },
      {
        ...context(),
        toolScopes: ['*'],
      },
    ]) {
      assert.equal(
        ambientModule
          .parseAmbientContext(
            invalid,
          ),
        null,
      );
    }
  },
);

test(
  'ambient context bounds TTL confidence lighting timestamps and device identities',
  () => {
    for (const invalid of [
      context({
        expiresAt:
          1_000
          + 15 * 60 * 1000
          + 1,
      }),
      context({
        observedAt:
          Number.MAX_SAFE_INTEGER
          + 1,
      }),
      context({
        lightingLevel: 101,
      }),
      context({
        presenceConfidence:
          Number.NaN,
      }),
      context({
        activeDisplayDeviceId:
          'device_fake',
      }),
    ]) {
      assert.equal(
        ambientModule
          .parseAmbientContext(
            invalid,
          ),
        null,
      );
    }
  },
);

test(
  'ambient references reject credential or executable shaped values',
  () => {
    for (const invalid of [
      context({
        roomRef:
          'room_token_secret',
      }),
      context({
        lightingSceneRef:
          'scene_api_key_value',
      }),
      context({
        currentRoutineRef:
          'routine_secret_value',
      }),
      context({
        manualMoodPresetRef:
          'preset_token_value',
      }),
    ]) {
      assert.equal(
        ambientModule
          .parseAmbientContext(
            invalid,
          ),
        null,
      );
    }
  },
);

test(
  'ambient freshness uses trusted evaluation time and fails closed for future or stale data',
  () => {
    assert.equal(
      ambientModule
        .evaluateAmbientContext(
          context(),
          2_000,
        ).reason,
      'accepted',
    );

    assert.equal(
      ambientModule
        .evaluateAmbientContext(
          context({
            observedAt: 3_000,
            expiresAt: 63_000,
          }),
          2_000,
        ).reason,
      'future_context',
    );

    assert.equal(
      ambientModule
        .evaluateAmbientContext(
          context({
            expiresAt: 2_000,
          }),
          2_000,
        ).reason,
      'stale_context',
    );

    assert.equal(
      ambientModule
        .evaluateAmbientContext(
          context(),
          Number.NaN,
        ).reason,
      'invalid_evaluation_time',
    );
  },
);

test(
  'ambient context accepts absent optional signals without inventing them',
  () => {
    const parsed =
      ambientModule
        .parseAmbientContext(
          context({
            roomRef: null,
            lightingLevel: null,
            lightingSceneRef: null,
            activeDisplayDeviceId:
              null,
            activeAudioDeviceId:
              null,
            recentMediaCategoryRef:
              null,
            currentRoutineRef: null,
            presenceConfidence: null,
            manualMoodPresetRef:
              null,
            timeOfDay: 'unknown',
          }),
        );

    assert.ok(parsed);
    assert.equal(
      parsed.roomRef,
      null,
    );
    assert.equal(
      parsed.assertsEmotion,
      false,
    );
  },
);
