import type {
  SQLiteDatabase,
} from 'expo-sqlite';

import type {
  PrimarySurfaceLeaseRepository,
} from '../PrimarySurfaceLeaseRepository';
import {
  parsePrimarySurfaceLease,
} from '../primarySurfaceLease';
import type {
  PrimarySurfaceLease,
} from '../primarySurfaceLease';
import {
  isPresenceSessionId,
} from '../presenceSessionId';

type DatabaseProvider =
  () => Promise<SQLiteDatabase>;

type PrimarySurfaceLeaseRow = {
  presence_session_id: string;
  surface_id: string;
  generation: number;
  issued_at: number;
  expires_at: number;
  privacy_state: string;
};

const SELECT_COLUMNS = `
  presence_session_id,
  surface_id,
  generation,
  issued_at,
  expires_at,
  privacy_state
`;

function mapRow(
  row: PrimarySurfaceLeaseRow,
): PrimarySurfaceLease {
  const lease = parsePrimarySurfaceLease({
    presenceSessionId:
      row.presence_session_id,
    surfaceId: row.surface_id,
    generation: row.generation,
    issuedAt: row.issued_at,
    expiresAt: row.expires_at,
    privacyState: row.privacy_state,
  });

  if (!lease) {
    throw new Error(
      'Invalid persisted primary surface lease.',
    );
  }

  return lease;
}

function leasesEqual(
  left: PrimarySurfaceLease,
  right: PrimarySurfaceLease,
): boolean {
  return (
    left.presenceSessionId
      === right.presenceSessionId
    && left.surfaceId === right.surfaceId
    && left.generation === right.generation
    && left.issuedAt === right.issuedAt
    && left.expiresAt === right.expiresAt
    && left.privacyState === right.privacyState
  );
}

export class SQLitePrimarySurfaceLeaseRepository
  implements PrimarySurfaceLeaseRepository
{
  constructor(
    private readonly getDatabase:
      DatabaseProvider,
  ) {}

  async get(
    presenceSessionId: string,
  ): Promise<PrimarySurfaceLease | null> {
    if (!isPresenceSessionId(presenceSessionId)) {
      return null;
    }

    const database = await this.getDatabase();
    const row =
      await database
        .getFirstAsync<PrimarySurfaceLeaseRow>(
          `
            SELECT ${SELECT_COLUMNS}
            FROM primary_surface_leases
            WHERE presence_session_id = ?
            LIMIT 1
          `,
          [presenceSessionId],
        );

    return row
      ? mapRow(row)
      : null;
  }

  async save(
    input: PrimarySurfaceLease,
  ): Promise<void> {
    const safe =
      parsePrimarySurfaceLease(input);

    if (!safe) {
      throw new Error(
        'Invalid primary surface lease.',
      );
    }

    const database = await this.getDatabase();

    await database.withExclusiveTransactionAsync(
      async (transaction) => {
        const currentRow =
          await transaction
            .getFirstAsync<PrimarySurfaceLeaseRow>(
              `
                SELECT ${SELECT_COLUMNS}
                FROM primary_surface_leases
                WHERE presence_session_id = ?
                LIMIT 1
              `,
              [safe.presenceSessionId],
            );

        if (!currentRow) {
          if (safe.generation !== 0) {
            throw new Error(
              'Primary surface lease generation gap.',
            );
          }

          const inserted =
            await transaction.runAsync(
              `
                INSERT INTO primary_surface_leases (
                  presence_session_id,
                  surface_id,
                  generation,
                  issued_at,
                  expires_at,
                  privacy_state
                ) VALUES (?, ?, ?, ?, ?, ?)
              `,
              [
                safe.presenceSessionId,
                safe.surfaceId,
                safe.generation,
                safe.issuedAt,
                safe.expiresAt,
                safe.privacyState,
              ],
            );

          if (inserted.changes !== 1) {
            throw new Error(
              'Primary surface lease insert failed.',
            );
          }

          return;
        }

        const current = mapRow(currentRow);

        if (
          safe.generation === current.generation
        ) {
          if (leasesEqual(safe, current)) {
            return;
          }

          throw new Error(
            'Primary surface lease generation conflict.',
          );
        }

        if (
          safe.generation
          !== current.generation + 1
        ) {
          throw new Error(
            'Primary surface lease stale or generation gap.',
          );
        }

        if (
          safe.issuedAt < current.issuedAt
        ) {
          throw new Error(
            'Primary surface lease non-monotonic time.',
          );
        }

        if (
          current.expiresAt <= safe.issuedAt
        ) {
          throw new Error(
            'Primary surface previous lease inactive.',
          );
        }

        if (
          safe.privacyState
          !== current.privacyState
        ) {
          throw new Error(
            'Primary surface lease privacy mismatch.',
          );
        }

        const updated =
          await transaction.runAsync(
            `
              UPDATE primary_surface_leases
              SET
                surface_id = ?,
                generation = ?,
                issued_at = ?,
                expires_at = ?
              WHERE
                presence_session_id = ?
                AND generation = ?
                AND privacy_state = ?
            `,
            [
              safe.surfaceId,
              safe.generation,
              safe.issuedAt,
              safe.expiresAt,
              safe.presenceSessionId,
              current.generation,
              current.privacyState,
            ],
          );

        if (updated.changes !== 1) {
          throw new Error(
            'Primary surface lease concurrent update rejected.',
          );
        }
      },
    );
  }
}
