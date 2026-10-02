import type {
  SQLiteDatabase,
} from 'expo-sqlite';

import {
  ACCOUNT_ID,
  safeInteger,
} from './memorySecurity';

import {
  parseMemoryDurableSnapshot,
  validateMemoryRepositoryLoad,
  type MemoryDurableSnapshot,
  type MemoryRepository,
  type MemoryRepositoryWriteResult,
} from './memoryRepository';

type DatabaseProvider =
  () => Promise<SQLiteDatabase>;

type MemorySnapshotRow =
  Readonly<{
    account_id: string;
    snapshot_revision: number;
    integrity_digest: string;
    payload_json: string;
    written_at: number;
  }>;

function result(
  accepted: boolean,
  reason:
    MemoryRepositoryWriteResult[
      'reason'
    ],
  snapshot:
    MemoryDurableSnapshot | null,
): MemoryRepositoryWriteResult {
  return Object.freeze({
    accepted,
    reason,
    snapshot,
  });
}

function parseRow(
  row: MemorySnapshotRow,
): MemoryDurableSnapshot | null {
  let value: unknown;

  try {
    value =
      JSON.parse(
        row.payload_json,
      );
  } catch {
    return null;
  }

  const snapshot =
    validateMemoryRepositoryLoad(
      value,
      row.account_id,
    );

  if (
    !snapshot
    || snapshot.snapshotRevision
      !== row.snapshot_revision
    || snapshot.integrityDigest
      !== row.integrity_digest
    || snapshot.writtenAtMs
      !== row.written_at
  ) {
    return null;
  }

  return snapshot;
}

