import type {
  SQLiteDatabase,
} from 'expo-sqlite';

import {
  CompanionProfile,
} from '../../../contracts/Companion';

import {
  CompanionRepository,
} from '../../../contracts/CompanionRepository';

type DatabaseProvider =
  () => Promise<SQLiteDatabase>;

type CompanionRow = {
  display_name: string;

  presentation:
    CompanionProfile[
      'presentation'
    ];

  voice_preference:
    CompanionProfile[
      'voicePreference'
    ];

  interaction_style:
    CompanionProfile[
      'interactionStyle'
    ];

  show_captions: number;

  created_at: number;
  updated_at: number;
};

function mapRow(
  row: CompanionRow,
): CompanionProfile {
  return {
    displayName:
      row.display_name,

    presentation:
      row.presentation,

    voicePreference:
      row.voice_preference,

    interactionStyle:
      row.interaction_style,

    showCaptions:
      row.show_captions === 1,

    createdAt:
      row.created_at,

    updatedAt:
      row.updated_at,
  };
}

export class SQLiteCompanionRepository
  implements CompanionRepository
{
  constructor(
    private readonly getDatabase:
      DatabaseProvider,
  ) {}

  async getProfile():
    Promise<CompanionProfile | null> {
    const database =
      await this.getDatabase();

    const row =
      await database
        .getFirstAsync<CompanionRow>(
          `
            SELECT
              display_name,
              presentation,
              voice_preference,
              interaction_style,
              show_captions,
              created_at,
              updated_at
            FROM companion_profile
            WHERE id = 1
            LIMIT 1
          `,
        );

    return row
      ? mapRow(row)
      : null;
  }

  async saveProfile(
    profile: CompanionProfile,
  ): Promise<void> {
    const database =
      await this.getDatabase();

    await database.runAsync(
      `
        INSERT INTO companion_profile (
          id,
          display_name,
          presentation,
          voice_preference,
          interaction_style,
          show_captions,
          created_at,
          updated_at
        )
        VALUES (
          1,
          ?, ?, ?, ?, ?, ?, ?
        )
        ON CONFLICT(id)
        DO UPDATE SET
          display_name =
            excluded.display_name,
          presentation =
            excluded.presentation,
          voice_preference =
            excluded.voice_preference,
          interaction_style =
            excluded.interaction_style,
          show_captions =
            excluded.show_captions,
          updated_at =
            excluded.updated_at
      `,
      [
        profile.displayName,
        profile.presentation,
        profile.voicePreference,
        profile.interactionStyle,
        profile.showCaptions
          ? 1
          : 0,
        profile.createdAt,
        profile.updatedAt,
      ],
    );
  }

  async clearProfile():
    Promise<void> {
    const database =
      await this.getDatabase();

    await database.runAsync(
      `
        DELETE FROM companion_profile
        WHERE id = 1
      `,
    );
  }
}
