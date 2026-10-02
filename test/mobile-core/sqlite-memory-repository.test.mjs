import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  SQLiteMemoryRepository,
} = loadTypeScriptModule(
  'src/core/memory/SQLiteMemoryRepository.ts',
);

const ACCOUNT =
  'acct_1111111111111111';

function snapshot(
  revision = 1,
  digest =
    'a'.repeat(64),
) {
  return {
    protocolVersion: '1.0',
    accountId: ACCOUNT,
    snapshotRevision: revision,
    policy: {
      protocolVersion: '1.0',
      policyId:
        'memory_policy_1111111111111111',
      accountId: ACCOUNT,
      revision: 1,
      mode: 'enabled',
      allowedCategories: [
        'preference',
      ],
      retentionDays: 30,
      maxRecords: 100,
      maxRetrievalCount: 8,
      maxContextBytes: 8192,
      retrievalEnabled: true,
      conversationReconstructionEnabled:
        true,
      requireApprovalForSensitive: true,
      updatedAtMs: 100,
      grantsExecutionAuthority: false,
      grantsSensorAuthority: false,
      grantsToolAuthority: false,
    },
    records: [],
    tombstones: [],
    candidateBindings: [],
    integrityDigest: digest,
    writtenAtMs:
      1000 + revision,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsToolAuthority: false,
  };
}

function database() {
  let row = null;

  const transaction = {
    async getFirstAsync() {
      return row;
    },
    async runAsync(
      sql,
      values,
    ) {
      if (
        sql.includes('INSERT INTO')
      ) {
        row = {
          account_id: values[0],
          snapshot_revision:
            values[1],
          integrity_digest:
            values[2],
          payload_json:
            values[3],
          written_at:
            values[4],
        };
        return;
      }

      if (
        sql.includes(
          'UPDATE memory_snapshots',
        )
      ) {
        row = {
          account_id: values[4],
          snapshot_revision:
            values[0],
          integrity_digest:
            values[1],
          payload_json:
            values[2],
          written_at:
            values[3],
        };
        return;
      }

      if (
        sql.includes(
          'DELETE FROM',
        )
      ) {
        row = null;
      }
    },
  };

  return {
    async getFirstAsync() {
      return row;
    },
    async withExclusiveTransactionAsync(
      callback,
    ) {
      await callback(transaction);
    },
  };
}

test(
  'memory repository persists and loads an initial snapshot',
  async () => {
    const db = database();
    const repository =
      new SQLiteMemoryRepository(
        async () => db,
      );

    const written =
      await repository
        .compareAndSwap(
          null,
          snapshot(),
        );

    assert.equal(
      written.accepted,
      true,
    );
    assert.equal(
      written.reason,
      'written',
    );

    const loaded =
      await repository
        .loadAccount(
          ACCOUNT,
        );

    assert.equal(
      loaded.snapshotRevision,
      1,
    );
  },
);

test(
  'memory repository advances only from the exact expected revision',
  async () => {
    const db = database();
    const repository =
      new SQLiteMemoryRepository(
        async () => db,
      );

    await repository
      .compareAndSwap(
        null,
        snapshot(),
      );

    const conflict =
      await repository
        .compareAndSwap(
          2,
          snapshot(
            3,
            'c'.repeat(64),
          ),
        );

    assert.equal(
      conflict.accepted,
      false,
    );
    assert.equal(
      conflict.reason,
      'revision_conflict',
    );

    const updated =
      await repository
        .compareAndSwap(
          1,
          snapshot(
            2,
            'b'.repeat(64),
          ),
        );

    assert.equal(
      updated.accepted,
      true,
    );
    assert.equal(
      updated.snapshot
        .snapshotRevision,
      2,
    );
  },
);

test(
  'memory repository treats exact replay as idempotent duplicate',
  async () => {
    const db = database();
    const repository =
      new SQLiteMemoryRepository(
        async () => db,
      );

    await repository
      .compareAndSwap(
        null,
        snapshot(),
      );

    const replay =
      await repository
        .compareAndSwap(
          null,
          snapshot(),
        );

    assert.equal(
      replay.accepted,
      true,
    );
    assert.equal(
      replay.reason,
      'duplicate',
    );
  },
);

test(
  'memory repository delete is revision-bound and idempotent',
  async () => {
    const db = database();
    const repository =
      new SQLiteMemoryRepository(
        async () => db,
      );

    await repository
      .compareAndSwap(
        null,
        snapshot(),
      );

    const conflict =
      await repository
        .deleteAccount(
          ACCOUNT,
          2,
        );

    assert.equal(
      conflict.reason,
      'revision_conflict',
    );

    const deleted =
      await repository
        .deleteAccount(
          ACCOUNT,
          1,
        );

    assert.equal(
      deleted.accepted,
      true,
    );

    const duplicate =
      await repository
        .deleteAccount(
          ACCOUNT,
          1,
        );

    assert.equal(
      duplicate.reason,
      'duplicate',
    );
  },
);
