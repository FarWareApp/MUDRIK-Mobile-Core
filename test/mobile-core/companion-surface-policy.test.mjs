import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  createDefaultCompanionProfile,
} = loadTypeScriptModule(
  'src/contracts/Companion.ts',
);

const {
  projectCompanionToSurface,
} = loadTypeScriptModule(
  'src/core/companion/companionSurfaceProjection.ts',
);

const {
  resolveCompanionMemoryBinding,
} = loadTypeScriptModule(
  'src/core/companion/companionMemoryBinding.ts',
);

function profile(overrides = {}) {
  return {
    ...createDefaultCompanionProfile(),
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

test('text voice and avatar surfaces receive the same primary companion identity', () => {
  const configured = profile({
    displayName: 'Noura',
    voiceProfileId:
      'voice_natural_ar_01',
    avatarProfileId:
      'avatar_human_01',
    personalityPreset:
      'friendly',
    warmth: 80,
    preferredLanguages: [
      'ar',
      'de-DE',
    ],
  });

  const projections = [
    'text',
    'voice',
    'avatar',
  ].map((surface) =>
    projectCompanionToSurface(
      configured,
      surface,
    ),
  );

  for (const projection of projections) {
    assert.equal(
      projection.available,
      true,
    );
    assert.equal(
      projection.identity.companionId,
      'companion_primary',
    );
    assert.equal(
      projection.identity.displayName,
      'Noura',
    );
    assert.equal(
      projection.identity.voiceProfileId,
      'voice_natural_ar_01',
    );
    assert.equal(
      projection.identity.avatarProfileId,
      'avatar_human_01',
    );
    assert.equal(
      projection.identity.grantsExecutionAuthority,
      false,
    );
    assert.equal(
      projection.identity.grantsSensorAuthority,
      false,
    );
    assert.equal(
      projection.identity.grantsMemoryAuthority,
      false,
    );
  }
});

test('disabled companion projects to no text voice or avatar identity', () => {
  for (const surface of [
    'text',
    'voice',
    'avatar',
  ]) {
    const projection =
      projectCompanionToSurface(
        profile({ enabled: false }),
        surface,
      );

    assert.equal(
      projection.available,
      false,
    );
    assert.equal(
      projection.reason,
      'companion_disabled',
    );
    assert.equal(
      projection.identity,
      null,
    );
  }
});

test('memory policy binding is a reference and never memory authority', () => {
  const unbound =
    resolveCompanionMemoryBinding(
      profile(),
    );

  assert.equal(unbound.bound, false);
  assert.equal(
    unbound.reason,
    'not_configured',
  );

  const bound =
    resolveCompanionMemoryBinding(
      profile({
        memoryPolicyId:
          'memory_primary_user_policy',
      }),
    );

  assert.equal(bound.bound, true);
  assert.equal(
    bound.memoryPolicyId,
    'memory_primary_user_policy',
  );
  assert.equal(
    bound.grantsMemoryAuthority,
    false,
  );
  assert.equal(
    bound.grantsMemoryCategoryAccess,
    false,
  );
});

test('malformed profile never projects identity or memory binding', () => {
  const malformed = {
    ...profile(),
    toolScopes: ['*'],
  };

  const projection =
    projectCompanionToSurface(
      malformed,
      'text',
    );

  assert.equal(
    projection.available,
    false,
  );
  assert.equal(
    projection.reason,
    'invalid_profile',
  );

  const binding =
    resolveCompanionMemoryBinding(
      malformed,
    );

  assert.equal(binding.bound, false);
  assert.equal(
    binding.reason,
    'invalid_profile',
  );
});
