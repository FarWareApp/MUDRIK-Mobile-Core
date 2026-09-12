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
  'fresh database migrates sequentially from version 0 through version 6',
  async () => {
    const state = createDatabase(0);

    await runMigrations(state.database);

    assert.equal(
      state.getVersion(),
      6,
    );
    assert.equal(
      state.executed.length,
      6,
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
      ],
    );
  },
);

test(
  'existing version 4 database applies only migrations 5 and 6',
  async () => {
    const state = createDatabase(4);

    await runMigrations(state.database);

    assert.equal(
      state.getVersion(),
      6,
    );
    assert.equal(
      state.executed.length,
      2,
    );
    assert.equal(
      state.executed[0].at(-1),
      'PRAGMA user_version = 5;',
    );
    assert.equal(
      state.executed[1].at(-1),
      'PRAGMA user_version = 6;',
    );
  },
);

test(
  'database newer than supported schema is rejected before any migration',
  async () => {
    const state = createDatabase(7);

    await assert.rejects(
      runMigrations(state.database),
      /newer than supported version 6/,
    );

    assert.equal(
      state.executed.length,
      0,
    );
    assert.equal(
      state.getVersion(),
      7,
    );
  },
);

test(
  'failed migration does not execute that migration user_version update',
  async () => {
    const state = createDatabase(
      5,
      {
        failSchemaContaining:
          'CREATE TABLE IF NOT EXISTS diagnostic_events',
      },
    );

    await assert.rejects(
      runMigrations(state.database),
      /simulated migration failure/,
    );

    assert.equal(
      state.getVersion(),
      5,
    );
    assert.equal(
      state.executed.length,
      0,
    );
  },
);
