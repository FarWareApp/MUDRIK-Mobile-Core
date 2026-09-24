import type {
  SQLiteDatabase,
} from 'expo-sqlite';

import {
  isIdentityId,
} from '../../identity/identityIds';
import type {
  TrustedSurfaceRepository,
} from '../TrustedSurfaceRepository';
import {
  isSurfaceId,
} from '../surfaceContract';
import {
  parseTrustedSurfaceRecord,
} from '../trustedSurfaceRecord';
import type {
  TrustedSurfaceRecord,
} from '../trustedSurfaceRecord';

type DatabaseProvider =
  () => Promise<SQLiteDatabase>;

type TrustedSurfaceRow = {
  surface_id: string;
  account_id: string;
  device_id: string;
  kind: string;
  privacy_class: string;
  capabilities_json: string;
  shared_space: number;
  revision: number;
  approved_at: number;
  state: string;
};

const SELECT_COLUMNS = `
  surface_id,
  account_id,
  device_id,
  kind,
  privacy_class,
  capabilities_json,
  shared_space,
  revision,
  approved_at,
  state
`;

function parseCapabilities(
  value: string,
): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function mapRow(
  row: TrustedSurfaceRow,
): TrustedSurfaceRecord {
  const record = parseTrustedSurfaceRecord({
    accountId: row.account_id,
    surface: {
      surfaceId: row.surface_id,
      deviceId: row.device_id,
      kind: row.kind,
      privacyClass: row.privacy_class,
      capabilities: parseCapabilities(
        row.capabilities_json,
      ),
      sharedSpace: row.shared_space === 1,
    },
    revision: row.revision,
    approvedAt: row.approved_at,
    state: row.state,
  });

  if (!record) {
    throw new Error(
      'Invalid persisted trusted surface record.',
    );
  }

  return record;
}

function serializeCapabilities(
  record: TrustedSurfaceRecord,
): string {
  return JSON.stringify(
    record.surface.capabilities,
  );
}

export class SQLiteTrustedSurfaceRepository
  implements TrustedSurfaceRepository
{
  constructor(
    private readonly getDatabase:
      DatabaseProvider,
  ) {}

  async get(
    surfaceId: string,
  ): Promise<TrustedSurfaceRecord | null> {
    if (!isSurfaceId(surfaceId)) {
      return null;
    }

    const database = await this.getDatabase();
    const row =
      await database
        .getFirstAsync<TrustedSurfaceRow>(
          `
            SELECT ${SELECT_COLUMNS}
            FROM trusted_surfaces
            WHERE surface_id = ?
            LIMIT 1
          `,
          [surfaceId],
        );

    return row
      ? mapRow(row)
      : null;
  }

  async listForAccount(
    accountId: string,
  ): Promise<readonly TrustedSurfaceRecord[]> {
    if (!isIdentityId('account', accountId)) {
      return Object.freeze([]);
    }

    const database = await this.getDatabase();
    const rows =
      await database
        .getAllAsync<TrustedSurfaceRow>(
          `
            SELECT ${SELECT_COLUMNS}
            FROM trusted_surfaces
            WHERE account_id = ?
            ORDER BY surface_id ASC
          `,
          [accountId],
        );

    return Object.freeze(
      rows.map(mapRow),
    );
  }

  async save(
    input: TrustedSurfaceRecord,
  ): Promise<void> {
    const safe =
      parseTrustedSurfaceRecord(input);

    if (!safe) {
      throw new Error(
        'Invalid trusted surface record.',
      );
    }

    const database = await this.getDatabase();

    await database.withExclusiveTransactionAsync(
      async (transaction) => {
        const currentRow =
          await transaction
            .getFirstAsync<TrustedSurfaceRow>(
              `
                SELECT ${SELECT_COLUMNS}
                FROM trusted_surfaces
                WHERE surface_id = ?
                LIMIT 1
              `,
              [safe.surface.surfaceId],
            );

        if (!currentRow) {
          if (safe.revision !== 1) {
            throw new Error(
              'Trusted surface revision gap.',
            );
          }

          const inserted =
            await transaction.runAsync(
              `
                INSERT INTO trusted_surfaces (
                  surface_id,
                  account_id,
                  device_id,
                  kind,
                  privacy_class,
                  capabilities_json,
                  shared_space,
                  revision,
                  approved_at,
                  state
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `,
              [
                safe.surface.surfaceId,
                safe.accountId,
                safe.surface.deviceId,
                safe.surface.kind,
                safe.surface.privacyClass,
                serializeCapabilities(safe),
                safe.surface.sharedSpace ? 1 : 0,
                safe.revision,
                safe.approvedAt,
                safe.state,
              ],
            );

          if (inserted.changes !== 1) {
            throw new Error(
              'Trusted surface insert failed.',
            );
          }

          return;
        }

        const current = mapRow(currentRow);

        if (
          current.accountId !== safe.accountId
          || current.surface.deviceId
            !== safe.surface.deviceId
        ) {
          throw new Error(
            'Trusted surface binding mismatch.',
          );
        }

        if (
          safe.revision
          !== current.revision + 1
        ) {
          throw new Error(
            'Trusted surface stale or revision gap.',
          );
        }

        if (
          safe.approvedAt < current.approvedAt
        ) {
          throw new Error(
            'Trusted surface non-monotonic approval.',
          );
        }

        const updated =
          await transaction.runAsync(
            `
              UPDATE trusted_surfaces
              SET
                kind = ?,
                privacy_class = ?,
                capabilities_json = ?,
                shared_space = ?,
                revision = ?,
                approved_at = ?,
                state = ?
              WHERE
                surface_id = ?
                AND account_id = ?
                AND device_id = ?
                AND revision = ?
            `,
            [
              safe.surface.kind,
              safe.surface.privacyClass,
              serializeCapabilities(safe),
              safe.surface.sharedSpace ? 1 : 0,
              safe.revision,
              safe.approvedAt,
              safe.state,
              safe.surface.surfaceId,
              safe.accountId,
              safe.surface.deviceId,
              current.revision,
            ],
          );

        if (updated.changes !== 1) {
          throw new Error(
            'Trusted surface concurrent update rejected.',
          );
        }
      },
    );
  }
}
