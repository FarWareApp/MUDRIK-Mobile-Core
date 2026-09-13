import type {
  SQLiteDatabase,
} from 'expo-sqlite';

import {
  migrationV9Presence,
} from './migrations/migrationV9Presence';

type SchemaVersionRow = {
  user_version: number;
};

const LATEST_SCHEMA_VERSION = 9;

const migrationV1 = `
  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    is_archived INTEGER NOT NULL DEFAULT 0
      CHECK (is_archived IN (0, 1)),
    is_pinned INTEGER NOT NULL DEFAULT 0
      CHECK (is_pinned IN (0, 1))
  );

  CREATE INDEX IF NOT EXISTS
    idx_conversations_updated_at
  ON conversations(updated_at DESC);

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY NOT NULL,
    conversation_id TEXT NOT NULL,
    role TEXT NOT NULL
      CHECK (
        role IN (
          'user',
          'assistant',
          'system'
        )
      ),
    kind TEXT NOT NULL DEFAULT 'text',
    text TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL,

    FOREIGN KEY (conversation_id)
      REFERENCES conversations(id)
      ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS
    idx_messages_conversation_created
  ON messages(
    conversation_id,
    created_at ASC
  );

  CREATE TABLE IF NOT EXISTS drafts (
    conversation_id TEXT
      PRIMARY KEY NOT NULL,
    text TEXT NOT NULL DEFAULT '',
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (conversation_id)
      REFERENCES conversations(id)
      ON DELETE CASCADE
  );
`;

const migrationV2 = `
  CREATE TABLE IF NOT EXISTS attachments (
    id TEXT PRIMARY KEY NOT NULL,
    kind TEXT NOT NULL
      CHECK (
        kind IN (
          'image',
          'video',
          'document'
        )
      ),
    source TEXT NOT NULL
      CHECK (
        source IN (
          'library',
          'camera',
          'document'
        )
      ),
    name TEXT NOT NULL,
    mime_type TEXT,
    size_bytes INTEGER,
    local_uri TEXT NOT NULL UNIQUE,
    width INTEGER,
    height INTEGER,
    duration_ms INTEGER,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS
    message_attachments (
      message_id TEXT NOT NULL,
      attachment_id TEXT NOT NULL,
      position INTEGER NOT NULL,
      PRIMARY KEY (
        message_id,
        attachment_id
      ),
      FOREIGN KEY (message_id)
        REFERENCES messages(id)
        ON DELETE CASCADE,
      FOREIGN KEY (attachment_id)
        REFERENCES attachments(id)
        ON DELETE CASCADE
    );

  CREATE INDEX IF NOT EXISTS
    idx_message_attachments_position
  ON message_attachments(
    message_id,
    position ASC
  );

  CREATE TABLE IF NOT EXISTS
    draft_attachments (
      conversation_id TEXT NOT NULL,
      attachment_id TEXT NOT NULL,
      position INTEGER NOT NULL,
      PRIMARY KEY (
        conversation_id,
        attachment_id
      ),
      FOREIGN KEY (conversation_id)
        REFERENCES conversations(id)
        ON DELETE CASCADE,
      FOREIGN KEY (attachment_id)
        REFERENCES attachments(id)
        ON DELETE CASCADE
    );

  CREATE INDEX IF NOT EXISTS
    idx_draft_attachments_position
  ON draft_attachments(
    conversation_id,
    position ASC
  );
`;

const migrationV3 = `
  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
`;

const migrationV4 = `
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    is_archived INTEGER NOT NULL DEFAULT 0
      CHECK (is_archived IN (0, 1))
  );

  CREATE INDEX IF NOT EXISTS
    idx_projects_updated_at
  ON projects(
    is_archived ASC,
    updated_at DESC
  );

  CREATE TABLE IF NOT EXISTS project_conversations (
    project_id TEXT NOT NULL,
    conversation_id TEXT NOT NULL UNIQUE,
    linked_at INTEGER NOT NULL,
    PRIMARY KEY (
      project_id,
      conversation_id
    ),
    FOREIGN KEY (project_id)
      REFERENCES projects(id)
      ON DELETE CASCADE,
    FOREIGN KEY (conversation_id)
      REFERENCES conversations(id)
      ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS
    idx_project_conversations_project
  ON project_conversations(project_id);

  CREATE TABLE IF NOT EXISTS project_attachments (
    project_id TEXT NOT NULL,
    attachment_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    linked_at INTEGER NOT NULL,
    PRIMARY KEY (
      project_id,
      attachment_id
    ),
    FOREIGN KEY (project_id)
      REFERENCES projects(id)
      ON DELETE CASCADE,
    FOREIGN KEY (attachment_id)
      REFERENCES attachments(id)
      ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS
    idx_project_attachments_project
  ON project_attachments(
    project_id,
    position ASC
  );
`;

const migrationV5 = `
  CREATE TABLE IF NOT EXISTS companion_profile (
    id INTEGER PRIMARY KEY NOT NULL
      CHECK (id = 1),
    display_name TEXT NOT NULL,
    presentation TEXT NOT NULL
      CHECK (
        presentation IN (
          'male',
          'female'
        )
      ),
    voice_preference TEXT NOT NULL
      CHECK (
        voice_preference IN (
          'auto',
          'male',
          'female'
        )
      ),
    interaction_style TEXT NOT NULL
      CHECK (
        interaction_style IN (
          'balanced',
          'warm',
          'calm',
          'direct'
        )
      ),
    show_captions INTEGER NOT NULL
      CHECK (show_captions IN (0, 1)),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
`;

