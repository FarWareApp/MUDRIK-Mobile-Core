import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const sessionModule =
  loadTypeScriptModule(
    'src/core/orchestration/mediaSessionContract.ts',
  );

const transferModule =
  loadTypeScriptModule(
    'src/core/orchestration/mediaTransferPolicy.ts',
  );

const DEVICE_A =
  'dev_aaaaaaaaaaaaaaaa';
const DEVICE_B =
  'dev_bbbbbbbbbbbbbbbb';

function session(overrides = {}) {
  return {
    mediaSessionRef:
      'media_session_01',
    sourceDeviceId: DEVICE_A,
    revision: 4,
    transferGeneration: 2,
    mediaKind: 'video',
    appRef: 'app_youtube_01',
    contentRef:
      'content_video_01',
    positionMs: 42_000,
    playbackState: 'playing',
    observedAt: 1_000,
    expiresAt: 61_000,
    ...overrides,
  };
}

function intent(overrides = {}) {
  return {
    orchestrationSessionId:
      'orch_aaaaaaaaaaaaaaaa',
    intentId:
      'dmi_aaaaaaaaaaaaaaaa',
    sequence: 0,
    kind:
      'media.transfer_session',
    targetDeviceId: DEVICE_B,
    sourceDeviceId: DEVICE_A,
    mediaSessionRef:
      'media_session_01',
    expectedMediaRevision: 4,
    expectedTransferGeneration: 2,
    ...overrides,
  };
}

test(
  'media session snapshot is strict short lived state and carries zero authority',
  () => {
    const parsed =
      sessionModule
        .parseMediaSessionSnapshot(
          session(),
        );

    assert.ok(parsed);
    assert.equal(
      parsed.grantsInheritedAuthority,
      false,
    );

    for (const invalid of [
      {
        ...session(),
        permissions: ['media.control'],
      },
      session({
        mediaSessionRef:
          'media_token_secret',
      }),
      session({
        contentRef:
          'content_api_key_value',
      }),
      session({
        revision: 0,
      }),
      session({
        positionMs:
          Number.POSITIVE_INFINITY,
      }),
      session({
        expiresAt:
          1_000
          + 2 * 60 * 1000
          + 1,
      }),
    ]) {
      assert.equal(
        sessionModule
          .parseMediaSessionSnapshot(
            invalid,
          ),
        null,
      );
    }
  },
);

test(
  'media session freshness uses trusted time',
  () => {
    assert.equal(
      sessionModule
        .evaluateMediaSessionSnapshot(
          session(),
          2_000,
        ).reason,
      'accepted',
    );

    assert.equal(
      sessionModule
        .evaluateMediaSessionSnapshot(
          session({
            observedAt: 3_000,
            expiresAt: 63_000,
          }),
          2_000,
        ).reason,
      'future_session',
    );

    assert.equal(
      sessionModule
        .evaluateMediaSessionSnapshot(
          session({
            expiresAt: 2_000,
          }),
          2_000,
        ).reason,
      'stale_session',
    );
  },
);

test(
  'media transfer creates a reference-only next-generation manifest',
  () => {
    const decision =
      transferModule
        .evaluateMediaTransfer(
          intent(),
          session(),
          DEVICE_B,
          2_000,
        );

    assert.equal(
      decision.accepted,
      true,
    );
    assert.equal(
      decision.manifest
        .sourceDeviceId,
      DEVICE_A,
    );
    assert.equal(
      decision.manifest
        .targetDeviceId,
      DEVICE_B,
    );
    assert.equal(
      decision.manifest
        .fromTransferGeneration,
      2,
    );
    assert.equal(
      decision.manifest
        .toTransferGeneration,
      3,
    );
    assert.equal(
      decision.manifest
        .grantsInheritedAuthority,
      false,
    );
  },
);

test(
  'stale media revision or transfer generation cannot replay a transfer',
  () => {
    for (const stale of [
      intent({
        expectedMediaRevision: 3,
      }),
      intent({
        expectedTransferGeneration: 1,
      }),
    ]) {
      assert.equal(
        transferModule
          .evaluateMediaTransfer(
            stale,
            session(),
            DEVICE_B,
            2_000,
          ).reason,
        'stale_intent',
      );
    }
  },
);

test(
  'media transfer rejects forged source target mismatch and same-device transfer',
  () => {
    assert.equal(
      transferModule
        .evaluateMediaTransfer(
          intent({
            sourceDeviceId:
              'dev_cccccccccccccccc',
          }),
          session(),
          DEVICE_B,
          2_000,
        ).reason,
      'source_mismatch',
    );

    assert.equal(
      transferModule
        .evaluateMediaTransfer(
          intent({
            targetDeviceId:
              'dev_cccccccccccccccc',
          }),
          session(),
          DEVICE_B,
          2_000,
        ).reason,
      'target_mismatch',
    );

    assert.equal(
      transferModule
        .evaluateMediaTransfer(
          intent({
            targetDeviceId:
              DEVICE_A,
            sourceDeviceId: null,
          }),
          session(),
          DEVICE_A,
          2_000,
        ).reason,
      'same_device',
    );
  },
);

test(
  'stopped unknown stale and generation-exhausted media cannot transfer',
  () => {
    for (const playbackState of [
      'stopped',
      'unknown',
    ]) {
      assert.equal(
        transferModule
          .evaluateMediaTransfer(
            intent(),
            session({
              playbackState,
            }),
            DEVICE_B,
            2_000,
          ).reason,
        'session_not_transferable',
      );
    }

    assert.equal(
      transferModule
        .evaluateMediaTransfer(
          intent({
            expectedTransferGeneration:
              Number.MAX_SAFE_INTEGER,
          }),
          session({
            transferGeneration:
              Number.MAX_SAFE_INTEGER,
          }),
          DEVICE_B,
          2_000,
        ).reason,
      'generation_exhausted',
    );

    assert.equal(
      transferModule
        .evaluateMediaTransfer(
          intent(),
          session({
            expiresAt: 2_000,
          }),
          DEVICE_B,
          2_000,
        ).reason,
      'session_unavailable',
    );
  },
);
