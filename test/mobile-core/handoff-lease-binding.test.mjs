import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  evaluateHandoffLeaseBinding,
} = loadTypeScriptModule(
  'src/core/presence/handoffLeaseBinding.ts',
);

const SESSION =
  'psess_aaaaaaaaaaaaaaaa';
const SOURCE =
  'surf_aaaaaaaaaaaaaaaa';
const TARGET =
  'surf_bbbbbbbbbbbbbbbb';

function lease(overrides = {}) {
  return {
    presenceSessionId: SESSION,
    surfaceId: TARGET,
    generation: 1,
    issuedAt: 2_000,
    expiresAt: 32_000,
    privacyState: 'privacy_lock',
    ...overrides,
  };
}

function manifest(overrides = {}) {
  return {
    presenceSessionId: SESSION,
    sourceSurfaceId: SOURCE,
    targetSurfaceId: TARGET,
    generation: 1,
    companionId: 'companion_primary',
    companionProfileRevision: 4,
    conversationRef: 'conversation.current',
    shortTermContextRef: 'context.current',
    activeTaskRef: null,
    mediaContextRef: null,
    pendingApprovalRefs: [],
    privacyState: 'privacy_lock',
    createdAt: 2_100,
    ...overrides,
  };
}

test(
  'matching active lease authorizes state transfer without inheriting authority',
  () => {
    const decision =
      evaluateHandoffLeaseBinding(
        manifest(),
        lease(),
        2_500,
      );

    assert.equal(decision.accepted, true);
    assert.equal(
      decision.reason,
      'accepted',
    );
    assert.equal(
      decision.grantsInheritedAuthority,
      false,
    );
  },
);

test(
  'handoff target generation and session must match the active lease',
  () => {
    for (const bad of [
      manifest({
        targetSurfaceId:
          'surf_cccccccccccccccc',
      }),
      manifest({
        generation: 2,
      }),
      manifest({
        presenceSessionId:
          'psess_bbbbbbbbbbbbbbbb',
      }),
    ]) {
      const decision =
        evaluateHandoffLeaseBinding(
          bad,
          lease(),
          2_500,
        );

      assert.equal(decision.accepted, false);
      assert.equal(
        decision.reason,
        'lease_mismatch',
      );
    }
  },
);

test(
  'privacy downgrade during handoff fails closed',
  () => {
    const decision =
      evaluateHandoffLeaseBinding(
        manifest({
          privacyState: 'active',
        }),
        lease(),
        2_500,
      );

    assert.equal(decision.accepted, false);
    assert.equal(
      decision.reason,
      'privacy_state_mismatch',
    );
  },
);

test(
  'future stale and expired handoff evidence fails closed',
  () => {
    const future =
      evaluateHandoffLeaseBinding(
        manifest({
          createdAt: 3_000,
        }),
        lease(),
        2_500,
      );
    assert.equal(
      future.reason,
      'future_manifest',
    );

    const stale =
      evaluateHandoffLeaseBinding(
        manifest({
          createdAt: 1_999,
        }),
        lease(),
        2_500,
      );
    assert.equal(
      stale.reason,
      'stale_manifest',
    );

    const expired =
      evaluateHandoffLeaseBinding(
        manifest(),
        lease({
          expiresAt: 2_500,
        }),
        2_500,
      );
    assert.equal(
      expired.reason,
      'inactive_lease',
    );
  },
);

test(
  'malformed hidden authority fields fail closed',
  () => {
    const decision =
      evaluateHandoffLeaseBinding(
        {
          ...manifest(),
          toolScopes: ['*'],
        },
        lease(),
        2_500,
      );

    assert.equal(decision.accepted, false);
    assert.equal(
      decision.reason,
      'invalid_input',
    );
  },
);
