import type { SQLiteDatabase } from 'expo-sqlite';

import {
  AttachmentRecord,
} from '../../../contracts/Attachment';
import {
  AttachmentRepository,
} from '../../../contracts/AttachmentRepository';

type DatabaseProvider =
  () => Promise<SQLiteDatabase>;

type AttachmentRow = {
  id: string;
  kind: AttachmentRecord['kind'];
  source: AttachmentRecord['source'];
  name: string;
  mime_type: string | null;
  size_bytes: number | null;
  local_uri: string;
  width: number | null;
  height: number | null;
  duration_ms: number | null;
  created_at: number;
};

function mapRow(
  row: AttachmentRow,
): AttachmentRecord {
  return {
    id: row.id,
    kind: row.kind,
    source: row.source,
    name: row.name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    localUri: row.local_uri,
    width: row.width,
    height: row.height,
    durationMs: row.duration_ms,
    createdAt: row.created_at,
  };
}

export class SQLiteAttachmentRepository
  implements AttachmentRepository
{
  constructor(
    private readonly getDatabase:
      DatabaseProvider,
  ) {}

  async save(
    attachment: AttachmentRecord,
  ): Promise<void> {
    const database =
      await this.getDatabase();

    await database.runAsync(
      `
        INSERT INTO attachments (
          id, kind, source, name,
          mime_type, size_bytes, local_uri,
          width, height, duration_ms, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        attachment.id,
        attachment.kind,
        attachment.source,
        attachment.name,
        attachment.mimeType,
        attachment.sizeBytes,
        attachment.localUri,
        attachment.width,
        attachment.height,
        attachment.durationMs,
        attachment.createdAt,
      ],
    );
  }

  async getById(
    id: string,
  ): Promise<AttachmentRecord | null> {
    const database =
      await this.getDatabase();

    const row =
      await database.getFirstAsync<AttachmentRow>(
        `
          SELECT *
          FROM attachments
          WHERE id = ?
          LIMIT 1
        `,
        [id],
      );

    return row ? mapRow(row) : null;
  }

  async listForMessage(
    messageId: string,
  ): Promise<AttachmentRecord[]> {
    const database =
      await this.getDatabase();

    const rows =
      await database.getAllAsync<AttachmentRow>(
        `
          SELECT a.*
          FROM attachments a
          INNER JOIN message_attachments ma
            ON ma.attachment_id = a.id
          WHERE ma.message_id = ?
          ORDER BY ma.position ASC
        `,
        [messageId],
      );

    return rows.map(mapRow);
  }

  async listForDraft(
    conversationId: string,
  ): Promise<AttachmentRecord[]> {
    const database =
      await this.getDatabase();

    const rows =
      await database.getAllAsync<AttachmentRow>(
        `
          SELECT a.*
          FROM attachments a
          INNER JOIN draft_attachments da
            ON da.attachment_id = a.id
          WHERE da.conversation_id = ?
          ORDER BY da.position ASC
        `,
        [conversationId],
      );

    return rows.map(mapRow);
  }

  async attachToMessage(
    messageId: string,
    attachmentIds: string[],
  ): Promise<void> {
    const database =
      await this.getDatabase();

    await database.withExclusiveTransactionAsync(
      async (transaction) => {
        await transaction.runAsync(
          `
            DELETE FROM message_attachments
            WHERE message_id = ?
          `,
          [messageId],
        );

        for (
          let index = 0;
          index < attachmentIds.length;
          index += 1
        ) {
          await transaction.runAsync(
            `
              INSERT INTO message_attachments (
                message_id,
                attachment_id,
                position
              )
              VALUES (?, ?, ?)
            `,
            [
              messageId,
              attachmentIds[index],
              index,
            ],
          );
        }
      },
    );
  }

  async setDraftAttachments(
    conversationId: string,
    attachmentIds: string[],
  ): Promise<void> {
    const database =
      await this.getDatabase();

    await database.withExclusiveTransactionAsync(
      async (transaction) => {
        await transaction.runAsync(
          `
            DELETE FROM draft_attachments
            WHERE conversation_id = ?
          `,
          [conversationId],
        );

        for (
          let index = 0;
          index < attachmentIds.length;
          index += 1
        ) {
          await transaction.runAsync(
            `
              INSERT INTO draft_attachments (
                conversation_id,
                attachment_id,
                position
              )
              VALUES (?, ?, ?)
            `,
            [
              conversationId,
              attachmentIds[index],
              index,
            ],
          );
        }
      },
    );
  }

  async delete(
    id: string,
  ): Promise<void> {
    const database =
      await this.getDatabase();

    await database.runAsync(
      `
        DELETE FROM attachments
        WHERE id = ?
      `,
      [id],
    );
  }

  async listOrphans():
    Promise<AttachmentRecord[]> {
    const database =
      await this.getDatabase();

    const rows =
      await database.getAllAsync<AttachmentRow>(
        `
          SELECT a.*
          FROM attachments a
          LEFT JOIN message_attachments ma
            ON ma.attachment_id = a.id
          LEFT JOIN draft_attachments da
            ON da.attachment_id = a.id
          WHERE
            ma.attachment_id IS NULL
            AND da.attachment_id IS NULL
        `,
      );

    return rows.map(mapRow);
  }
}
