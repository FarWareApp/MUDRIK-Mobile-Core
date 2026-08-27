import type { SQLiteDatabase } from 'expo-sqlite';

import {
  MessageRepository,
  StoredMessage,
} from '../../../contracts/MessageRepository';

type MessageRow = {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  kind: string;
  text: string;
  created_at: number;
};

type DatabaseProvider =
  () => Promise<SQLiteDatabase>;

function mapRow(
  row: MessageRow,
): StoredMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    kind: row.kind,
    text: row.text,
    createdAt: row.created_at,
  };
}

export class SQLiteMessageRepository
  implements MessageRepository
{
  constructor(
    private readonly getDatabase: DatabaseProvider,
  ) {}

  async save(
    message: StoredMessage,
  ): Promise<void> {
    const database = await this.getDatabase();

    await database.runAsync(
      `
        INSERT OR REPLACE INTO messages (
          id,
          conversation_id,
          role,
          kind,
          text,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        message.id,
        message.conversationId,
        message.role,
        message.kind,
        message.text,
        message.createdAt,
      ],
    );
  }

  async listByConversation(
    conversationId: string,
  ): Promise<StoredMessage[]> {
    const database = await this.getDatabase();

    const rows =
      await database.getAllAsync<MessageRow>(
        `
          SELECT
            id,
            conversation_id,
            role,
            kind,
            text,
            created_at
          FROM messages
          WHERE conversation_id = ?
          ORDER BY created_at ASC
        `,
        [conversationId],
      );

    return rows.map(mapRow);
  }

  async deleteByConversation(
    conversationId: string,
  ): Promise<void> {
    const database = await this.getDatabase();

    await database.runAsync(
      `
        DELETE FROM messages
        WHERE conversation_id = ?
      `,
      [conversationId],
    );
  }
}
