import type { SQLiteDatabase } from 'expo-sqlite';

import {
  DraftRecord,
  DraftRepository,
} from '../../../contracts/DraftRepository';

type DraftRow = {
  conversation_id: string;
  text: string;
  updated_at: number;
};

type DatabaseProvider =
  () => Promise<SQLiteDatabase>;

export class SQLiteDraftRepository
  implements DraftRepository
{
  constructor(
    private readonly getDatabase: DatabaseProvider,
  ) {}

  async get(
    conversationId: string,
  ): Promise<DraftRecord | null> {
    const database = await this.getDatabase();

    const row =
      await database.getFirstAsync<DraftRow>(
        `
          SELECT
            conversation_id,
            text,
            updated_at
          FROM drafts
          WHERE conversation_id = ?
          LIMIT 1
        `,
        [conversationId],
      );

    if (!row) {
      return null;
    }

    return {
      conversationId: row.conversation_id,
      text: row.text,
      updatedAt: row.updated_at,
    };
  }

  async save(
    draft: DraftRecord,
  ): Promise<void> {
    const database = await this.getDatabase();

    await database.runAsync(
      `
        INSERT INTO drafts (
          conversation_id,
          text,
          updated_at
        )
        VALUES (?, ?, ?)
        ON CONFLICT(conversation_id)
        DO UPDATE SET
          text = excluded.text,
          updated_at = excluded.updated_at
      `,
      [
        draft.conversationId,
        draft.text,
        draft.updatedAt,
      ],
    );
  }

  async clear(
    conversationId: string,
  ): Promise<void> {
    const database = await this.getDatabase();

    await database.runAsync(
      `
        DELETE FROM drafts
        WHERE conversation_id = ?
      `,
      [conversationId],
    );
  }
}
