import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const adapterModule =
  loadTypeScriptModule(
    'src/core/orchestration/deviceMediaAdapterContract.ts',
  );

const resolverModule =
  loadTypeScriptModule(
    'src/core/orchestration/deviceMediaTargetResolver.ts',
  );

const ACCOUNT =
  'acct_aaaaaaaaaaaaaaaa';
const DEVICE_A =
  'dev_aaaaaaaaaaaaaaaa';
const DEVICE_B =
  'dev_bbbbbbbbbbbbbbbb';
const KEY_A =
  'dkey_aaaaaaaaaaaaaaaa';
const KEY_B =
  'dkey_bbbbbbbbbbbbbbbb';
const THUMB_A = 'A'.repeat(43);
const THUMB_B = 'B'.repeat(43);

function adapter(
  deviceId = DEVICE_A,
  overrides = {},
) {
  return {
    adapterId:
      deviceId === DEVICE_A
        ? 'adapter_aaaaaaaaaaaaaaaa'
        : 'adapter_bbbbbbbbbbbbbbbb',
    deviceId,
    deviceClass:
      deviceId === DEVICE_A
        ? 'phone'
        : 'television',
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

function trust(
  deviceId = DEVICE_A,
  state = 'active',
) {
  const key =
    deviceId === DEVICE_A
      ? KEY_A
      : KEY_B;
  const thumb =
    deviceId === DEVICE_A
      ? THUMB_A
      : THUMB_B;

  return {
    device: {
      deviceId,
      accountId: ACCOUNT,
      deviceKeyId: key,
      publicKeyThumbprint: thumb,
      state,
      hardwareBacked: true,
    },
    expectedAccountId: ACCOUNT,
    expectedDeviceId: deviceId,
    expectedDeviceKeyId: key,
    expectedPublicKeyThumbprint: thumb,
  };
}

function intent(
  overrides = {},
) {
  return {
    orchestrationSessionId:
      'orch_aaaaaaaaaaaaaaaa',
    intentId:
      'dmi_aaaaaaaaaaaaaaaa',
    sequence: 0,
    kind: 'media.play',
    targetDeviceId: null,
    ...overrides,
  };
}

function candidate(
  deviceId = DEVICE_A,
  overrides = {},
) {
  return {
    adapter: adapter(deviceId),
    deviceTrustInput:
      trust(deviceId),
    deviceActive: false,
    recentDirectInteraction: false,
    explicitRoomMatch: false,
    ...overrides,
  };
}

function input(
  overrides = {},
) {
  return {
    accountId: ACCOUNT,
    intent: intent(),
    currentPrimaryDeviceId: null,
    activeMediaDeviceId: null,
    recentlyAddressedDeviceId: null,
    candidates: [
      candidate(),
    ],
    ...overrides,
  };
}

test(
  'adapter descriptor is strict bounded support metadata and never authority',
  () => {
    const parsed =
      adapterModule
        .parseDeviceMediaAdapterDescriptor(
          adapter(),
        );

    assert.ok(parsed);
    assert.equal(
      parsed.grantsAuthority,
      false,
    );
    assert.equal(
      Object.isFrozen(
        parsed.supportedIntents,
      ),
      true,
    );

    for (const invalid of [
      {
        ...adapter(),
        token: 'forbidden',
      },
      adapter(DEVICE_A, {
        supportedIntents: [
          'media.play',
          'media.play',
        ],
      }),
      adapter(DEVICE_A, {
        supportedIntents: [
          'root.everything',
        ],
      }),
      adapter(DEVICE_A, {
        revision: 0,
      }),
      adapter(DEVICE_A, {
        expiresAt:
          1_000 + 5 * 60 * 1000 + 1,
      }),
    ]) {
      assert.equal(
        adapterModule
          .parseDeviceMediaAdapterDescriptor(
            invalid,
          ),
        null,
      );
    }
  },
);

test(
  'explicit trusted supported target wins without creating authority',
  () => {
    const decision =
      resolverModule
        .resolveDeviceMediaTarget(
          input({
            intent: intent({
              targetDeviceId: DEVICE_A,
            }),
          }),
          2_000,
        );

    assert.equal(
      decision.selectedDeviceId,
      DEVICE_A,
    );
    assert.equal(
      decision.reason,
      'explicit_target_selected',
    );
    assert.equal(
      decision.requiredCapability,
      'media.control',
    );
    assert.equal(
      decision.grantsAuthority,
      false,
    );
  },
);

test(
  'explicit target never falls back to another device when ineligible',
  () => {
    const decision =
      resolverModule
        .resolveDeviceMediaTarget(
          input({
            intent: intent({
              targetDeviceId: DEVICE_A,
            }),
            candidates: [
              candidate(
                DEVICE_A,
                {
                  deviceTrustInput:
                    trust(
                      DEVICE_A,
                      'revoked',
                    ),
                },
              ),
              candidate(DEVICE_B),
            ],
          }),
          2_000,
        );

    assert.equal(
      decision.selectedDeviceId,
      null,
    );
    assert.equal(
      decision.reason,
      'explicit_target_ineligible',
    );
  },
);

test(
  'revoked unavailable stale future and unsupported candidates are ineligible',
  () => {
    const cases = [
      candidate(DEVICE_A, {
        deviceTrustInput:
          trust(
            DEVICE_A,
            'revoked',
          ),
      }),
      candidate(DEVICE_A, {
        adapter:
          adapter(
            DEVICE_A,
            {
              status:
                'unavailable',
            },
          ),
      }),
      candidate(DEVICE_A, {
        adapter:
          adapter(
            DEVICE_A,
            {
              expiresAt: 2_000,
            },
          ),
      }),
      candidate(DEVICE_A, {
        adapter:
          adapter(
            DEVICE_A,
            {
              declaredAt: 3_000,
              expiresAt: 63_000,
            },
          ),
      }),
      candidate(DEVICE_A, {
        adapter:
          adapter(
            DEVICE_A,
            {
              supportedIntents: [
                'app.open',
              ],
            },
          ),
      }),
    ];

    for (const c of cases) {
      const decision =
        resolverModule
          .resolveDeviceMediaTarget(
            input({
              candidates: [c],
            }),
            2_000,
          );

      assert.equal(
        decision.selectedDeviceId,
        null,
      );
      assert.equal(
        decision.reason,
        'no_eligible_target',
      );
    }
  },
);

test(
  'context ranks eligible trusted devices deterministically',
  () => {
    const a = candidate(
      DEVICE_A,
      {
        deviceActive: true,
      },
    );
    const b = candidate(
      DEVICE_B,
      {
        explicitRoomMatch: true,
      },
    );

    const first =
      resolverModule
        .resolveDeviceMediaTarget(
          input({
            activeMediaDeviceId:
              DEVICE_B,
            currentPrimaryDeviceId:
              DEVICE_A,
            candidates: [a, b],
          }),
          2_000,
        );

    const second =
      resolverModule
        .resolveDeviceMediaTarget(
          input({
            activeMediaDeviceId:
              DEVICE_B,
            currentPrimaryDeviceId:
              DEVICE_A,
            candidates: [b, a],
          }),
          2_000,
        );

    assert.equal(
      first.selectedDeviceId,
      DEVICE_B,
    );
    assert.equal(
      second.selectedDeviceId,
      DEVICE_B,
    );
    assert.equal(
      first.reason,
      'context_target_selected',
    );
  },
);

test(
  'materially tied contextual targets require clarification instead of guessing',
  () => {
    const decision =
      resolverModule
        .resolveDeviceMediaTarget(
          input({
            candidates: [
              candidate(DEVICE_B),
              candidate(DEVICE_A),
            ],
          }),
          2_000,
        );

    assert.equal(
      decision.selectedDeviceId,
      null,
    );
    assert.equal(
      decision.reason,
      'clarification_required',
    );
  },
);

test(
  'duplicate device candidates and hidden resolver fields fail closed',
  () => {
    const duplicate =
      resolverModule
        .resolveDeviceMediaTarget(
          input({
            candidates: [
              candidate(DEVICE_A),
              candidate(
                DEVICE_A,
                {
                  adapter:
                    adapter(
                      DEVICE_A,
                      {
                        adapterId:
                          'adapter_cccccccccccccccc',
                      },
                    ),
                },
              ),
            ],
          }),
          2_000,
        );

    assert.equal(
      duplicate.reason,
      'invalid_input',
    );

    const hidden =
      resolverModule
        .resolveDeviceMediaTarget(
          {
            ...input(),
            toolScopes: ['*'],
          },
          2_000,
        );

    assert.equal(
      hidden.reason,
      'invalid_input',
    );
  },
);

test(
  'resolver uses trusted evaluation time and rejects invalid clocks',
  () => {
    const invalid =
      resolverModule
        .resolveDeviceMediaTarget(
          input(),
          Number.NaN,
        );

    assert.equal(
      invalid.reason,
      'invalid_input',
    );

    const rollbackAttempt =
      resolverModule
        .resolveDeviceMediaTarget(
          input({
            candidates: [
              candidate(
                DEVICE_A,
                {
                  adapter:
                    adapter(
                      DEVICE_A,
                      {
                        declaredAt:
                          5_000,
                        expiresAt:
                          65_000,
                      },
                    ),
                },
              ),
            ],
          }),
          2_000,
        );

    assert.equal(
      rollbackAttempt.reason,
      'no_eligible_target',
    );
  },
);
