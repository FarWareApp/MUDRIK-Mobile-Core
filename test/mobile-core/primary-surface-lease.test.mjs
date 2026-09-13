import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  PrimarySurfaceLeaseRegistry,
} = loadTypeScriptModule(
  'src/core/presence/primarySurfaceLease.ts',
);

const SESSION =
  'psess_aaaaaaaaaaaaaaaa';
const SURFACE_A =
  'surf_aaaaaaaaaaaaaaaa';
const SURFACE_B =
  'surf_bbbbbbbbbbbbbbbb';

function lease(overrides = {}) {
  return {
    presenceSessionId: SESSION,
    surfaceId: SURFACE_A,
    generation: 0,
    issuedAt: 1_000,
    expiresAt: 31_000,
    privacyState: 'privacy_lock',
    ...overrides,
  };
}

test(
  'primary lease accepts generation zero and an exact duplicate',
  () => {
    const registry =
      new PrimarySurfaceLeaseRegistry();

    const first = lease();

    assert.equal(
      registry.claim(first, 2_000).reason,
      'accepted',
    );
    assert.equal(
      registry.claim(first, 2_000).reason,
      'duplicate',
    );
    assert.equal(
      registry.ownsPrimary(
        SESSION,
        SURFACE_A,
        0,
        2_000,
      ),
      true,
    );
  },
);

test(
  'same-generation competing surface is rejected as split-brain conflict',
  () => {
    const registry =
      new PrimarySurfaceLeaseRegistry();

    assert.equal(
      registry.claim(
        lease(),
        2_000,
      ).reason,
      'accepted',
    );

    assert.equal(
      registry.claim(
        lease({
          surfaceId: SURFACE_B,
        }),
        2_000,
      ).reason,
      'generation_conflict',
    );
  },
);

test(
  'handoff requires exactly next generation and preserves privacy state',
  () => {
    const registry =
      new PrimarySurfaceLeaseRegistry();

    registry.claim(
      lease({
        privacyState: 'ambient_off',
      }),
      2_000,
    );

    assert.equal(
      registry.claim(
        lease({
          surfaceId: SURFACE_B,
          generation: 2,
          privacyState: 'ambient_off',
        }),
        2_000,
      ).reason,
      'generation_gap',
    );

    assert.equal(
      registry.claim(
        lease({
          surfaceId: SURFACE_B,
          generation: 1,
          privacyState: 'active',
        }),
        2_000,
      ).reason,
      'privacy_state_mismatch',
    );

    const next = lease({
      surfaceId: SURFACE_B,
      generation: 1,
      issuedAt: 2_000,
      expiresAt: 32_000,
      privacyState: 'ambient_off',
    });

    assert.equal(
      registry.claim(next, 2_500).reason,
      'accepted',
    );
    assert.equal(
      registry.ownsPrimary(
        SESSION,
        SURFACE_A,
        0,
        2_500,
      ),
      false,
    );
    assert.equal(
      registry.ownsPrimary(
        SESSION,
        SURFACE_B,
        1,
        2_500,
      ),
      true,
    );
  },
);

test(
  'stale replay cannot reclaim primary ownership after handoff',
  () => {
    const registry =
      new PrimarySurfaceLeaseRegistry();

    const oldLease = lease();
    registry.claim(oldLease, 2_000);
    registry.claim(
      lease({
        surfaceId: SURFACE_B,
        generation: 1,
        issuedAt: 2_000,
        expiresAt: 32_000,
      }),
      2_500,
    );

    assert.equal(
      registry.claim(
        oldLease,
        2_500,
      ).reason,
      'stale_generation',
    );
  },
);

test(
  'future expired and malformed leases fail closed',
  () => {
    const future =
      new PrimarySurfaceLeaseRegistry();
    assert.equal(
      future.claim(
        lease({
          issuedAt: 3_000,
          expiresAt: 33_000,
        }),
        2_000,
      ).reason,
      'future_lease',
    );

    const expired =
      new PrimarySurfaceLeaseRegistry();
    assert.equal(
      expired.claim(
        lease({
          expiresAt: 1_500,
        }),
        2_000,
      ).reason,
      'expired_lease',
    );

    const malformed =
      new PrimarySurfaceLeaseRegistry();
    assert.equal(
      malformed.claim({
        ...lease(),
        extra: true,
      }, 2_000).reason,
      'invalid_lease',
    );
  },
);
