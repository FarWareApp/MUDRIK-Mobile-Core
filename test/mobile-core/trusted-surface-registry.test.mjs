import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  TrustedSurfaceRegistry,
} = loadTypeScriptModule(
  'src/core/presence/trustedSurfaceRegistry.ts',
);

const ACCOUNT = 'acct_aaaaaaaaaaaaaaaa';
const DEVICE = 'dev_aaaaaaaaaaaaaaaa';
const KEY = 'dkey_aaaaaaaaaaaaaaaa';
const SURFACE = 'surf_aaaaaaaaaaaaaaaa';
const THUMB = 'A'.repeat(43);

function descriptor(overrides = {}) {
  return {
    surfaceId: SURFACE,
    deviceId: DEVICE,
    kind: 'phone',
    privacyClass: 'personal_private',
    capabilities: ['text', 'audio_output'],
    sharedSpace: false,
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

function registration(overrides = {}) {
  return {
    accountId: ACCOUNT,
    surface: descriptor(),
    revision: 1,
    approvedAt: 1_000,
    explicitUserApproval: true,
    deviceTrustInput: trust(),
    ...overrides,
  };
}

test(
  'trusted surface registration requires explicit user approval and active device trust',
  () => {
    const registry = new TrustedSurfaceRegistry();

    assert.equal(
      registry.register(
        registration({
          explicitUserApproval: false,
        }),
      ).reason,
      'explicit_approval_required',
    );

    assert.equal(
      registry.register(
        registration({
          deviceTrustInput: trust('revoked'),
        }),
      ).reason,
      'device_not_trusted',
    );

    assert.equal(
      registry.register(
        registration(),
      ).reason,
      'accepted',
    );

    assert.ok(
      registry.getActiveSurface(
        SURFACE,
        ACCOUNT,
      ),
    );
  },
);

test(
  'surface registration revision is strictly monotonic',
  () => {
    const registry = new TrustedSurfaceRegistry();
    registry.register(registration());

    assert.equal(
      registry.register(
        registration({ revision: 1 }),
      ).reason,
      'stale_revision',
    );

    assert.equal(
      registry.register(
        registration({ revision: 3 }),
      ).reason,
      'revision_gap',
    );

    assert.equal(
      registry.register(
        registration({
          revision: 2,
          surface: descriptor({
            privacyClass:
              'personal_shared_space',
            sharedSpace: true,
          }),
        }),
      ).reason,
      'accepted',
    );

    assert.equal(
      registry.getRecord(SURFACE)
        .surface.privacyClass,
      'personal_shared_space',
    );
  },
);

test(
  'revoked surface is unavailable and cannot be revived by stale registration',
  () => {
    const registry = new TrustedSurfaceRegistry();
    registry.register(registration());

    assert.equal(
      registry.revoke(SURFACE, 2).reason,
      'accepted',
    );
    assert.equal(
      registry.getActiveSurface(
        SURFACE,
        ACCOUNT,
      ),
      null,
    );

    assert.equal(
      registry.register(
        registration({ revision: 2 }),
      ).reason,
      'stale_revision',
    );
  },
);

test(
  'registration rejects hidden fields and device binding mismatch',
  () => {
    const registry = new TrustedSurfaceRegistry();

    assert.equal(
      registry.register({
        ...registration(),
        extra: true,
      }).reason,
      'invalid_registration',
    );

    assert.equal(
      registry.register(
        registration({
          surface: descriptor({
            deviceId:
              'dev_bbbbbbbbbbbbbbbb',
          }),
        }),
      ).reason,
      'device_binding_mismatch',
    );
  },
);
