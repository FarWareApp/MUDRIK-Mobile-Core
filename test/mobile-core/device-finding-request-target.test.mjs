import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const requestModule = loadTypeScriptModule(
  'src/core/deviceFinding/deviceFindingRequest.ts',
);
const registryModule = loadTypeScriptModule(
  'src/core/deviceFinding/deviceFindingRequestRegistry.ts',
);
const targetModule = loadTypeScriptModule(
  'src/core/deviceFinding/deviceFindingTargetResolver.ts',
);
const capabilityModule = loadTypeScriptModule(
  'src/core/deviceFinding/deviceFindingCapability.ts',
);
const securityCapabilities = loadTypeScriptModule(
  'src/core/security/capabilities.ts',
);
const riskModule = loadTypeScriptModule(
  'src/core/security/capabilityRisk.ts',
);

const ACCOUNT = 'acct_0123456789abcdef';
const OTHER_ACCOUNT = 'acct_fedcba9876543210';
const DEVICE_A = 'dev_0123456789abcdef';
const DEVICE_B = 'dev_fedcba9876543210';

function request(overrides = {}) {
  return {
    finderSessionId:
      'find_0123456789abcdef',
    requestId:
      'fdr_0123456789abcdef',
    sequence: 0,
    kind: 'device.locate',
    targetDeviceId: null,
    targetAlias: 'سماعتي',
    component: 'whole',
    ...overrides,
  };
}

function trust(
  deviceId,
  {
    accountId = ACCOUNT,
    state = 'active',
  } = {},
) {
  const suffix =
    deviceId === DEVICE_A
      ? '0123456789abcdef'
      : 'fedcba9876543210';

  const thumb =
    deviceId === DEVICE_A
      ? 'A'.repeat(43)
      : 'B'.repeat(43);

  return {
    device: {
      deviceId,
      accountId,
      deviceKeyId: `dkey_${suffix}`,
      publicKeyThumbprint: thumb,
      state,
      hardwareBacked: true,
    },
    expectedAccountId: accountId,
    expectedDeviceId: deviceId,
    expectedDeviceKeyId:
      `dkey_${suffix}`,
    expectedPublicKeyThumbprint: thumb,
  };
}
function candidate(
  deviceId = DEVICE_A,
  overrides = {},
) {
  return {
    deviceId,
    aliases: ['سماعتي', 'earbuds'],
    components: [
      'whole',
      'left',
      'right',
      'case',
    ],
    supportedActions: [
      'locate',
      'ring',
      'guidance',
    ],
    onlineState: 'online',
    deviceTrustInput:
      trust(deviceId),
    ...overrides,
  };
}

test(
  'device finding request is strict normalized and requires exactly one target selector',
  () => {
    const parsed =
      requestModule
        .parseDeviceFindingRequest(
          request({
            targetAlias:
              '  MY   Earbuds ',
          }),
        );

    assert.ok(parsed);
    assert.equal(
      parsed.targetAlias,
      'my earbuds',
    );

    for (const invalid of [
      request({
        targetDeviceId: DEVICE_A,
      }),
      request({
        targetDeviceId: null,
        targetAlias: null,
      }),
      request({
        sequence:
          Number.MAX_SAFE_INTEGER + 1,
      }),
      request({
        component: 'person',
      }),
      {
        ...request(),
        permissions: ['all'],
      },
    ]) {
      assert.equal(
        requestModule
          .parseDeviceFindingRequest(
            invalid,
          ),
        null,
      );
    }
  },
);

