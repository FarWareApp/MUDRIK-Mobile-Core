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

const {
  TrustedSurfaceRegistry,
} = loadTypeScriptModule(
  'src/core/presence/trustedSurfaceRegistry.ts',
);

const ACCOUNT = 'acct_aaaaaaaaaaaaaaaa';
const DEVICE_A = 'dev_aaaaaaaaaaaaaaaa';
const DEVICE_B = 'dev_bbbbbbbbbbbbbbbb';
const KEY_A = 'dkey_aaaaaaaaaaaaaaaa';
const KEY_B = 'dkey_bbbbbbbbbbbbbbbb';
const SURFACE_A = 'surf_aaaaaaaaaaaaaaaa';
const SURFACE_B = 'surf_bbbbbbbbbbbbbbbb';
const SESSION = 'psess_aaaaaaaaaaaaaaaa';
const SESSION_B = 'psess_bbbbbbbbbbbbbbbb';
const THUMB_A = 'A'.repeat(43);
const THUMB_B = 'B'.repeat(43);

function resolve(rawInput, registry, trustedTime = 2_000) {
  return resolvePresenceSurface(rawInput, registry, trustedTime);
}

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
    presenceSessionId: SESSION,
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
} = {}) {
  return {
    device: {
      deviceId,
      accountId: ACCOUNT,
      deviceKeyId,
      publicKeyThumbprint: thumbprint,
      state,
      hardwareBacked: true,
    },
    expectedAccountId: ACCOUNT,
    expectedDeviceId: deviceId,
    expectedDeviceKeyId: deviceKeyId,
    expectedPublicKeyThumbprint: thumbprint,
  };
}

function trustForSurface(descriptor, state = 'active') {
  if (descriptor.deviceId === DEVICE_B) {
    return trust({
      deviceId: DEVICE_B,
      deviceKeyId: KEY_B,
      thumbprint: THUMB_B,
      state,
    });
  }

  return trust({ state });
}

function registryWith(...descriptors) {
  const registry = new TrustedSurfaceRegistry();

  descriptors.forEach((descriptor, index) => {
    const result = registry.register({
      accountId: ACCOUNT,
      surface: descriptor,
      revision: 1,
      approvedAt: 1_000 + index,
      explicitUserApproval: true,
      deviceTrustInput:
        trustForSurface(descriptor),
    }, 10_000);

    assert.equal(result.reason, 'accepted');
  });

  return registry;
}

function candidate(
  descriptor = surface(),
  overrides = {},
) {
  return {
    surfaceId: descriptor.surfaceId,
    presence: presence(
      descriptor.surfaceId,
    ),
    deviceTrustInput:
      trustForSurface(descriptor),
    ...overrides,
  };
}

