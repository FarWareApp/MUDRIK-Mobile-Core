import type {
  SQLiteDatabase,
} from 'expo-sqlite';

import type {
  CompanionProfile,
} from '../../../contracts/Companion';

import type {
  CompanionRepository,
} from '../../../contracts/CompanionRepository';

import {
  validateCompanionProfile,
} from '../../../core/companion/companionProfilePolicy';

type DatabaseProvider =
  () => Promise<SQLiteDatabase>;

type CompanionRow = {
  companion_id: string;
  enabled: number;
  display_name: string;
  presentation: CompanionProfile['presentation'];
  voice_preference: CompanionProfile['voicePreference'];
  voice_profile_id: string | null;
  avatar_profile_id: string | null;
  interaction_style: CompanionProfile['interactionStyle'];
  personality_preset: CompanionProfile['personalityPreset'];
  warmth: number;
  directness: number;
  humor: number;
  initiative: number;
  verbosity: number;
  speaking_rate: number;
  preferred_languages_json: string;
  memory_policy_id: string | null;
  presence_level: CompanionProfile['presenceLevel'];
  show_captions: number;
  revision: number;
  created_at: number;
  updated_at: number;
};

function parseLanguages(
  value: string,
): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function mapRow(
  row: CompanionRow,
): CompanionProfile {
  const validated =
    validateCompanionProfile({
      companionId: row.companion_id,
      enabled: row.enabled === 1,
      displayName: row.display_name,
      presentation: row.presentation,
      voicePreference: row.voice_preference,
      voiceProfileId: row.voice_profile_id,
      avatarProfileId: row.avatar_profile_id,
      interactionStyle: row.interaction_style,
      personalityPreset: row.personality_preset,
      warmth: row.warmth,
      directness: row.directness,
      humor: row.humor,
      initiative: row.initiative,
      verbosity: row.verbosity,
      speakingRate: row.speaking_rate,
      preferredLanguages:
        parseLanguages(
          row.preferred_languages_json,
        ),
      memoryPolicyId: row.memory_policy_id,
      presenceLevel: row.presence_level,
      showCaptions:
        row.show_captions === 1,
      revision: row.revision,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });

  if (
    !validated.accepted
    || !validated.profile
  ) {
    throw new Error(
      `Invalid persisted companion profile: ${validated.reason}`,
    );
  }

  return {
    ...validated.profile,
    preferredLanguages: [
      ...validated.profile
        .preferredLanguages,
    ],
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
              companion_id,
              enabled,
              display_name,
              presentation,
              voice_preference,
              voice_profile_id,
              avatar_profile_id,
              interaction_style,
              personality_preset,
              warmth,
              directness,
              humor,
              initiative,
              verbosity,
              speaking_rate,
              preferred_languages_json,
              memory_policy_id,
              presence_level,
              show_captions,
              revision,
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
    const validated =
      validateCompanionProfile(
        profile,
      );

    if (
      !validated.accepted
      || !validated.profile
    ) {
      throw new Error(
        `Invalid companion profile: ${validated.reason}`,
      );
    }

    const safe = validated.profile;
    const database =
      await this.getDatabase();

    const result =
      await database.runAsync(
        `
          INSERT INTO companion_profile (
            id,
            companion_id,
            enabled,
            display_name,
            presentation,
            voice_preference,
            voice_profile_id,
            avatar_profile_id,
            interaction_style,
            personality_preset,
            warmth,
            directness,
            humor,
            initiative,
            verbosity,
            speaking_rate,
            preferred_languages_json,
            memory_policy_id,
            presence_level,
            show_captions,
            revision,
            created_at,
            updated_at
          )
          VALUES (
            1,
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
          )
          ON CONFLICT(id)
          DO UPDATE SET
            companion_id = excluded.companion_id,
            enabled = excluded.enabled,
            display_name = excluded.display_name,
            presentation = excluded.presentation,
            voice_preference = excluded.voice_preference,
            voice_profile_id = excluded.voice_profile_id,
            avatar_profile_id = excluded.avatar_profile_id,
            interaction_style = excluded.interaction_style,
            personality_preset = excluded.personality_preset,
            warmth = excluded.warmth,
            directness = excluded.directness,
            humor = excluded.humor,
            initiative = excluded.initiative,
            verbosity = excluded.verbosity,
            speaking_rate = excluded.speaking_rate,
            preferred_languages_json = excluded.preferred_languages_json,
            memory_policy_id = excluded.memory_policy_id,
            presence_level = excluded.presence_level,
            show_captions = excluded.show_captions,
            revision = excluded.revision,
            updated_at = excluded.updated_at
          WHERE
            companion_profile.revision
            < excluded.revision
        `,
        [
          safe.companionId,
          safe.enabled ? 1 : 0,
          safe.displayName,
          safe.presentation,
          safe.voicePreference,
          safe.voiceProfileId,
          safe.avatarProfileId,
          safe.interactionStyle,
          safe.personalityPreset,
          safe.warmth,
          safe.directness,
          safe.humor,
          safe.initiative,
          safe.verbosity,
          safe.speakingRate,
          JSON.stringify(
            safe.preferredLanguages,
          ),
          safe.memoryPolicyId,
          safe.presenceLevel,
          safe.showCaptions
            ? 1
            : 0,
          safe.revision,
          safe.createdAt,
          safe.updatedAt,
        ],
      );

    if (result.changes !== 1) {
      throw new Error(
        'Stale companion profile update rejected.',
      );
    }
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
