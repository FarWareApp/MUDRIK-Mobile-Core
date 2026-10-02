export const migrationV10Memory = `
  CREATE TABLE IF NOT EXISTS memory_snapshots (
    account_id TEXT PRIMARY KEY NOT NULL,
    snapshot_revision INTEGER NOT NULL
      CHECK (snapshot_revision >= 1),
    integrity_digest TEXT NOT NULL
      CHECK (
        length(integrity_digest) = 64
      ),
    payload_json TEXT NOT NULL,
    written_at INTEGER NOT NULL
      CHECK (written_at >= 0)
  );

  CREATE INDEX IF NOT EXISTS
    idx_memory_snapshots_written_at
  ON memory_snapshots(
    written_at DESC
  );
`;
