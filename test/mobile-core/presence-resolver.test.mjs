import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  resolvePresenceSurface,
} = loadTypeScriptModule(
  'src/core/presence/presenceResolver.ts',
);

const ACCOUNT = 'acct_aaaaaaaaaaaaaaaa';
const DEVICE_A = 'dev_aaaaaaaaaaaaaaaa';
const DEVICE_B = 'dev_bbbbbbbbbbbbbbbb';
const KEY_A = 'dkey_aaaaaaaaaaaaaaaa';
const KEY_B = 'dkey_bbbbbbbbbbbbbbbb';
const SURFACE_A = 'surf_aaaaaaaaaaaaaaaa';
const SURFACE_B = 'surf_bbbbbbbbbbbbbbbb';
const SESSION = 'psess_aaaaaaaaaaaaaaaa';
const THUMB_A = 'A'.repeat(43);
const THUMB_B = 'B'.repeat(43);

function surface({
  surfaceId = SURFACE_A,
  deviceId = DEVICE_A,
  privacyClass = 'personal_private',
  kind = 'phone',
  sharedSpace = false,
  capabilities = ['text', 'audio_output', 'microphone', 'private_audio'],
} = {}) {
  return {
    surfaceId,
    deviceId,
    kind,
    privacyClass,
    capabilities,
    sharedSpace,
  };
}

function presence(surfaceId = SURFACE_A, overrides = {}) {
  return {
    surfaceId,
    sequence: 1,
    observedAt: 1_000,
    expiresAt: 61_000,
    availability: 'online',
    confidence: 90,
    deviceActive: true,
    recentDirectInteraction: false,
    explicitRoomMatch: false,
    estimatedLatencyMs: 50,
    ...overrides,
  };
}

function trust({
  deviceId = DEVICE_A,
  deviceKeyId = KEY_A,
  thumbprint = THUMB_A,
  state = 'active',
  accountId = ACCOUNT,
} = {}) {
  return {
    device: {
      deviceId,
      accountId,
      deviceKeyId,
      publicKeyThumbprint: thumbprint,
      state,
      hardwareBacked: true,
    },
    expectedAccountId: accountId,
    expectedDeviceId: deviceId,
    expectedDeviceKeyId: deviceKeyId,
    expectedPublicKeyThumbprint: thumbprint,
  };
}

function candidate(descriptor = surface(), overrides = {}) {
  return {
    surface: descriptor,
    presence: presence(descriptor.surfaceId),
    deviceTrustInput: trust({
      deviceId: descriptor.deviceId,
    }),
    ...overrides,
  };
}

function input(overrides = {}) {
  return {
    presenceSessionId: SESSION,
    accountId: ACCOUNT,
    now: 2_000,
    followMeEnabled: true,
    manualHandoff: false,
    currentPrimarySurfaceId: null,
    pinnedSurfaceId: null,
    contentSensitivity: 'public',
    userConfirmedDisclosure: false,
    requiredCapabilities: ['text'],
    privacyState: 'active',
    candidates: [candidate()],
    ...overrides,
  };
}

test(
  'resolver requires active Section 03 device trust',
  () => {
    const blocked = candidate(
      surface(),
      {
        deviceTrustInput: trust({
          state: 'revoked',
        }),
      },
    );

    assert.equal(
      resolvePresenceSurface(
        input({
          candidates: [blocked],
        }),
      ).selectedSurfaceId,
      null,
    );
  },
);

test(
  'resolver rejects device trust bound to a different surface device',
  () => {
    const descriptor = surface();
    const mismatched = candidate(
      descriptor,
      {
        deviceTrustInput: trust({
          deviceId: DEVICE_B,
          deviceKeyId: KEY_B,
          thumbprint: THUMB_B,
        }),
      },
    );

    assert.equal(
      resolvePresenceSurface(
        input({
          candidates: [mismatched],
        }),
      ).selectedSurfaceId,
      null,
    );
  },
);

test(
  'Follow Me off keeps only an eligible current surface',
  () => {
    const kept = resolvePresenceSurface(
      input({
        followMeEnabled: false,
        currentPrimarySurfaceId: SURFACE_A,
      }),
    );

    assert.equal(kept.selectedSurfaceId, SURFACE_A);
    assert.equal(kept.reason, 'kept_current');

    const noAutomatic = resolvePresenceSurface(
      input({
        followMeEnabled: false,
        currentPrimarySurfaceId: null,
      }),
    );

    assert.equal(noAutomatic.selectedSurfaceId, null);
    assert.equal(
      noAutomatic.reason,
      'automatic_handoff_disabled',
    );
  },
);

