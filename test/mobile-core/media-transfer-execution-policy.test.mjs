import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const executionModule =
  loadTypeScriptModule(
    'src/core/orchestration/mediaTransferExecutionPolicy.ts',
  );

const ACCOUNT =
  'acct_aaaaaaaaaaaaaaaa';
const SOURCE =
  'dev_aaaaaaaaaaaaaaaa';
const TARGET =
  'dev_bbbbbbbbbbbbbbbb';
const SOURCE_KEY =
  'dkey_aaaaaaaaaaaaaaaa';
const TARGET_KEY =
  'dkey_bbbbbbbbbbbbbbbb';
const SOURCE_THUMB = 'A'.repeat(43);
const TARGET_THUMB = 'B'.repeat(43);

function intent(overrides = {}) {
  return {
    orchestrationSessionId:
      'orch_aaaaaaaaaaaaaaaa',
    intentId:
      'dmi_aaaaaaaaaaaaaaaa',
    sequence: 0,
    kind:
      'media.transfer_session',
    targetDeviceId: TARGET,
    sourceDeviceId: SOURCE,
    mediaSessionRef:
      'media_session_01',
    expectedMediaRevision: 4,
    expectedTransferGeneration: 2,
    ...overrides,
  };
}

function session(overrides = {}) {
  return {
    mediaSessionRef:
      'media_session_01',
    sourceDeviceId: SOURCE,
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

function adapter(
  deviceId,
  overrides = {},
) {
  return {
    adapterId:
      deviceId === SOURCE
        ? 'adapter_aaaaaaaaaaaaaaaa'
        : 'adapter_bbbbbbbbbbbbbbbb',
    deviceId,
    deviceClass:
      deviceId === SOURCE
        ? 'phone'
        : 'television',
    status: 'ready',
    supportedIntents: [
      'media.transfer_session',
      'media.play',
    ],
    revision: 1,
    declaredAt: 1_000,
    expiresAt: 61_000,
    ...overrides,
  };
}

function trust(
  deviceId,
  state = 'active',
) {
  const source =
    deviceId === SOURCE;

  return {
    device: {
      deviceId,
      accountId: ACCOUNT,
      deviceKeyId:
        source
          ? SOURCE_KEY
          : TARGET_KEY,
      publicKeyThumbprint:
        source
          ? SOURCE_THUMB
          : TARGET_THUMB,
      state,
      hardwareBacked: true,
    },
    expectedAccountId: ACCOUNT,
    expectedDeviceId: deviceId,
    expectedDeviceKeyId:
      source
        ? SOURCE_KEY
        : TARGET_KEY,
    expectedPublicKeyThumbprint:
      source
        ? SOURCE_THUMB
        : TARGET_THUMB,
  };
}

function grant(
  deviceId,
  overrides = {},
) {
  return {
    grantId:
      deviceId === SOURCE
        ? 'grant-transfer-source'
        : 'grant-transfer-target',
    subjectId: deviceId,
    capability:
      'media.transfer',
    ...overrides,
  };
}

function input(overrides = {}) {
  return {
    accountId: ACCOUNT,
    intent: intent(),
    session: session(),
    resolvedTargetDeviceId: TARGET,
    sourceAdapter:
      adapter(SOURCE),
    targetAdapter:
      adapter(TARGET),
    sourceDeviceTrustInput:
      trust(SOURCE),
    targetDeviceTrustInput:
      trust(TARGET),
    capabilityGrants: [
      grant(SOURCE),
      grant(TARGET),
    ],
    ...overrides,
  };
}

test(
  'media transfer execution requires independent grants on both trusted devices',
  () => {
    const decision =
      executionModule
        .evaluateMediaTransferExecution(
          input(),
          2_000,
        );

    assert.equal(
      decision.authorized,
      true,
    );
    assert.equal(
      decision.reason,
      'authorized',
    );
    assert.equal(
      decision.sourceGrantId,
      'grant-transfer-source',
    );
    assert.equal(
      decision.targetGrantId,
      'grant-transfer-target',
    );
    assert.equal(
      decision.manifest
        .grantsInheritedAuthority,
      false,
    );
    assert.equal(
      decision.grantsAuthority,
      false,
    );
  },
);

test(
  'revocation of either device after resolution blocks media transfer',
  () => {
    const sourceRevoked =
      executionModule
        .evaluateMediaTransferExecution(
          input({
            sourceDeviceTrustInput:
              trust(
                SOURCE,
                'revoked',
              ),
          }),
          2_000,
        );

    assert.equal(
      sourceRevoked.reason,
      'device_untrusted',
    );

    const targetRevoked =
      executionModule
        .evaluateMediaTransferExecution(
          input({
            targetDeviceTrustInput:
              trust(
                TARGET,
                'revoked',
              ),
          }),
          2_000,
        );

    assert.equal(
      targetRevoked.reason,
      'device_untrusted',
    );
  },
);

test(
  'media transfer denies when either device lacks transfer capability grant',
  () => {
    const noSource =
      executionModule
        .evaluateMediaTransferExecution(
          input({
            capabilityGrants: [
              grant(TARGET),
            ],
          }),
          2_000,
        );

    assert.equal(
      noSource.reason,
      'source_capability_denied',
    );

    const noTarget =
      executionModule
        .evaluateMediaTransferExecution(
          input({
            capabilityGrants: [
              grant(SOURCE),
            ],
          }),
          2_000,
        );

    assert.equal(
      noTarget.reason,
      'target_capability_denied',
    );
  },
);

test(
  'adapter mismatch unsupported transfer and stale adapters fail closed',
  () => {
    assert.equal(
      executionModule
        .evaluateMediaTransferExecution(
          input({
            sourceAdapter:
              adapter(TARGET),
          }),
          2_000,
        ).reason,
      'adapter_mismatch',
    );

    assert.equal(
      executionModule
        .evaluateMediaTransferExecution(
          input({
            targetAdapter:
              adapter(
                TARGET,
                {
                  supportedIntents: [
                    'media.play',
                  ],
                },
              ),
          }),
          2_000,
        ).reason,
      'unsupported_transfer',
    );

    assert.equal(
      executionModule
        .evaluateMediaTransferExecution(
          input({
            sourceAdapter:
              adapter(
                SOURCE,
                {
                  expiresAt: 2_000,
                },
              ),
          }),
          2_000,
        ).reason,
      'adapter_stale',
    );
  },
);

test(
  'stale transfer intent is rejected before execution authorization',
  () => {
    const decision =
      executionModule
        .evaluateMediaTransferExecution(
          input({
            intent: intent({
              expectedMediaRevision: 3,
            }),
          }),
          2_000,
        );

    assert.equal(
      decision.authorized,
      false,
    );
    assert.equal(
      decision.reason,
      'transfer_rejected',
    );
  },
);
