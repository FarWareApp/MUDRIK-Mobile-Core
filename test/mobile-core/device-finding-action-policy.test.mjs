import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const actionModule = loadTypeScriptModule(
  'src/core/deviceFinding/deviceFindingActionPolicy.ts',
);
const adapterModule = loadTypeScriptModule(
  'src/core/deviceFinding/deviceFindingAdapterContract.ts',
);

const ACCOUNT =
  'acct_0123456789abcdef';
const DEVICE =
  'dev_0123456789abcdef';
const OTHER_DEVICE =
  'dev_fedcba9876543210';
const NOW = 10_000_000;

function request(overrides = {}) {
  return {
    finderSessionId:
      'find_0123456789abcdef',
    requestId:
      'fdr_0123456789abcdef',
    sequence: 0,
    kind: 'device.ring',
    targetDeviceId: DEVICE,
    targetAlias: null,
    component: 'whole',
    ...overrides,
  };
}

function adapter(overrides = {}) {
  return {
    adapterId:
      'findad_0123456789abcdef',
    deviceId: DEVICE,
    status: 'ready',
    supportedActions: [
      'ring',
      'vibrate',
      'flash',
      'wake',
    ],
    revision: 1,
    declaredAt: NOW - 1_000,
    expiresAt: NOW + 60_000,
    ...overrides,
  };
}

function trust(state = 'active') {
  return {
    device: {
      deviceId: DEVICE,
      accountId: ACCOUNT,
      deviceKeyId:
        'dkey_0123456789abcdef',
      publicKeyThumbprint:
        'A'.repeat(43),
      state,
      hardwareBacked: true,
    },
    expectedAccountId: ACCOUNT,
    expectedDeviceId: DEVICE,
    expectedDeviceKeyId:
      'dkey_0123456789abcdef',
    expectedPublicKeyThumbprint:
      'A'.repeat(43),
  };
}

function grant(
  capability = 'device.ring',
  overrides = {},
) {
  return {
    grantId: 'grant-device-ring',
    subjectId: DEVICE,
    capability,
    scope: {
      resourceId: DEVICE,
    },
    expiresAtMs: NOW + 30_000,
    ...overrides,
  };
}

function input(overrides = {}) {
  return {
    accountId: ACCOUNT,
    request: request(),
    resolvedDeviceId: DEVICE,
    adapter: adapter(),
    deviceTrustInput: trust(),
    capabilityGrants: [grant()],
    action: 'ring',
    ...overrides,
  };
}

test(
  'locate adapter descriptor is strict bounded and carries zero authority',
  () => {
    const parsed =
      adapterModule
        .parseDeviceFindingAdapterDescriptor(
          adapter(),
        );

    assert.ok(parsed);
    assert.equal(
      parsed.grantsAuthority,
      false,
    );

    for (const invalid of [
      adapter({
        revision: 0,
      }),
      adapter({
        declaredAt:
          Number.MAX_SAFE_INTEGER + 1,
      }),
      adapter({
        expiresAt:
          NOW + 10 * 60_000,
      }),
      adapter({
        supportedActions: [
          'ring',
          'ring',
        ],
      }),
      {
        ...adapter(),
        shellCommand: 'wake-all',
      },
    ]) {
      assert.equal(
        adapterModule
          .parseDeviceFindingAdapterDescriptor(
            invalid,
          ),
        null,
      );
    }
  },
);

test(
  'ring execution rechecks current trust capability adapter and exact target',
  () => {
    const result =
      actionModule
        .evaluateDeviceFindingAction(
          input(),
          NOW,
        );

    assert.equal(
      result.authorized,
      true,
    );
    assert.equal(
      result.reason,
      'authorized',
    );
    assert.equal(
      result.capability,
      'device.ring',
    );
    assert.equal(
      result.deviceId,
      DEVICE,
    );
    assert.equal(
      result.grantsAuthority,
      false,
    );
  },
);

test(
  'locate or generic device control grants cannot substitute for device ring authority',
  () => {
    for (const capability of [
      'device.locate',
      'device.control',
    ]) {
      const result =
        actionModule
          .evaluateDeviceFindingAction(
            input({
              capabilityGrants: [
                grant(capability),
              ],
            }),
            NOW,
          );

      assert.equal(
        result.authorized,
        false,
      );
      assert.equal(
        result.reason,
        'capability_denied',
      );
    }
  },
);

test(
  'device revoked after target resolution is denied at action execution time',
  () => {
    const result =
      actionModule
        .evaluateDeviceFindingAction(
          input({
            deviceTrustInput:
              trust('revoked'),
          }),
          NOW,
        );

    assert.equal(
      result.authorized,
      false,
    );
    assert.equal(
      result.reason,
      'device_untrusted',
    );
  },
);

test(
  'expired grant is denied using trusted execution time even if request metadata is unchanged',
  () => {
    const result =
      actionModule
        .evaluateDeviceFindingAction(
          input({
            capabilityGrants: [
              grant(
                'device.ring',
                {
                  expiresAtMs:
                    NOW - 1,
                },
              ),
            ],
          }),
          NOW,
        );

    assert.equal(
      result.authorized,
      false,
    );
    assert.equal(
      result.reason,
      'capability_denied',
    );
  },
);

test(
  'non-ring request cannot trigger an active locate side effect',
  () => {
    const result =
      actionModule
        .evaluateDeviceFindingAction(
          input({
            request: request({
              kind: 'device.locate',
            }),
          }),
          NOW,
        );

    assert.equal(
      result.reason,
      'active_action_not_requested',
    );
  },
);

test(
  'target mismatch stale unavailable and unsupported adapters fail closed',
  () => {
    const cases = [
      [
        input({
          resolvedDeviceId:
            OTHER_DEVICE,
        }),
        'target_mismatch',
      ],
      [
        input({
          adapter: adapter({
            status: 'unavailable',
          }),
        }),
        'adapter_unavailable',
      ],
      [
        input({
          adapter: adapter({
            expiresAt: NOW,
          }),
        }),
        'adapter_stale',
      ],
      [
        input({
          adapter: adapter({
            supportedActions: [
              'vibrate',
            ],
          }),
        }),
        'unsupported_action',
      ],
    ];

    for (const [
      candidate,
      reason,
    ] of cases) {
      const result =
        actionModule
          .evaluateDeviceFindingAction(
            candidate,
            NOW,
          );

      assert.equal(
        result.authorized,
        false,
      );
      assert.equal(
        result.reason,
        reason,
      );
    }
  },
);

test(
  'vibrate flash and wake remain active locate cues under the same dedicated ring grant',
  () => {
    for (const action of [
      'vibrate',
      'flash',
      'wake',
    ]) {
      const result =
        actionModule
          .evaluateDeviceFindingAction(
            input({ action }),
            NOW,
          );

      assert.equal(
        result.authorized,
        true,
      );
      assert.equal(
        result.capability,
        'device.ring',
      );
    }
  },
);

test(
  'hidden authority fields and invalid trusted time are rejected',
  () => {
    const hostile =
      actionModule
        .evaluateDeviceFindingAction(
          {
            ...input(),
            inheritedAuthority: true,
          },
          NOW,
        );

    assert.equal(
      hostile.reason,
      'invalid_input',
    );

    const invalidTime =
      actionModule
        .evaluateDeviceFindingAction(
          input(),
          Number.MAX_SAFE_INTEGER + 1,
        );

    assert.equal(
      invalidTime.reason,
      'invalid_input',
    );
  },
);