export class SQLiteMemoryRepository
implements MemoryRepository {
  constructor(
    private readonly getDatabase:
      DatabaseProvider,
  ) {}

  async loadAccount(
    accountId: string,
  ): Promise<
    MemoryDurableSnapshot | null
  > {
    if (!ACCOUNT_ID.test(accountId)) {
      return null;
    }

    try {
      const database =
        await this.getDatabase();

      const row =
        await database
          .getFirstAsync<
            MemorySnapshotRow
          >(
            `
              SELECT
                account_id,
                snapshot_revision,
                integrity_digest,
                payload_json,
                written_at
              FROM memory_snapshots
              WHERE account_id = ?
            `,
            [accountId],
          );

      return row
        ? parseRow(row)
        : null;
    } catch {
      return null;
    }
  }

  async compareAndSwap(
    expectedRevision: number | null,
    snapshotInput:
      MemoryDurableSnapshot,
  ): Promise<
    MemoryRepositoryWriteResult
  > {
    const snapshot =
      parseMemoryDurableSnapshot(
        snapshotInput,
      );

    if (
      !snapshot
      || (
        expectedRevision !== null
        && (
          !safeInteger(
            expectedRevision,
          )
          || expectedRevision < 1
        )
      )
    ) {
      return result(
        false,
        'invalid_snapshot',
        null,
      );
    }

    const requiredRevision =
      expectedRevision === null
        ? 1
        : expectedRevision + 1;

    if (
      snapshot.snapshotRevision
        !== requiredRevision
    ) {
      return result(
        false,
        'revision_conflict',
        null,
      );
    }

    try {
      const database =
        await this.getDatabase();

      let writeResult:
        MemoryRepositoryWriteResult =
          result(
            false,
            'storage_failure',
            null,
          );

      await database
        .withExclusiveTransactionAsync(
          async (transaction) => {
            const row =
              await transaction
                .getFirstAsync<
                  MemorySnapshotRow
                >(
                  `
                    SELECT
                      account_id,
                      snapshot_revision,
                      integrity_digest,
                      payload_json,
                      written_at
                    FROM memory_snapshots
                    WHERE account_id = ?
                  `,
                  [
                    snapshot.accountId,
                  ],
                );

            const current =
              row
                ? parseRow(row)
                : null;

            if (row && !current) {
              writeResult =
                result(
                  false,
                  'storage_failure',
                  null,
                );
              return;
            }

            if (
              current
              && current
                .snapshotRevision
                === snapshot
                  .snapshotRevision
              && current
                .integrityDigest
                === snapshot
                  .integrityDigest
            ) {
              writeResult =
                result(
                  true,
                  'duplicate',
                  current,
                );
              return;
            }

            if (
              expectedRevision === null
                ? current !== null
                : (
                    !current
                    || current
                      .snapshotRevision
                      !== expectedRevision
                  )
            ) {
              writeResult =
                result(
                  false,
                  'revision_conflict',
                  current,
                );
              return;
            }

            const payload =
              JSON.stringify(
                snapshot,
              );

            if (current) {
              await transaction
                .runAsync(
                  `
                    UPDATE memory_snapshots
                    SET
                      snapshot_revision = ?,
                      integrity_digest = ?,
                      payload_json = ?,
                      written_at = ?
                    WHERE account_id = ?
                      AND snapshot_revision = ?
                  `,
                  [
                    snapshot
                      .snapshotRevision,
                    snapshot
                      .integrityDigest,
                    payload,
                    snapshot
                      .writtenAtMs,
                    snapshot.accountId,
                    expectedRevision,
                  ],
                );
            } else {
              await transaction
                .runAsync(
                  `
                    INSERT INTO
                      memory_snapshots (
                        account_id,
                        snapshot_revision,
                        integrity_digest,
                        payload_json,
                        written_at
                      )
                    VALUES (?, ?, ?, ?, ?)
                  `,
                  [
                    snapshot.accountId,
                    snapshot
                      .snapshotRevision,
                    snapshot
                      .integrityDigest,
                    payload,
                    snapshot
                      .writtenAtMs,
                  ],
                );
            }

            writeResult =
              result(
                true,
                'written',
                snapshot,
              );
          },
        );

      return writeResult;
    } catch {
      return result(
        false,
        'storage_failure',
        null,
      );
    }
  }

  async deleteAccount(
    accountId: string,
    expectedRevision: number,
  ): Promise<
    MemoryRepositoryWriteResult
  > {
    if (
      !ACCOUNT_ID.test(accountId)
      || !safeInteger(
        expectedRevision,
      )
      || expectedRevision < 1
    ) {
      return result(
        false,
        'invalid_snapshot',
        null,
      );
    }

    try {
      const database =
        await this.getDatabase();

      let deleteResult:
        MemoryRepositoryWriteResult =
          result(
            false,
            'storage_failure',
            null,
          );

      await database
        .withExclusiveTransactionAsync(
          async (transaction) => {
            const row =
              await transaction
                .getFirstAsync<
                  MemorySnapshotRow
                >(
                  `
                    SELECT
                      account_id,
                      snapshot_revision,
                      integrity_digest,
                      payload_json,
                      written_at
                    FROM memory_snapshots
                    WHERE account_id = ?
                  `,
                  [accountId],
                );

            if (!row) {
              deleteResult =
                result(
                  true,
                  'duplicate',
                  null,
                );
              return;
            }

            const current =
              parseRow(row);

            if (!current) {
              deleteResult =
                result(
                  false,
                  'storage_failure',
                  null,
                );
              return;
            }

            if (
              current.snapshotRevision
                !== expectedRevision
            ) {
              deleteResult =
                result(
                  false,
                  'revision_conflict',
                  current,
                );
              return;
            }

            await transaction
              .runAsync(
                `
                  DELETE FROM
                    memory_snapshots
                  WHERE account_id = ?
                    AND snapshot_revision = ?
                `,
                [
                  accountId,
                  expectedRevision,
                ],
              );

            deleteResult =
              result(
                true,
                'written',
                null,
              );
          },
        );

      return deleteResult;
    } catch {
      return result(
        false,
        'storage_failure',
        null,
      );
    }
  }
}
