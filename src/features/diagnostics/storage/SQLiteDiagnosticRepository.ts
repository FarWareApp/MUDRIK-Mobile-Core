import type {
  SQLiteDatabase,
} from 'expo-sqlite';

import {
  DiagnosticEvent,
} from '../../../contracts/Diagnostics';

import {
  DiagnosticRepository,
} from '../../../contracts/DiagnosticRepository';

type DatabaseProvider =
  () => Promise<SQLiteDatabase>;

type DiagnosticRow = {
  id: string;
  timestamp: number;
  module: string;
  event: string;

  level:
    DiagnosticEvent['level'];
};

export class SQLiteDiagnosticRepository
  implements DiagnosticRepository
{
  constructor(
    private readonly getDatabase:
      DatabaseProvider,
  ) {}

  async append(
    event: DiagnosticEvent,
  ): Promise<void> {
    const db =
      await this.getDatabase();

    await db.runAsync(
      `
        INSERT OR REPLACE INTO
          diagnostic_events (
            id,
            timestamp,
            module,
            event,
            level
          )
        VALUES (?, ?, ?, ?, ?)
      `,
      [
        event.id,
        event.timestamp,
        event.module,
        event.event,
        event.level,
      ],
    );
  }

  async list(
    limit: number,
  ): Promise<DiagnosticEvent[]> {
    const db =
      await this.getDatabase();

    const rows =
      await db
        .getAllAsync<DiagnosticRow>(
          `
            SELECT
              id,
              timestamp,
              module,
              event,
              level
            FROM diagnostic_events
            ORDER BY timestamp DESC
            LIMIT ?
          `,
          [limit],
        );

    return rows;
  }

  async trim(
    limit: number,
  ): Promise<void> {
    const db =
      await this.getDatabase();

    await db.runAsync(
      `
        DELETE FROM diagnostic_events
        WHERE id NOT IN (
          SELECT id
          FROM diagnostic_events
          ORDER BY timestamp DESC
          LIMIT ?
        )
      `,
      [limit],
    );
  }

  async clear():
    Promise<void> {
    const db =
      await this.getDatabase();

    await db.runAsync(
      `
        DELETE FROM diagnostic_events
      `,
    );
  }
}
