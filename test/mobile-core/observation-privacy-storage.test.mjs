import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  SQLiteObservationPrivacyRepository,
} = loadTypeScriptModule(
  'src/core/privacy/SQLiteObservationPrivacyRepository.ts',
);

function createDatabase({ row = null, readError = null, writeError = null } = {}) {
  const writes = [];

  return {
    writes,
    database: {
      getFirstAsync: async (sql) => {
        assert.match(sql, /FROM observation_privacy_state/);
        if (readError) {
          throw readError;
        }
        return row;
      },
      runAsync: async (sql, args) => {
        assert.match(sql, /INSERT INTO observation_privacy_state/);
        if (writeError) {
          throw writeError;
        }
        writes.push({ sql, args });
      },
    },
  };
}

test('privacy repository reads a valid dedicated policy row', async () => {
  const fake = createDatabase({
    row: {
      state: 'visual_off',
      reason: 'privacy_event:stop_visual',
      updated_at: 1234,
    },
  });

  const repository = new SQLiteObservationPrivacyRepository(
    async () => fake.database,
  );

  assert.deepEqual(await repository.get(), {
    state: 'visual_off',
    reason: 'privacy_event:stop_visual',
    updatedAtMs: 1234,
    recoveredFailClosed: false,
  });
});

test('missing corrupt or unreadable privacy state fails closed to privacy_lock', async () => {
  for (const setup of [
    createDatabase({ row: null }),
    createDatabase({
      row: {
        state: 'root_override',
        reason: 'invalid',
        updated_at: 1,
      },
    }),
    createDatabase({
      row: {
        state: 'active',
        reason: '',
        updated_at: 1,
      },
    }),
    createDatabase({ readError: new Error('database unavailable') }),
  ]) {
    const repository = new SQLiteObservationPrivacyRepository(
      async () => setup.database,
    );

    const result = await repository.get();
    assert.equal(result.state, 'privacy_lock');
    assert.equal(result.recoveredFailClosed, true);
    assert.equal(result.reason, 'privacy_state_missing_or_invalid');
  }
});

test('privacy repository writes only the singleton dedicated privacy row', async () => {
  const fake = createDatabase();
  const repository = new SQLiteObservationPrivacyRepository(
    async () => fake.database,
  );

  const result = await repository.set({
    state: 'privacy_lock',
    reason: 'privacy_event:lock_privacy',
    updatedAtMs: 5000,
  });

  assert.equal(fake.writes.length, 1);
  assert.deepEqual(fake.writes[0].args, [
    'privacy_lock',
    'privacy_event:lock_privacy',
    5000,
  ]);
  assert.equal(result.state, 'privacy_lock');
  assert.equal(result.recoveredFailClosed, false);
});

test('privacy repository rejects malformed writes instead of widening policy', async () => {
  const fake = createDatabase();
  const repository = new SQLiteObservationPrivacyRepository(
    async () => fake.database,
  );

  for (const input of [
    { state: 'admin', reason: 'bad', updatedAtMs: 1 },
    { state: 'active', reason: '', updatedAtMs: 1 },
    { state: 'active', reason: 'ok', updatedAtMs: -1 },
    { state: 'active', reason: 'ok', updatedAtMs: Number.NaN },
  ]) {
    await assert.rejects(
      repository.set(input),
      /Invalid observation privacy state/,
    );
  }

  assert.equal(fake.writes.length, 0);
});

test('ordinary settings reset is structurally unable to erase observation privacy policy', () => {
  const settingsSource = fs.readFileSync(
    'src/features/settings/storage/SQLiteSettingsRepository.ts',
    'utf8',
  );
  const privacySource = fs.readFileSync(
    'src/core/privacy/SQLiteObservationPrivacyRepository.ts',
    'utf8',
  );

  assert.match(
    settingsSource,
    /DELETE FROM app_settings/,
  );
  assert.doesNotMatch(
    settingsSource,
    /observation_privacy_state/,
  );
  assert.match(
    privacySource,
    /observation_privacy_state/,
  );
  assert.doesNotMatch(
    privacySource,
    /DELETE FROM app_settings/,
  );
});
