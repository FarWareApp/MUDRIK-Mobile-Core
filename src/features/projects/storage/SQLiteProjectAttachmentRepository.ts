import type {
  SQLiteDatabase,
} from 'expo-sqlite';

import {
  AttachmentRecord,
} from '../../../contracts/Attachment';

import {
  ProjectAttachmentRepository,
} from '../../../contracts/ProjectAttachmentRepository';

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

export class SQLiteProjectAttachmentRepository
  implements ProjectAttachmentRepository
{
  constructor(
    private readonly getDatabase:
      DatabaseProvider,
  ) {}

  async setAttachments(
    projectId: string,
    attachmentIds: string[],
  ): Promise<void> {
    const db =
      await this.getDatabase();

    await db.withExclusiveTransactionAsync(
      async (transaction) => {
        await transaction.runAsync(
          `
            DELETE FROM project_attachments
            WHERE project_id = ?
          `,
          [projectId],
        );

        for (
          let index = 0;
          index < attachmentIds.length;
          index += 1
        ) {
          await transaction.runAsync(
            `
              INSERT INTO project_attachments (
                project_id,
                attachment_id,
                position,
                linked_at
              )
              VALUES (?, ?, ?, ?)
            `,
            [
              projectId,
              attachmentIds[index],
              index,
              Date.now(),
            ],
          );
        }
      },
    );
  }

  async add(
    projectId: string,
    attachmentId: string,
  ): Promise<void> {
    const db =
      await this.getDatabase();

    const row =
      await db.getFirstAsync<{
        next_position: number;
      }>(
        `
          SELECT
            COALESCE(
              MAX(position) + 1,
              0
            ) AS next_position
          FROM project_attachments
          WHERE project_id = ?
        `,
        [projectId],
      );

    await db.runAsync(
      `
        INSERT OR IGNORE INTO
          project_attachments (
            project_id,
            attachment_id,
            position,
            linked_at
          )
        VALUES (?, ?, ?, ?)
      `,
      [
        projectId,
        attachmentId,
        row?.next_position ?? 0,
        Date.now(),
      ],
    );
  }

  async remove(
    projectId: string,
    attachmentId: string,
  ): Promise<void> {
    const db =
      await this.getDatabase();

    await db.runAsync(
      `
        DELETE FROM project_attachments
        WHERE
          project_id = ?
          AND attachment_id = ?
      `,
      [
        projectId,
        attachmentId,
      ],
    );
  }

  async list(
    projectId: string,
  ): Promise<AttachmentRecord[]> {
    const db =
      await this.getDatabase();

    const rows =
      await db.getAllAsync<AttachmentRow>(
        `
          SELECT a.*
          FROM attachments a
          INNER JOIN project_attachments pa
            ON pa.attachment_id = a.id
          WHERE pa.project_id = ?
          ORDER BY pa.position ASC
        `,
        [projectId],
      );

    return rows.map(mapRow);
  }
}
