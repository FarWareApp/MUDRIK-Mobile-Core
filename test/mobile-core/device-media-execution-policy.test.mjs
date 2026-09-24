import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const executionModule =
  loadTypeScriptModule(
    'src/core/orchestration/deviceMediaExecutionPolicy.ts',
  );

const ACCOUNT =
  'acct_aaaaaaaaaaaaaaaa';
const DEVICE =
  'dev_aaaaaaaaaaaaaaaa';
const DEVICE_B =
  'dev_bbbbbbbbbbbbbbbb';
const KEY =
  'dkey_aaaaaaaaaaaaaaaa';
const THUMB = 'A'.repeat(43);

function intent(overrides = {}) {
  return {
    orchestrationSessionId:
      'orch_aaaaaaaaaaaaaaaa',
    intentId:
      'dmi_aaaaaaaaaaaaaaaa',
    sequence: 0,
    kind: 'media.play',
    targetDeviceId: DEVICE,
    ...overrides,
  };
}

function adapter(overrides = {}) {
  return {
    adapterId:
      'adapter_aaaaaaaaaaaaaaaa',
    deviceId: DEVICE,
    deviceClass: 'television',
    status: 'ready',
    supportedIntents: [
      'media.play',
      'media.pause',
      'app.open',
      'app.close',
    ],
    revision: 1,
    declaredAt: 1_000,
    expiresAt: 61_000,
    ...overrides,
  };
}

function trust(state = 'active') {
  return {
    device: {
      deviceId: DEVICE,
      accountId: ACCOUNT,
      deviceKeyId: KEY,
      publicKeyThumbprint: THUMB,
      state,
      hardwareBacked: true,
    },
    expectedAccountId: ACCOUNT,
    expectedDeviceId: DEVICE,
    expectedDeviceKeyId: KEY,
    expectedPublicKeyThumbprint: THUMB,
  };
}

function grant(
  capability = 'media.control',
  overrides = {},
) {
  return {
    grantId:
      'grant-device-media-01',
    subjectId: DEVICE,
    capability,
    ...overrides,
  };
}

function input(overrides = {}) {
  return {
    accountId: ACCOUNT,
    intent: intent(),
    resolvedDeviceId: DEVICE,
    resolvedAdapterId:
      'adapter_aaaaaaaaaaaaaaaa',
    adapter: adapter(),
    deviceTrustInput: trust(),
    capabilityGrants: [
      grant(),
    ],
    ...overrides,
  };
}

test(
  'execution requires current trust adapter support and an existing capability grant',
  () => {
    const decision =
      executionModule
        .evaluateDeviceMediaExecution(
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
      decision.capability,
      'media.control',
    );
    assert.equal(
      decision.grantId,
      'grant-device-media-01',
    );
    assert.equal(
      decision.grantsAuthority,
      false,
    );
  },
);

test(
  'device revocation after target resolution blocks execution',
  () => {
    const decision =
      executionModule
        .evaluateDeviceMediaExecution(
          input({
            deviceTrustInput:
              trust('revoked'),
          }),
          2_000,
        );

    assert.equal(
      decision.authorized,
      false,
    );
    assert.equal(
      decision.reason,
      'device_untrusted',
    );
  },
);

test(
  'missing wrong expired or revoked capability grants fail closed',
  () => {
    const cases = [
      [],
      [
        grant('app.open'),
      ],
      [
        grant(
          'media.control',
          {
            expiresAtMs: 2_000,
          },
        ),
      ],
      [
        grant(
          'media.control',
          {
            revokedAtMs: 1_500,
          },
        ),
      ],
    ];

    for (
      const capabilityGrants
      of cases
    ) {
      const decision =
        executionModule
          .evaluateDeviceMediaExecution(
            input({
              capabilityGrants,
            }),
            2_000,
          );

      assert.equal(
        decision.authorized,
        false,
      );
      assert.equal(
        decision.reason,
        'capability_denied',
      );
    }
  },
);

test(
  'target adapter identity cannot be swapped after resolution',
  () => {
    for (const changed of [
      input({
        resolvedDeviceId:
          DEVICE_B,
      }),
      input({
        resolvedAdapterId:
          'adapter_bbbbbbbbbbbbbbbb',
      }),
      input({
        intent: intent({
          targetDeviceId:
            DEVICE_B,
        }),
      }),
    ]) {
      const decision =
        executionModule
          .evaluateDeviceMediaExecution(
            changed,
            2_000,
          );

      assert.equal(
        decision.authorized,
        false,
      );
      assert.equal(
        decision.reason,
        'target_mismatch',
      );
    }
  },
);

test(
  'stale unavailable and unsupported adapters cannot execute',
  () => {
    assert.equal(
      executionModule
        .evaluateDeviceMediaExecution(
          input({
            adapter: adapter({
              expiresAt: 2_000,
            }),
          }),
          2_000,
        ).reason,
      'adapter_stale',
    );

    assert.equal(
      executionModule
        .evaluateDeviceMediaExecution(
          input({
            adapter: adapter({
              status: 'unavailable',
            }),
          }),
          2_000,
        ).reason,
      'adapter_unavailable',
    );

    assert.equal(
      executionModule
        .evaluateDeviceMediaExecution(
          input({
            adapter: adapter({
              supportedIntents: [
                'app.open',
              ],
            }),
          }),
          2_000,
        ).reason,
      'unsupported_intent',
    );
  },
);

test(
  'media transfer is forced through its specialized dual-device policy path',
  () => {
    const decision =
      executionModule
        .evaluateDeviceMediaExecution(
          input({
            intent: {
              orchestrationSessionId:
                'orch_aaaaaaaaaaaaaaaa',
              intentId:
                'dmi_aaaaaaaaaaaaaaaa',
              sequence: 0,
              kind:
                'media.transfer_session',
              targetDeviceId: DEVICE,
              sourceDeviceId:
                DEVICE_B,
              mediaSessionRef:
                'media_session_01',
              expectedMediaRevision: 1,
              expectedTransferGeneration: 0,
            },
          }),
          2_000,
        );

    assert.equal(
      decision.authorized,
      false,
    );
    assert.equal(
      decision.reason,
      'specialized_policy_required',
    );
  },
);

test(
  'hidden execution authority and invalid trusted time are rejected',
  () => {
    assert.equal(
      executionModule
        .evaluateDeviceMediaExecution(
          {
            ...input(),
            adminOverride: true,
          },
          2_000,
        ).reason,
      'invalid_input',
    );

    assert.equal(
      executionModule
        .evaluateDeviceMediaExecution(
          input(),
          Number.NaN,
        ).reason,
      'invalid_input',
    );
  },
);
