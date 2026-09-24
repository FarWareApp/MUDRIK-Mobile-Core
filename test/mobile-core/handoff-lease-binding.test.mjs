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

function sourceLease(overrides = {}) {
  return {
    presenceSessionId: SESSION,
    surfaceId: SOURCE,
    generation: 0,
    issuedAt: 1_000,
    expiresAt: 31_000,
    privacyState: 'privacy_lock',
    ...overrides,
  };
}

function targetLease(overrides = {}) {
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

function evaluate(
  manifestInput = manifest(),
  sourceLeaseInput = sourceLease(),
  targetLeaseInput = targetLease(),
  trustedTime = 2_500,
) {
  return evaluateHandoffLeaseBinding(
    manifestInput,
    sourceLeaseInput,
    targetLeaseInput,
    trustedTime,
  );
}

test(
  'matching previous and active target leases authorize state transfer without inherited authority',
  () => {
    const decision = evaluate();

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
  'handoff target generation and session must match the active target lease',
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
      const decision = evaluate(bad);

      assert.equal(decision.accepted, false);
      assert.equal(
        decision.reason,
        'lease_mismatch',
      );
    }
  },
);

test(
  'handoff source must be the immediately previous primary owner',
  () => {
    const forgedSource = evaluate(
      manifest({
        sourceSurfaceId:
          'surf_cccccccccccccccc',
      }),
    );
    assert.equal(
      forgedSource.reason,
      'source_lease_mismatch',
    );

    const wrongGeneration = evaluate(
      manifest(),
      sourceLease({
        generation: 2,
      }),
    );
    assert.equal(
      wrongGeneration.reason,
      'source_lease_mismatch',
    );

    const sourceExpiredBeforeTarget = evaluate(
      manifest(),
      sourceLease({
        expiresAt: 2_000,
      }),
    );
    assert.equal(
      sourceExpiredBeforeTarget.reason,
      'source_lease_mismatch',
    );
  },
);

test(
  'privacy downgrade during handoff fails closed across source target and manifest',
  () => {
    const manifestDowngrade = evaluate(
      manifest({
        privacyState: 'active',
      }),
    );
    assert.equal(
      manifestDowngrade.reason,
      'privacy_state_mismatch',
    );

    const sourceMismatch = evaluate(
      manifest(),
      sourceLease({
        privacyState: 'ambient_off',
      }),
    );
    assert.equal(
      sourceMismatch.reason,
      'privacy_state_mismatch',
    );
  },
);

test(
  'future stale and expired handoff evidence fails closed',
  () => {
    const future = evaluate(
      manifest({
        createdAt: 3_000,
      }),
    );
    assert.equal(
      future.reason,
      'future_manifest',
    );

    const stale = evaluate(
      manifest({
        createdAt: 1_999,
      }),
    );
    assert.equal(
      stale.reason,
      'stale_manifest',
    );

    const expired = evaluate(
      manifest(),
      sourceLease(),
      targetLease({
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
    const decision = evaluate({
      ...manifest(),
      toolScopes: ['*'],
    });

    assert.equal(decision.accepted, false);
    assert.equal(
      decision.reason,
      'invalid_input',
    );
  },
);
