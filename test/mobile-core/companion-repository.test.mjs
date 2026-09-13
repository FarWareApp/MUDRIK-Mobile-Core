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
  SQLiteCompanionRepository,
} = loadTypeScriptModule(
  'src/features/companion/storage/SQLiteCompanionRepository.ts',
);

function makeProfile(overrides = {}) {
  return {
    ...createDefaultCompanionProfile(),
    createdAt: 1000,
    updatedAt: 2000,
    revision: 2,
    ...overrides,
  };
}

test('repository save uses monotonic revision protection', async () => {
  const calls = [];

  const database = {
    runAsync: async (sql, params) => {
      calls.push({ sql, params });
      return { changes: 1 };
    },
  };

  const repository =
    new SQLiteCompanionRepository(
      async () => database,
    );

  await repository.saveProfile(
    makeProfile({
      preferredLanguages: [
        'ar',
        'de-de',
      ],
    }),
  );

  assert.equal(calls.length, 1);
  assert.match(
    calls[0].sql,
    /companion_profile\.revision\s*<\s*excluded\.revision/s,
  );
  assert.match(
    calls[0].sql,
    /preferred_languages_json/,
  );
  assert.match(
    calls[0].sql,
    /presence_level/,
  );
  assert.equal(
    calls[0].params.includes(
      '["ar","de-de"]',
    ),
    true,
  );
});

test('repository rejects a write that did not advance revision', async () => {
  const database = {
    runAsync: async () => ({
      changes: 0,
    }),
  };

  const repository =
    new SQLiteCompanionRepository(
      async () => database,
    );

  await assert.rejects(
    repository.saveProfile(
      makeProfile(),
    ),
    /Stale companion profile update rejected/,
  );
});

test('repository validates and normalizes persisted profile before exposing it', async () => {
  const database = {
    getFirstAsync: async () => ({
      companion_id: 'companion_primary',
      enabled: 1,
      display_name: 'MUDRIK',
      presentation: 'male',
      voice_preference: 'auto',
      voice_profile_id: null,
      avatar_profile_id: null,
      interaction_style: 'balanced',
      personality_preset: 'friendly',
      warmth: 70,
      directness: 55,
      humor: 25,
      initiative: 15,
      verbosity: 50,
      speaking_rate: 1,
      preferred_languages_json:
        '["AR","de-DE","ar"]',
      memory_policy_id: null,
      presence_level: 'normal',
      show_captions: 1,
      revision: 4,
      created_at: 1000,
      updated_at: 2000,
    }),
  };

  const repository =
    new SQLiteCompanionRepository(
      async () => database,
    );

  const stored =
    await repository.getProfile();

  assert.equal(
    stored.companionId,
    'companion_primary',
  );
  assert.deepEqual(
    stored.preferredLanguages,
    ['ar', 'de-de'],
  );
  assert.equal(
    stored.personalityPreset,
    'friendly',
  );
  assert.equal(stored.revision, 4);
});

test('repository rejects malformed persisted language data', async () => {
  const database = {
    getFirstAsync: async () => ({
      companion_id: 'companion_primary',
      enabled: 1,
      display_name: 'MUDRIK',
      presentation: 'male',
      voice_preference: 'auto',
      voice_profile_id: null,
      avatar_profile_id: null,
      interaction_style: 'balanced',
      personality_preset: 'balanced',
      warmth: 55,
      directness: 55,
      humor: 20,
      initiative: 20,
      verbosity: 50,
      speaking_rate: 1,
      preferred_languages_json:
        'invalid-json',
      memory_policy_id: null,
      presence_level: 'normal',
      show_captions: 1,
      revision: 1,
      created_at: 1000,
      updated_at: 1000,
    }),
  };

  const repository =
    new SQLiteCompanionRepository(
      async () => database,
    );

  await assert.rejects(
    repository.getProfile(),
    /Invalid persisted companion profile/,
  );
});
