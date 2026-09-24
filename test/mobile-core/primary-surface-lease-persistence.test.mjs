import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  SQLitePrimarySurfaceLeaseRepository,
} = loadTypeScriptModule(
  'src/core/presence/storage/SQLitePrimarySurfaceLeaseRepository.ts',
);
const {
  parsePrimarySurfaceLease,
} = loadTypeScriptModule(
  'src/core/presence/primarySurfaceLease.ts',
);

const SESSION = 'psess_aaaaaaaaaaaaaaaa';
const SURFACE_A = 'surf_aaaaaaaaaaaaaaaa';
const SURFACE_B = 'surf_bbbbbbbbbbbbbbbb';

function lease(overrides = {}) {
  const value = parsePrimarySurfaceLease({
    presenceSessionId: SESSION,
    surfaceId: SURFACE_A,
    generation: 0,
    issuedAt: 1_000,
    expiresAt: 31_000,
    privacyState: 'privacy_lock',
    ...overrides,
  });

  assert.ok(value);
  return value;
}

function createDatabase() {
  let row = null;
  let writes = 0;

  const database = {
    getFirstAsync: async () => row,
    withExclusiveTransactionAsync:
      async (callback) => {
        const transaction = {
          getFirstAsync: async () => row,
          runAsync: async (sql, params) => {
            if (
              sql.includes(
                'INSERT INTO primary_surface_leases',
              )
            ) {
              row = {
                presence_session_id: params[0],
                surface_id: params[1],
                generation: params[2],
                issued_at: params[3],
                expires_at: params[4],
                privacy_state: params[5],
              };
              writes += 1;
              return { changes: 1 };
            }

            if (
              sql.includes(
                'UPDATE primary_surface_leases',
              )
            ) {
              const expectedGeneration = params[5];
              const expectedPrivacy = params[6];

              if (
                !row
                || row.generation !== expectedGeneration
                || row.privacy_state !== expectedPrivacy
              ) {
                return { changes: 0 };
              }

              row = {
                ...row,
                surface_id: params[0],
                generation: params[1],
                issued_at: params[2],
                expires_at: params[3],
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
  'primary lease persistence starts at generation zero and advances exactly once',
  async () => {
    const state = createDatabase();
    const repository =
      new SQLitePrimarySurfaceLeaseRepository(
        async () => state.database,
      );

    await assert.rejects(
      repository.save(
        lease({ generation: 1 }),
      ),
      /generation gap/,
    );

    const initial = lease();
    await repository.save(initial);
    assert.equal(state.getWrites(), 1);

    await repository.save(initial);
    assert.equal(
      state.getWrites(),
      1,
      'exact duplicate must be idempotent',
    );

    await assert.rejects(
      repository.save(
        lease({
          surfaceId: SURFACE_B,
        }),
      ),
      /generation conflict/,
    );

    await assert.rejects(
      repository.save(
        lease({
          generation: 2,
          issuedAt: 3_000,
          expiresAt: 33_000,
        }),
      ),
      /stale or generation gap/,
    );

    const next = lease({
      surfaceId: SURFACE_B,
      generation: 1,
      issuedAt: 2_000,
      expiresAt: 32_000,
    });

    await repository.save(next);

    const stored = await repository.get(SESSION);
    assert.equal(stored?.surfaceId, SURFACE_B);
    assert.equal(stored?.generation, 1);
    assert.equal(
      stored?.privacyState,
      'privacy_lock',
    );
    assert.equal(state.getWrites(), 2);
  },
);

test(
  'primary lease persistence rejects privacy downgrade across handoff generation',
  async () => {
    const state = createDatabase();
    const repository =
      new SQLitePrimarySurfaceLeaseRepository(
        async () => state.database,
      );

    await repository.save(lease());

    await assert.rejects(
      repository.save(
        lease({
          generation: 1,
          issuedAt: 2_000,
          expiresAt: 32_000,
          privacyState: 'active',
        }),
      ),
      /privacy mismatch/,
    );
  },
);

test(
  'corrupt persisted primary lease fails closed on read',
  async () => {
    const state = createDatabase();
    state.setRow({
      presence_session_id: SESSION,
      surface_id: SURFACE_A,
      generation: 0,
      issued_at: 1_000,
      expires_at: 100_000,
      privacy_state: 'privacy_lock',
    });

    const repository =
      new SQLitePrimarySurfaceLeaseRepository(
        async () => state.database,
      );

    await assert.rejects(
      repository.get(SESSION),
      /Invalid persisted primary surface lease/,
    );
  },
);

test(
  'invalid presence session id never queries primary lease storage',
  async () => {
    let reads = 0;
    const database = {
      getFirstAsync: async () => {
        reads += 1;
        return null;
      },
    };

    const repository =
      new SQLitePrimarySurfaceLeaseRepository(
        async () => database,
      );

    assert.equal(
      await repository.get('bad_session'),
      null,
    );
    assert.equal(reads, 0);
  },
);


test(
  'primary lease persistence rejects timestamp rollback and inactive predecessor handoff',
  async () => {
    const rollbackState = createDatabase();
    const rollbackRepository =
      new SQLitePrimarySurfaceLeaseRepository(
        async () => rollbackState.database,
      );

    await rollbackRepository.save(
      lease({
        issuedAt: 2_000,
        expiresAt: 32_000,
      }),
    );

    await assert.rejects(
      rollbackRepository.save(
        lease({
          surfaceId: SURFACE_B,
          generation: 1,
          issuedAt: 1_500,
          expiresAt: 31_500,
        }),
      ),
      /non-monotonic time/,
    );

    const inactiveState = createDatabase();
    const inactiveRepository =
      new SQLitePrimarySurfaceLeaseRepository(
        async () => inactiveState.database,
      );

    await inactiveRepository.save(
      lease({
        expiresAt: 2_000,
      }),
    );

    await assert.rejects(
      inactiveRepository.save(
        lease({
          surfaceId: SURFACE_B,
          generation: 1,
          issuedAt: 2_000,
          expiresAt: 32_000,
        }),
      ),
      /previous lease inactive/,
    );
  },
);
