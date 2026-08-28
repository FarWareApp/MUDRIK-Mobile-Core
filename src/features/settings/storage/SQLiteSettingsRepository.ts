import type {
  SQLiteDatabase,
} from 'expo-sqlite';

import {
  AppSettings,
} from '../../../contracts/AppSettings';

import {
  SettingsRepository,
} from '../../../contracts/SettingsRepository';

type DatabaseProvider =
  () => Promise<SQLiteDatabase>;

type SettingRow = {
  key: string;
  value: string;
};

export class SQLiteSettingsRepository
  implements SettingsRepository
{
  constructor(
    private readonly getDatabase:
      DatabaseProvider,
  ) {}

  async getAll():
    Promise<Partial<AppSettings>> {
    const database =
      await this.getDatabase();

    const rows =
      await database.getAllAsync<SettingRow>(
        `
          SELECT key, value
          FROM app_settings
        `,
      );

    const settings:
      Partial<AppSettings> = {};

    for (const row of rows) {
      try {
        (
          settings as Record<
            string,
            unknown
          >
        )[row.key] =
          JSON.parse(row.value);
      } catch {
        // Ignore malformed settings.
      }
    }

    return settings;
  }

  async set<
    K extends keyof AppSettings,
  >(
    key: K,
    value: AppSettings[K],
  ): Promise<void> {
    const database =
      await this.getDatabase();

    await database.runAsync(
      `
        INSERT INTO app_settings (
          key,
          value,
          updated_at
        )
        VALUES (?, ?, ?)
        ON CONFLICT(key)
        DO UPDATE SET
          value = excluded.value,
          updated_at =
            excluded.updated_at
      `,
      [
        key,
        JSON.stringify(value),
        Date.now(),
      ],
    );
  }

  async remove(
    key: keyof AppSettings,
  ): Promise<void> {
    const database =
      await this.getDatabase();

    await database.runAsync(
      `
        DELETE FROM app_settings
        WHERE key = ?
      `,
      [key],
    );
  }

  async clear(): Promise<void> {
    const database =
      await this.getDatabase();

    await database.runAsync(
      'DELETE FROM app_settings',
    );
  }
}
