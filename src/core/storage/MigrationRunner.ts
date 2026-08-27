import type { SQLiteDatabase } from 'expo-sqlite';

type SchemaVersionRow = {
  user_version: number;
};

const LATEST_SCHEMA_VERSION = 1;

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
      CHECK (role IN ('user', 'assistant', 'system')),
    kind TEXT NOT NULL DEFAULT 'text',
    text TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL,

    FOREIGN KEY (conversation_id)
      REFERENCES conversations(id)
      ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS
    idx_messages_conversation_created
  ON messages(conversation_id, created_at ASC);

  CREATE TABLE IF NOT EXISTS drafts (
    conversation_id TEXT PRIMARY KEY NOT NULL,
    text TEXT NOT NULL DEFAULT '',
    updated_at INTEGER NOT NULL,

    FOREIGN KEY (conversation_id)
      REFERENCES conversations(id)
      ON DELETE CASCADE
  );
`;

async function getSchemaVersion(
  database: SQLiteDatabase,
): Promise<number> {
  const row =
    await database.getFirstAsync<SchemaVersionRow>(
      'PRAGMA user_version;',
    );

  return row?.user_version ?? 0;
}

async function migrateToV1(
  database: SQLiteDatabase,
): Promise<void> {
  await database.withExclusiveTransactionAsync(
    async (transaction) => {
      await transaction.execAsync(migrationV1);
      await transaction.execAsync(
        'PRAGMA user_version = 1;',
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

  if (version < 1) {
    await migrateToV1(database);
    version = 1;
  }

  if (version !== LATEST_SCHEMA_VERSION) {
    throw new Error(
      `Database migration incomplete: ${version}`,
    );
  }
}
