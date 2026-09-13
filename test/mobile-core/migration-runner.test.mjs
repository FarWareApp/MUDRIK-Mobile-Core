import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  runMigrations,
} = loadTypeScriptModule(
  'src/core/storage/MigrationRunner.ts',
);

function createDatabase(
  initialVersion,
  {
    failSchemaContaining = null,
  } = {},
) {
  const executed = [];
  let version = initialVersion;

  const database = {
    getFirstAsync: async (sql) => {
      assert.equal(
        sql,
        'PRAGMA user_version;',
      );
      return {
        user_version: version,
      };
    },

    withExclusiveTransactionAsync:
      async (callback) => {
        const transactionCalls = [];

        const transaction = {
          execAsync: async (sql) => {
            transactionCalls.push(sql);

            if (
              failSchemaContaining &&
              sql.includes(failSchemaContaining)
            ) {
              throw new Error(
                'simulated migration failure',
              );
            }

            const match =
              sql.match(
                /PRAGMA user_version = (\d+);/,
              );

            if (match) {
              version = Number(match[1]);
            }
          },
        };

        await callback(transaction);
        executed.push(transactionCalls);
      },
  };

  return {
    database,
    executed,
    getVersion: () => version,
  };
}

test(
  'fresh database migrates sequentially from version 0 through version 8',
  async () => {
    const state = createDatabase(0);

    await runMigrations(state.database);

    assert.equal(
      state.getVersion(),
      8,
    );
    assert.equal(
      state.executed.length,
      8,
    );

    assert.deepEqual(
      state.executed.map(
        (transaction) =>
          transaction.at(-1),
      ),
      [
        'PRAGMA user_version = 1;',
        'PRAGMA user_version = 2;',
        'PRAGMA user_version = 3;',
        'PRAGMA user_version = 4;',
        'PRAGMA user_version = 5;',
        'PRAGMA user_version = 6;',
        'PRAGMA user_version = 7;',
        'PRAGMA user_version = 8;',
      ],
    );

    const privacySchema = state.executed[6][0];
    assert.match(
      privacySchema,
      /CREATE TABLE IF NOT EXISTS observation_privacy_state/,
    );
    assert.match(
      privacySchema,
      /'ambient_off'/,
    );
    assert.match(
      privacySchema,
      /default_passive_observation_off/,
    );
    assert.doesNotMatch(
      privacySchema,
      /app_settings/,
    );

    const companionSchema =
      state.executed[7][0];

    assert.match(
      companionSchema,
      /ALTER TABLE companion_profile/,
    );
    assert.match(
      companionSchema,
      /companion_id/,
    );
    assert.match(
      companionSchema,
      /presence_level/,
    );
    assert.match(
      companionSchema,
      /preferred_languages_json/,
    );
    assert.match(
      companionSchema,
      /revision/,
    );
    assert.doesNotMatch(
      companionSchema,
      /DROP TABLE/i,
    );
    assert.doesNotMatch(
      companionSchema,
      /DELETE FROM companion_profile/i,
    );
  },
);

test(
  'existing version 4 database applies only migrations 5 through 8',
  async () => {
    const state = createDatabase(4);

    await runMigrations(state.database);

    assert.equal(
      state.getVersion(),
      8,
    );
    assert.equal(
      state.executed.length,
      4,
    );
    assert.deepEqual(
      state.executed.map(
        (transaction) =>
          transaction.at(-1),
      ),
      [
        'PRAGMA user_version = 5;',
        'PRAGMA user_version = 6;',
        'PRAGMA user_version = 7;',
        'PRAGMA user_version = 8;',
      ],
    );
  },
);

test(
  'version 6 upgrades privacy state then companion profile schema',
  async () => {
    const state = createDatabase(6);

    await runMigrations(state.database);

    assert.equal(state.getVersion(), 8);
    assert.equal(state.executed.length, 2);
    assert.match(
      state.executed[0][0],
      /observation_privacy_state/,
    );
    assert.match(
      state.executed[1][0],
      /ALTER TABLE companion_profile/,
    );
    assert.equal(
      state.executed[1].at(-1),
      'PRAGMA user_version = 8;',
    );
  },
);

test(
  'version 7 applies only non-destructive companion profile expansion',
  async () => {
    const state = createDatabase(7);

    await runMigrations(state.database);

    assert.equal(state.getVersion(), 8);
    assert.equal(state.executed.length, 1);

    const schema = state.executed[0][0];
    assert.match(
      schema,
      /ALTER TABLE companion_profile/,
    );
    assert.doesNotMatch(schema, /DROP TABLE/i);
    assert.doesNotMatch(
      schema,
      /DELETE FROM companion_profile/i,
    );
    assert.equal(
      state.executed[0].at(-1),
      'PRAGMA user_version = 8;',
    );
  },
);

test(
  'database newer than supported schema is rejected before any migration',
  async () => {
    const state = createDatabase(9);

    await assert.rejects(
      runMigrations(state.database),
      /newer than supported version 8/,
    );

    assert.equal(
      state.executed.length,
      0,
    );
    assert.equal(
      state.getVersion(),
      9,
    );
  },
);

test(
  'failed migration does not execute that migration user_version update',
  async () => {
    const state = createDatabase(
      6,
      {
        failSchemaContaining:
          'CREATE TABLE IF NOT EXISTS observation_privacy_state',
      },
    );

    await assert.rejects(
      runMigrations(state.database),
      /simulated migration failure/,
    );

    assert.equal(
      state.getVersion(),
      6,
    );
    assert.equal(
      state.executed.length,
      0,
    );
  },
);
