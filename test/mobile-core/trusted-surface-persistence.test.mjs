import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  SQLiteTrustedSurfaceRepository,
} = loadTypeScriptModule(
  'src/core/presence/storage/SQLiteTrustedSurfaceRepository.ts',
);
const {
  parseTrustedSurfaceRecord,
} = loadTypeScriptModule(
  'src/core/presence/trustedSurfaceRecord.ts',
);

const ACCOUNT = 'acct_aaaaaaaaaaaaaaaa';
const OTHER_ACCOUNT = 'acct_bbbbbbbbbbbbbbbb';
const DEVICE = 'dev_aaaaaaaaaaaaaaaa';
const SURFACE = 'surf_aaaaaaaaaaaaaaaa';

function record(overrides = {}) {
  const value = parseTrustedSurfaceRecord({
    accountId: ACCOUNT,
    surface: {
      surfaceId: SURFACE,
      deviceId: DEVICE,
      kind: 'phone',
      privacyClass: 'personal_private',
      capabilities: [
        'text',
        'audio_output',
        'private_audio',
      ],
      sharedSpace: false,
    },
    revision: 1,
    approvedAt: 100,
    state: 'active',
    ...overrides,
  });

  assert.ok(value);
  return value;
}

function createDatabase() {
  let row = null;
  let writes = 0;

  function rowFromRecordParams(params) {
    return {
      surface_id: params[0],
      account_id: params[1],
      device_id: params[2],
      kind: params[3],
      privacy_class: params[4],
      capabilities_json: params[5],
      shared_space: params[6],
      revision: params[7],
      approved_at: params[8],
      state: params[9],
    };
  }

  const database = {
    getFirstAsync: async () => row,
    getAllAsync: async () => row ? [row] : [],
    withExclusiveTransactionAsync:
      async (callback) => {
        const transaction = {
          getFirstAsync: async () => row,
          runAsync: async (sql, params) => {
            if (sql.includes('INSERT INTO trusted_surfaces')) {
              row = rowFromRecordParams(params);
              writes += 1;
              return { changes: 1 };
            }

            if (sql.includes('UPDATE trusted_surfaces')) {
              const expectedRevision = params.at(-1);

              if (!row || row.revision !== expectedRevision) {
                return { changes: 0 };
              }

              row = {
                ...row,
                kind: params[0],
                privacy_class: params[1],
                capabilities_json: params[2],
                shared_space: params[3],
                revision: params[4],
                approved_at: params[5],
                state: params[6],
              };
              writes += 1;
              return { changes: 1 };
            }

            throw new Error('unexpected SQL');
          },
        };

        await callback(transaction);
      },
  };

  return {
    database,
    setRow: (value) => {
      row = value;
    },
    getWrites: () => writes,
  };
}

test(
  'trusted surface persistence requires revision one then exact monotonic increments',
  async () => {
    const state = createDatabase();
    const repository = new SQLiteTrustedSurfaceRepository(
      async () => state.database,
    );

    await assert.rejects(
      repository.save(
        record({ revision: 2 }),
      ),
      /revision gap/,
    );

    await repository.save(record());
    assert.equal(state.getWrites(), 1);

    await assert.rejects(
      repository.save(record()),
      /stale or revision gap/,
    );

    await assert.rejects(
      repository.save(
        record({ revision: 3 }),
      ),
      /stale or revision gap/,
    );

    await repository.save(
      record({
        revision: 2,
        state: 'revoked',
      }),
    );

    const stored = await repository.get(SURFACE);
    assert.equal(stored?.revision, 2);
    assert.equal(stored?.state, 'revoked');
    assert.equal(state.getWrites(), 2);
  },
);

test(
  'trusted surface persistence never permits account binding replacement',
  async () => {
    const state = createDatabase();
    const repository = new SQLiteTrustedSurfaceRepository(
      async () => state.database,
    );

    await repository.save(record());

    await assert.rejects(
      repository.save(
        record({
          accountId: OTHER_ACCOUNT,
          revision: 2,
        }),
      ),
      /binding mismatch/,
    );
  },
);

test(
  'corrupt persisted trusted surface data fails closed on read',
  async () => {
    const state = createDatabase();
    state.setRow({
      surface_id: SURFACE,
      account_id: ACCOUNT,
      device_id: DEVICE,
      kind: 'phone',
      privacy_class: 'personal_private',
      capabilities_json: '["text","text"]',
      shared_space: 0,
      revision: 1,
      approved_at: 100,
      state: 'active',
    });

    const repository = new SQLiteTrustedSurfaceRepository(
      async () => state.database,
    );

    await assert.rejects(
      repository.get(SURFACE),
      /Invalid persisted trusted surface record/,
    );
  },
);

test(
  'invalid account and surface identifiers never query trusted surface storage',
  async () => {
    let reads = 0;
    const database = {
      getFirstAsync: async () => {
        reads += 1;
        return null;
      },
      getAllAsync: async () => {
        reads += 1;
        return [];
      },
    };

    const repository = new SQLiteTrustedSurfaceRepository(
      async () => database,
    );

    assert.equal(
      await repository.get('bad_surface'),
      null,
    );
    assert.deepEqual(
      await repository.listForAccount('bad_account'),
      [],
    );
    assert.equal(reads, 0);
  },
);


test(
  'trusted surface persistence rejects approval timestamp rollback',
  async () => {
    const state = createDatabase();
    const repository =
      new SQLiteTrustedSurfaceRepository(
        async () => state.database,
      );

    await repository.save(
      record({
        approvedAt: 2_000,
      }),
    );

    await assert.rejects(
      repository.save(
        record({
          revision: 2,
          approvedAt: 1_999,
        }),
      ),
      /non-monotonic approval/,
    );
  },
);
