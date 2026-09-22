import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  reconcilePrimarySurfaceLeases,
} = loadTypeScriptModule(
  'src/core/presence/primarySurfaceReconciliation.ts',
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

function reconcile(
  claims,
  trustedTime = 2_000,
) {
  return reconcilePrimarySurfaceLeases(
    {
      presenceSessionId: SESSION,
      claims,
    },
    trustedTime,
  );
}

test(
  'reconciliation deterministically selects the highest active generation regardless of input order',
  () => {
    const first = lease();
    const next = lease({
      surfaceId: SURFACE_B,
      generation: 1,
      issuedAt: 1_500,
      expiresAt: 31_500,
    });

    const a = reconcile([first, next]);
    const b = reconcile([next, first]);

    assert.equal(a.accepted, true);
    assert.equal(b.accepted, true);
    assert.equal(a.lease?.surfaceId, SURFACE_B);
    assert.equal(b.lease?.surfaceId, SURFACE_B);
    assert.equal(a.lease?.generation, 1);
    assert.equal(b.lease?.generation, 1);
  },
);

test(
  'delayed lower-generation replay cannot reclaim primary ownership',
  () => {
    const stale = lease();
    const current = lease({
      surfaceId: SURFACE_B,
      generation: 3,
      issuedAt: 1_700,
      expiresAt: 31_700,
    });

    const decision = reconcile([
      current,
      stale,
      stale,
    ]);

    assert.equal(decision.accepted, true);
    assert.equal(decision.lease?.generation, 3);
    assert.equal(decision.lease?.surfaceId, SURFACE_B);
  },
);

test(
  'same-generation competing owners fail closed',
  () => {
    const decision = reconcile([
      lease({
        generation: 4,
        surfaceId: SURFACE_A,
      }),
      lease({
        generation: 4,
        surfaceId: SURFACE_B,
      }),
    ]);

    assert.equal(decision.accepted, false);
    assert.equal(
      decision.reason,
      'generation_conflict',
    );
    assert.equal(decision.lease, null);
  },
);

test(
  'privacy-state conflict across generations fails closed',
  () => {
    const decision = reconcile([
      lease(),
      lease({
        generation: 1,
        surfaceId: SURFACE_B,
        privacyState: 'active',
      }),
    ]);

    assert.equal(decision.accepted, false);
    assert.equal(
      decision.reason,
      'privacy_state_conflict',
    );
  },
);

test(
  'expired claims cannot retain ownership and future claims fail closed',
  () => {
    const expired = reconcile(
      [
        lease({
          expiresAt: 2_000,
        }),
      ],
      2_000,
    );

    assert.equal(expired.accepted, true);
    assert.equal(expired.lease, null);
    assert.equal(
      expired.reason,
      'no_active_lease',
    );

    const future = reconcile(
      [
        lease({
          issuedAt: 3_000,
          expiresAt: 33_000,
        }),
      ],
      2_000,
    );

    assert.equal(future.accepted, false);
    assert.equal(
      future.reason,
      'future_claim',
    );
  },
);

test(
  'reconciliation rejects malformed payloads and grants no authority',
  () => {
    const malformed =
      reconcilePrimarySurfaceLeases(
        {
          presenceSessionId: SESSION,
          claims: [lease()],
          permissions: ['all'],
        },
        2_000,
      );

    assert.equal(malformed.accepted, false);
    assert.equal(
      malformed.reason,
      'invalid_input',
    );

    const accepted = reconcile([lease()]);
    assert.equal(
      accepted.grantsExecutionAuthority,
      false,
    );
    assert.equal(
      accepted.grantsSensorAuthority,
      false,
    );
    assert.equal(
      accepted.grantsMemoryAuthority,
      false,
    );
    assert.equal(
      accepted.grantsDisclosureAuthority,
      false,
    );
  },
);