test(
  'device finding uses dedicated least privilege capabilities',
  () => {
    assert.equal(
      capabilityModule
        .capabilityForDeviceFindingRequest(
          'device.locate',
        ),
      'device.locate',
    );
    assert.equal(
      capabilityModule
        .capabilityForDeviceFindingRequest(
          'device.guidance',
        ),
      'device.locate',
    );
    assert.equal(
      capabilityModule
        .capabilityForDeviceFindingRequest(
          'device.ring',
        ),
      'device.ring',
    );

    assert.equal(
      securityCapabilities
        .isCapabilityId(
          'device.locate',
        ),
      true,
    );
    assert.equal(
      securityCapabilities
        .isCapabilityId(
          'device.ring',
        ),
      true,
    );
    assert.equal(
      riskModule.getCapabilityRisk(
        'device.locate',
      ),
      'high',
    );
    assert.equal(
      riskModule.getCapabilityRisk(
        'device.ring',
      ),
      'medium',
    );
  },
);
test(
  'request registry enforces exact sequencing idempotence conflicts and replay rejection',
  () => {
    const registry =
      new registryModule
        .DeviceFindingRequestRegistry();

    assert.equal(
      registry.apply(request()).reason,
      'accepted',
    );

    assert.equal(
      registry.apply(request()).reason,
      'duplicate',
    );

    assert.equal(
      registry.apply(
        request({
          targetAlias: 'هاتف',
        }),
      ).reason,
      'sequence_conflict',
    );

    assert.equal(
      registry.apply(
        request({
          requestId:
            'fdr_1111111111111111',
          sequence: 2,
        }),
      ).reason,
      'sequence_gap',
    );

    assert.equal(
      registry.apply(
        request({
          requestId:
            'fdr_1111111111111111',
          sequence: 1,
        }),
      ).reason,
      'accepted',
    );

    assert.equal(
      registry.apply(
        request({
          requestId:
            'fdr_0123456789abcdef',
          sequence: 2,
        }),
      ).reason,
      'request_replay',
    );

    assert.equal(
      registry.apply(
        request({
          requestId:
            'fdr_2222222222222222',
          sequence: 0,
        }),
      ).reason,
      'stale_sequence',
    );
  },
);
test(
  'trusted alias and explicit device resolution never create authority',
  () => {
    const alias =
      targetModule
        .resolveDeviceFindingTarget({
          accountId: ACCOUNT,
          request: request(),
          candidates: [candidate()],
        });

    assert.equal(
      alias.reason,
      'selected_by_alias',
    );
    assert.equal(
      alias.selectedDeviceId,
      DEVICE_A,
    );
    assert.equal(
      alias.requiredCapability,
      'device.locate',
    );
    assert.equal(
      alias.grantsAuthority,
      false,
    );

    const explicit =
      targetModule
        .resolveDeviceFindingTarget({
          accountId: ACCOUNT,
          request: request({
            targetDeviceId: DEVICE_A,
            targetAlias: null,
          }),
          candidates: [candidate()],
        });

    assert.equal(
      explicit.reason,
      'selected_by_device_id',
    );
  },
);

test(
  'ambiguous aliases require clarification independent of candidate order',
  () => {
    const candidates = [
      candidate(DEVICE_A),
      candidate(DEVICE_B, {
        aliases: ['سماعتي'],
      }),
    ];

    for (const ordered of [
      candidates,
      [...candidates].reverse(),
    ]) {
      const resolved =
        targetModule
          .resolveDeviceFindingTarget({
            accountId: ACCOUNT,
            request: request(),
            candidates: ordered,
          });

      assert.equal(
        resolved.reason,
        'clarification_required',
      );
      assert.equal(
        resolved.selectedDeviceId,
        null,
      );
    }
  },
);
test(
  'revoked account-mismatched offline-ring and unsupported component targets fail closed',
  () => {
    const cases = [
      candidate(DEVICE_A, {
        deviceTrustInput:
          trust(DEVICE_A, {
            state: 'revoked',
          }),
      }),
      candidate(DEVICE_A, {
        deviceTrustInput:
          trust(DEVICE_A, {
            accountId:
              OTHER_ACCOUNT,
          }),
      }),
      candidate(DEVICE_A, {
        onlineState: 'offline',
      }),
      candidate(DEVICE_A, {
        components: ['whole'],
      }),
    ];

    const requests = [
      request(),
      request(),
      request({
        kind: 'device.ring',
      }),
      request({
        component: 'right',
      }),
    ];

    for (let index = 0;
      index < cases.length;
      index += 1) {
      const resolved =
        targetModule
          .resolveDeviceFindingTarget({
            accountId: ACCOUNT,
            request: requests[index],
            candidates: [cases[index]],
          });

      assert.equal(
        resolved.reason,
        'target_ineligible',
      );
      assert.equal(
        resolved.selectedDeviceId,
        null,
      );
    }
  },
);

test(
  'explicit target never falls back and hidden candidate authority is rejected',
  () => {
    const noFallback =
      targetModule
        .resolveDeviceFindingTarget({
          accountId: ACCOUNT,
          request: request({
            targetDeviceId: DEVICE_A,
            targetAlias: null,
            kind: 'device.ring',
          }),
          candidates: [
            candidate(DEVICE_A, {
              onlineState: 'offline',
            }),
            candidate(DEVICE_B),
          ],
        });

    assert.equal(
      noFallback.reason,
      'target_ineligible',
    );

    const hostile =
      targetModule
        .resolveDeviceFindingTarget({
          accountId: ACCOUNT,
          request: request(),
          candidates: [{
            ...candidate(),
            toolScopes: ['terminal.execute'],
          }],
        });

    assert.equal(
      hostile.reason,
      'invalid_input',
    );
  },
);