function input(overrides = {}) {
  return {
    presenceSessionId: SESSION,
    accountId: ACCOUNT,
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
  'resolver requires an approved registry surface and current active device trust',
  () => {
    const descriptor = surface();
    const registry = registryWith(descriptor);

    const revokedEvidence = candidate(
      descriptor,
      {
        deviceTrustInput:
          trustForSurface(
            descriptor,
            'revoked',
          ),
      },
    );

    assert.equal(
      resolve(
        input({
          candidates: [revokedEvidence],
        }),
        registry,
      ).selectedSurfaceId,
      null,
    );

    const emptyRegistry =
      new TrustedSurfaceRegistry();

    assert.equal(
      resolve(
        input(),
        emptyRegistry,
      ).selectedSurfaceId,
      null,
    );
  },
);

test(
  'live candidate cannot override approved privacy classification',
  () => {
    const shared = surface({
      privacyClass: 'household_shared',
      kind: 'television',
      sharedSpace: true,
      capabilities: ['text'],
    });
    const registry = registryWith(shared);

    const decision = resolve(
      input({
        contentSensitivity: 'private',
        userConfirmedDisclosure: true,
        candidates: [candidate(shared)],
      }),
      registry,
    );

    assert.equal(decision.selectedSurfaceId, null);
  },
);

test(
  'Follow Me off keeps only an eligible current surface',
  () => {
    const descriptor = surface();
    const registry = registryWith(descriptor);

    const kept = resolve(
      input({
        followMeEnabled: false,
        currentPrimarySurfaceId: SURFACE_A,
      }),
      registry,
    );

    assert.equal(kept.selectedSurfaceId, SURFACE_A);
    assert.equal(kept.reason, 'kept_current');

    const noAutomatic = resolve(
      input({
        followMeEnabled: false,
        currentPrimarySurfaceId: null,
      }),
      registry,
    );

    assert.equal(noAutomatic.selectedSurfaceId, null);
    assert.equal(
      noAutomatic.reason,
      'automatic_handoff_disabled',
    );
  },
);

test(
  'sensitive audio requires personal private surface and private audio capability',
  () => {
    const limited = surface({
      capabilities: ['text', 'audio_output'],
    });
    const limitedRegistry = registryWith(limited);

    assert.equal(
      resolve(
        input({
          contentSensitivity: 'sensitive',
          requiredCapabilities: ['audio_output'],
          candidates: [candidate(limited)],
        }),
        limitedRegistry,
      ).selectedSurfaceId,
      null,
    );

    const full = surface();
    const fullRegistry = registryWith(full);

    assert.equal(
      resolve(
        input({
          contentSensitivity: 'sensitive',
          requiredCapabilities: ['audio_output'],
        }),
        fullRegistry,
      ).selectedSurfaceId,
      SURFACE_A,
    );
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
    const registry = registryWith(descriptor);
    const c = candidate(descriptor);

    assert.equal(
      resolve(
        input({
          userConfirmedDisclosure: true,
          candidates: [c],
        }),
        registry,
      ).selectedSurfaceId,
      null,
    );

    const manual = resolve(
      input({
        manualHandoff: true,
        pinnedSurfaceId: descriptor.surfaceId,
        userConfirmedDisclosure: true,
        candidates: [c],
      }),
      registry,
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
    const descriptor = surface();
    const registry = registryWith(descriptor);

    const decision = resolve(
      input({
        pinnedSurfaceId: SURFACE_B,
      }),
      registry,
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
    const aSurface = surface();
    const bSurface = surface({
      surfaceId: SURFACE_B,
      deviceId: DEVICE_B,
    });
    const registry = registryWith(
      aSurface,
      bSurface,
    );
    const a = candidate(aSurface);
    const b = candidate(bSurface);

    const first = resolve(
      input({ candidates: [b, a] }),
      registry,
    );
    const second = resolve(
      input({ candidates: [a, b] }),
      registry,
    );

    assert.equal(first.selectedSurfaceId, SURFACE_A);
    assert.equal(second.selectedSurfaceId, SURFACE_A);
  },
);

test(
  'resolver preserves privacy state and grants no new authority',
  () => {
    const descriptor = surface();
    const registry = registryWith(descriptor);
    const decision = resolve(
      input({
        privacyState: 'privacy_lock',
      }),
      registry,
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
  'future presence evidence and duplicate candidate identities fail closed',
  () => {
    const descriptor = surface();
    const registry = registryWith(descriptor);
    const future = candidate(
      descriptor,
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
      resolve(
        input({ candidates: [future] }),
        registry,
      ).selectedSurfaceId,
      null,
    );

    const duplicate = resolve(
      input({
        candidates: [
          candidate(descriptor),
          candidate(descriptor),
        ],
      }),
      registry,
    );

    assert.equal(duplicate.reason, 'invalid_input');
  },
);

test(
  'unknown resolver fields fail closed to no surface and privacy lock',
  () => {
    const registry = registryWith(surface());
    const decision = resolve(
      {
        ...input(),
        unexpected: true,
      },
      registry,
    );

    assert.equal(decision.selectedSurfaceId, null);
    assert.equal(decision.reason, 'invalid_input');
    assert.equal(
      decision.preservedPrivacyState,
      'privacy_lock',
    );
  },
);

test(
  'resolver uses trusted evaluation time and treats exact expiry as expired',
  () => {
    const descriptor = surface();
    const registry = registryWith(descriptor);

    const expired = candidate(descriptor, {
      presence: presence(SURFACE_A, {
        expiresAt: 2_000,
      }),
    });

    assert.equal(
      resolve(
        input({ candidates: [expired] }),
        registry,
        2_000,
      ).selectedSurfaceId,
      null,
    );

    const invalidClock = resolve(
      input(),
      registry,
      Number.NaN,
    );

    assert.equal(invalidClock.selectedSurfaceId, null);
    assert.equal(invalidClock.reason, 'invalid_input');
    assert.equal(
      invalidClock.preservedPrivacyState,
      'privacy_lock',
    );
  },
);

test(
  'private content prefers an eligible personal-private surface over a higher-scoring shared surface',
  () => {
    const shared = surface({
      surfaceId: SURFACE_A,
      deviceId: DEVICE_A,
      privacyClass: 'personal_shared_space',
      sharedSpace: true,
      capabilities: ['text'],
    });
    const privateSurface = surface({
      surfaceId: SURFACE_B,
      deviceId: DEVICE_B,
      privacyClass: 'personal_private',
      sharedSpace: false,
      capabilities: ['text'],
    });
    const registry = registryWith(shared, privateSurface);

    const sharedCandidate = candidate(shared, {
      presence: presence(SURFACE_A, {
        confidence: 100,
        recentDirectInteraction: true,
        explicitRoomMatch: true,
        estimatedLatencyMs: 0,
      }),
    });
    const privateCandidate = candidate(privateSurface, {
      presence: presence(SURFACE_B, {
        confidence: 80,
        deviceActive: false,
        estimatedLatencyMs: 5_000,
      }),
    });

    const decision = resolve(
      input({
        contentSensitivity: 'private',
        userConfirmedDisclosure: true,
        candidates: [sharedCandidate, privateCandidate],
      }),
      registry,
    );

    assert.equal(decision.selectedSurfaceId, SURFACE_B);
  },
);


test(
  'resolver rejects fresh presence evidence replayed from another logical session',
  () => {
    const descriptor = surface();
    const registry = registryWith(descriptor);

    const replayed = candidate(
      descriptor,
      {
        presence: presence(
          descriptor.surfaceId,
          {
            presenceSessionId: SESSION_B,
          },
        ),
      },
    );

    const decision = resolve(
      input({
        candidates: [replayed],
      }),
      registry,
    );

    assert.equal(
      decision.selectedSurfaceId,
      null,
    );
    assert.equal(
      decision.reason,
      'no_eligible_surface',
    );
  },
);
