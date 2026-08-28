import type {
  SQLiteDatabase,
} from 'expo-sqlite';

type SchemaVersionRow = {
  user_version: number;
};

const LATEST_SCHEMA_VERSION = 4;

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

async function migrateToV1(
  database: SQLiteDatabase,
): Promise<void> {
  await database
    .withExclusiveTransactionAsync(
      async (transaction) => {
        await transaction.execAsync(
          migrationV1,
        );

        await transaction.execAsync(
          'PRAGMA user_version = 1;',
        );
      },
    );
}

async function migrateToV2(
  database: SQLiteDatabase,
): Promise<void> {
  await database
    .withExclusiveTransactionAsync(
      async (transaction) => {
        await transaction.execAsync(
          migrationV2,
        );

        await transaction.execAsync(
          'PRAGMA user_version = 2;',
        );
      },
    );
}

async function migrateToV3(
  database: SQLiteDatabase,
): Promise<void> {
  await database
    .withExclusiveTransactionAsync(
      async (transaction) => {
        await transaction.execAsync(
          migrationV3,
        );

        await transaction.execAsync(
          'PRAGMA user_version = 3;',
        );
      },
    );
}

async function migrateToV4(
  database: SQLiteDatabase,
): Promise<void> {
  await database
    .withExclusiveTransactionAsync(
      async (transaction) => {
        await transaction.execAsync(
          migrationV4,
        );

        await transaction.execAsync(
          'PRAGMA user_version = 4;',
        );
      },
    );
}

export async function runMigrations(
  database: SQLiteDatabase,
): Promise<void> {
  let version =
    await getSchemaVersion(database);

  if (
    version >
    LATEST_SCHEMA_VERSION
  ) {
    throw new Error(
      `Database schema ${version} is newer than supported version ${LATEST_SCHEMA_VERSION}`,
    );
  }

  if (version < 1) {
    await migrateToV1(database);
    version = 1;
  }

  if (version < 2) {
    await migrateToV2(database);
    version = 2;
  }

  if (version < 3) {
    await migrateToV3(database);
    version = 3;
  }

  if (version < 4) {
    await migrateToV4(database);
    version = 4;
  }

  if (
    version !==
    LATEST_SCHEMA_VERSION
  ) {
    throw new Error(
      `Database migration incomplete: ${version}`,
    );
  }
}
