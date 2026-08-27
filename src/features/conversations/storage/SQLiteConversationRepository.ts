import type { SQLiteDatabase } from 'expo-sqlite';

import {
  ConversationRecord,
  ConversationRepository,
  CreateConversationInput,
} from '../../../contracts/ConversationRepository';

type ConversationRow = {
  id: string;
  title: string;
  created_at: number;
  updated_at: number;
  is_archived: number;
  is_pinned: number;
};

type DatabaseProvider =
  () => Promise<SQLiteDatabase>;

function mapRow(
  row: ConversationRow,
): ConversationRecord {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isArchived: row.is_archived === 1,
    isPinned: row.is_pinned === 1,
  };
}

export class SQLiteConversationRepository
  implements ConversationRepository
{
  constructor(
    private readonly getDatabase: DatabaseProvider,
  ) {}

  async create(
    input: CreateConversationInput,
  ): Promise<void> {
    const database = await this.getDatabase();

    await database.runAsync(
      `
        INSERT INTO conversations (
          id,
          title,
          created_at,
          updated_at,
          is_archived,
          is_pinned
        )
        VALUES (?, ?, ?, ?, 0, 0)
      `,
      [
        input.id,
        input.title,
        input.createdAt,
        input.createdAt,
      ],
    );
  }

  async getById(
    id: string,
  ): Promise<ConversationRecord | null> {
    const database = await this.getDatabase();

    const row =
      await database.getFirstAsync<ConversationRow>(
        `
          SELECT
            id,
            title,
            created_at,
            updated_at,
            is_archived,
            is_pinned
          FROM conversations
          WHERE id = ?
          LIMIT 1
        `,
        [id],
      );

    return row ? mapRow(row) : null;
  }

  async getMostRecent():
    Promise<ConversationRecord | null> {
    const database = await this.getDatabase();

    const row =
      await database.getFirstAsync<ConversationRow>(
        `
          SELECT
            id,
            title,
            created_at,
            updated_at,
            is_archived,
            is_pinned
          FROM conversations
          WHERE is_archived = 0
          ORDER BY updated_at DESC
          LIMIT 1
        `,
      );

    return row ? mapRow(row) : null;
  }

  async list(
    limit = 500,
  ): Promise<ConversationRecord[]> {
    const database = await this.getDatabase();

    const safeLimit = Math.max(
      1,
      Math.min(limit, 500),
    );

    const rows =
      await database.getAllAsync<ConversationRow>(
        `
          SELECT
            id,
            title,
            created_at,
            updated_at,
            is_archived,
            is_pinned
          FROM conversations
          ORDER BY
            is_pinned DESC,
            updated_at DESC
          LIMIT ?
        `,
        [safeLimit],
      );

    return rows.map(mapRow);
  }

  async touch(
    id: string,
    updatedAt: number,
  ): Promise<void> {
    const database = await this.getDatabase();

    await database.runAsync(
      `
        UPDATE conversations
        SET updated_at = ?
        WHERE id = ?
      `,
      [updatedAt, id],
    );
  }

  async rename(
    id: string,
    title: string,
    updatedAt: number,
  ): Promise<void> {
    const database = await this.getDatabase();

    await database.runAsync(
      `
        UPDATE conversations
        SET title = ?, updated_at = ?
        WHERE id = ?
      `,
      [title, updatedAt, id],
    );
  }

  async setPinned(
    id: string,
    pinned: boolean,
    updatedAt: number,
  ): Promise<void> {
    const database = await this.getDatabase();

    await database.runAsync(
      `
        UPDATE conversations
        SET is_pinned = ?, updated_at = ?
        WHERE id = ?
      `,
      [pinned ? 1 : 0, updatedAt, id],
    );
  }

  async setArchived(
    id: string,
    archived: boolean,
    updatedAt: number,
  ): Promise<void> {
    const database = await this.getDatabase();

    await database.runAsync(
      `
        UPDATE conversations
        SET is_archived = ?, updated_at = ?
        WHERE id = ?
      `,
      [archived ? 1 : 0, updatedAt, id],
    );
  }

  async delete(
    id: string,
  ): Promise<void> {
    const database = await this.getDatabase();

    await database.runAsync(
      `
        DELETE FROM conversations
        WHERE id = ?
      `,
      [id],
    );
  }
}