test(
  'private content is never routed to household shared surfaces',
  () => {
    const descriptor = surface({
      privacyClass: 'household_shared',
      kind: 'television',
      sharedSpace: true,
      capabilities: ['text'],
    });

    const decision = resolvePresenceSurface(
      input({
        contentSensitivity: 'private',
        userConfirmedDisclosure: true,
        candidates: [candidate(descriptor)],
      }),
    );

    assert.equal(decision.selectedSurfaceId, null);
  },
);

test(
  'sensitive audio requires personal private surface and private audio capability',
  () => {
    const descriptor = surface({
      capabilities: ['text', 'audio_output'],
    });

    const blocked = resolvePresenceSurface(
      input({
        contentSensitivity: 'sensitive',
        requiredCapabilities: ['audio_output'],
        candidates: [candidate(descriptor)],
      }),
    );

    assert.equal(blocked.selectedSurfaceId, null);

    const allowed = resolvePresenceSurface(
      input({
        contentSensitivity: 'sensitive',
        requiredCapabilities: ['audio_output'],
      }),
    );

    assert.equal(allowed.selectedSurfaceId, SURFACE_A);
  },
);

test(
  'public shared surface is excluded automatically and requires confirmed manual selection',
  () => {
    const descriptor = surface({
      privacyClass: 'public_or_untrusted',
      kind: 'smart_display',
      sharedSpace: true,
      capabilities: ['text'],
    });

    const c = candidate(descriptor);

    assert.equal(
      resolvePresenceSurface(
        input({
          userConfirmedDisclosure: true,
          candidates: [c],
        }),
      ).selectedSurfaceId,
      null,
    );

    const manual = resolvePresenceSurface(
      input({
        manualHandoff: true,
        pinnedSurfaceId: descriptor.surfaceId,
        userConfirmedDisclosure: true,
        candidates: [c],
      }),
    );

    assert.equal(
      manual.selectedSurfaceId,
      descriptor.surfaceId,
    );
    assert.equal(
      manual.reason,
      'manual_target_selected',
    );
  },
);

test(
  'ineligible pinned target fails closed instead of silently falling back',
  () => {
    const decision = resolvePresenceSurface(
      input({
        pinnedSurfaceId: SURFACE_B,
      }),
    );

    assert.equal(decision.selectedSurfaceId, null);
    assert.equal(
      decision.reason,
      'pinned_surface_ineligible',
    );
  },
);

test(
  'automatic ranking is deterministic across candidate order',
  () => {
    const descriptorA = surface();
    const descriptorB = surface({
      surfaceId: SURFACE_B,
      deviceId: DEVICE_B,
    });

    const a = candidate(descriptorA);
    const b = candidate(
      descriptorB,
      {
        deviceTrustInput: trust({
          deviceId: DEVICE_B,
          deviceKeyId: KEY_B,
          thumbprint: THUMB_B,
        }),
      },
    );

    const first = resolvePresenceSurface(
      input({ candidates: [b, a] }),
    );
    const second = resolvePresenceSurface(
      input({ candidates: [a, b] }),
    );

    assert.equal(first.selectedSurfaceId, SURFACE_A);
    assert.equal(second.selectedSurfaceId, SURFACE_A);
  },
);

test(
  'resolver preserves privacy state and grants no new authority',
  () => {
    const decision = resolvePresenceSurface(
      input({
        privacyState: 'privacy_lock',
      }),
    );

    assert.equal(
      decision.preservedPrivacyState,
      'privacy_lock',
    );
    assert.equal(decision.grantsExecutionAuthority, false);
    assert.equal(decision.grantsSensorAuthority, false);
    assert.equal(decision.grantsMemoryAuthority, false);
    assert.equal(
      decision.grantsAdditionalDisclosureAuthority,
      false,
    );
  },
);

test(
  'future or expired presence evidence is never selected',
  () => {
    const future = candidate(
      surface(),
      {
        presence: presence(
          SURFACE_A,
          {
            observedAt: 3_000,
            expiresAt: 63_000,
          },
        ),
      },
    );

    assert.equal(
      resolvePresenceSurface(
        input({ candidates: [future] }),
      ).selectedSurfaceId,
      null,
    );
  },
);

test(
  'unknown resolver fields fail closed to no surface and privacy lock',
  () => {
    const decision = resolvePresenceSurface({
      ...input(),
      unexpected: true,
    });

    assert.equal(decision.selectedSurfaceId, null);
    assert.equal(decision.reason, 'invalid_input');
    assert.equal(
      decision.preservedPrivacyState,
      'privacy_lock',
    );
  },
);