const migrationV6 = `
  CREATE TABLE IF NOT EXISTS diagnostic_events (
    id TEXT PRIMARY KEY NOT NULL,
    timestamp INTEGER NOT NULL,
    module TEXT NOT NULL,
    event TEXT NOT NULL,
    level TEXT NOT NULL
      CHECK (
        level IN (
          'info',
          'warning',
          'error'
        )
      )
  );

  CREATE INDEX IF NOT EXISTS
    idx_diagnostic_events_timestamp
  ON diagnostic_events(
    timestamp DESC
  );
`;

const migrationV7 = `
  CREATE TABLE IF NOT EXISTS observation_privacy_state (
    id INTEGER PRIMARY KEY NOT NULL
      CHECK (id = 1),
    state TEXT NOT NULL
      CHECK (
        state IN (
          'active',
          'visual_off',
          'ambient_off',
          'privacy_lock'
        )
      ),
    reason TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );

  INSERT OR IGNORE INTO observation_privacy_state (
    id,
    state,
    reason,
    updated_at
  ) VALUES (
    1,
    'ambient_off',
    'default_passive_observation_off',
    0
  );
`;

const migrationV8 = `
  ALTER TABLE companion_profile
    ADD COLUMN companion_id TEXT NOT NULL
    DEFAULT 'companion_primary'
    CHECK (companion_id = 'companion_primary');

  ALTER TABLE companion_profile
    ADD COLUMN enabled INTEGER NOT NULL
    DEFAULT 1
    CHECK (enabled IN (0, 1));

  ALTER TABLE companion_profile
    ADD COLUMN voice_profile_id TEXT;

  ALTER TABLE companion_profile
    ADD COLUMN avatar_profile_id TEXT;

  ALTER TABLE companion_profile
    ADD COLUMN personality_preset TEXT NOT NULL
    DEFAULT 'balanced'
    CHECK (
      personality_preset IN (
        'balanced',
        'professional',
        'calm',
        'friendly',
        'minimal',
        'coach',
        'study_partner',
        'creative_partner'
      )
    );

  ALTER TABLE companion_profile
    ADD COLUMN warmth INTEGER NOT NULL
    DEFAULT 55
    CHECK (warmth BETWEEN 0 AND 100);

  ALTER TABLE companion_profile
    ADD COLUMN directness INTEGER NOT NULL
    DEFAULT 55
    CHECK (directness BETWEEN 0 AND 100);

  ALTER TABLE companion_profile
    ADD COLUMN humor INTEGER NOT NULL
    DEFAULT 20
    CHECK (humor BETWEEN 0 AND 100);

  ALTER TABLE companion_profile
    ADD COLUMN initiative INTEGER NOT NULL
    DEFAULT 20
    CHECK (initiative BETWEEN 0 AND 100);

  ALTER TABLE companion_profile
    ADD COLUMN verbosity INTEGER NOT NULL
    DEFAULT 50
    CHECK (verbosity BETWEEN 0 AND 100);

  ALTER TABLE companion_profile
    ADD COLUMN speaking_rate REAL NOT NULL
    DEFAULT 1.0
    CHECK (
      speaking_rate >= 0.5
      AND speaking_rate <= 2.0
    );

  ALTER TABLE companion_profile
    ADD COLUMN preferred_languages_json TEXT NOT NULL
    DEFAULT '[]';

  ALTER TABLE companion_profile
    ADD COLUMN memory_policy_id TEXT;

  ALTER TABLE companion_profile
    ADD COLUMN presence_level TEXT NOT NULL
    DEFAULT 'normal'
    CHECK (
      presence_level IN (
        'silent',
        'normal',
        'helpful',
        'active'
      )
    );

  ALTER TABLE companion_profile
    ADD COLUMN revision INTEGER NOT NULL
    DEFAULT 1
    CHECK (revision >= 1);
`;

async function getSchemaVersion(
  database: SQLiteDatabase,
): Promise<number> {
  const row =
    await database
      .getFirstAsync<SchemaVersionRow>(
        'PRAGMA user_version;',
      );

  return row?.user_version ?? 0;
}

async function applyMigration(
  database: SQLiteDatabase,
  version: number,
  sql: string,
): Promise<void> {
  await database.withExclusiveTransactionAsync(
    async (transaction) => {
      await transaction.execAsync(sql);
      await transaction.execAsync(
        `PRAGMA user_version = ${version};`,
      );
    },
  );
}

export async function runMigrations(
  database: SQLiteDatabase,
): Promise<void> {
  let version = await getSchemaVersion(database);

  if (version > LATEST_SCHEMA_VERSION) {
    throw new Error(
      `Database schema ${version} is newer than supported version ${LATEST_SCHEMA_VERSION}`,
    );
  }

  const migrations = [
    migrationV1,
    migrationV2,
    migrationV3,
    migrationV4,
    migrationV5,
    migrationV6,
    migrationV7,
    migrationV8,
    migrationV9Presence,
  ];

  while (
    version < LATEST_SCHEMA_VERSION
  ) {
    const nextVersion = version + 1;
    const sql = migrations[nextVersion - 1];

    if (!sql) {
      throw new Error(
        `Missing database migration ${nextVersion}`,
      );
    }

    await applyMigration(
      database,
      nextVersion,
      sql,
    );

    version = nextVersion;
  }

  if (version !== LATEST_SCHEMA_VERSION) {
    throw new Error(
      `Database migration incomplete: ${version}`,
    );
  }
}
