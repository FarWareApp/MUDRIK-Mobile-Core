import type {
  SQLiteDatabase,
} from 'expo-sqlite';

import {
  ProjectConversationRepository,
} from '../../../contracts/ProjectConversationRepository';

type DatabaseProvider =
  () => Promise<SQLiteDatabase>;

type ProjectIdRow = {
  project_id: string;
};

type ConversationIdRow = {
  conversation_id: string;
};

export class SQLiteProjectConversationRepository
  implements ProjectConversationRepository
{
  constructor(
    private readonly getDatabase:
      DatabaseProvider,
  ) {}

  async link(
    projectId: string,
    conversationId: string,
  ): Promise<void> {
    const db =
      await this.getDatabase();

    await db.runAsync(
      `
        INSERT INTO project_conversations (
          project_id,
          conversation_id,
          linked_at
        )
        VALUES (?, ?, ?)
        ON CONFLICT(conversation_id)
        DO UPDATE SET
          project_id =
            excluded.project_id,
          linked_at =
            excluded.linked_at
      `,
      [
        projectId,
        conversationId,
        Date.now(),
      ],
    );
  }

  async unlink(
    conversationId: string,
  ): Promise<void> {
    const db =
      await this.getDatabase();

    await db.runAsync(
      `
        DELETE FROM project_conversations
        WHERE conversation_id = ?
      `,
      [conversationId],
    );
  }

  async getProjectIdForConversation(
    conversationId: string,
  ): Promise<string | null> {
    const db =
      await this.getDatabase();

    const row =
      await db.getFirstAsync<ProjectIdRow>(
        `
          SELECT project_id
          FROM project_conversations
          WHERE conversation_id = ?
          LIMIT 1
        `,
        [conversationId],
      );

    return row?.project_id ?? null;
  }

  async listConversationIds(
    projectId: string,
  ): Promise<string[]> {
    const db =
      await this.getDatabase();

    const rows =
      await db.getAllAsync<ConversationIdRow>(
        `
          SELECT conversation_id
          FROM project_conversations
          WHERE project_id = ?
          ORDER BY linked_at DESC
        `,
        [projectId],
      );

    return rows.map(
      (row) =>
        row.conversation_id,
    );
  }
}
