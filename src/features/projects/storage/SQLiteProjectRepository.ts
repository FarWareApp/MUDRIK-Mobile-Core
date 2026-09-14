import type {
  SQLiteDatabase,
} from 'expo-sqlite';

import {
  CreateProjectInput,
  ProjectRecord,
  ProjectRepository,
} from '../../../contracts/ProjectRepository';

type DatabaseProvider =
  () => Promise<SQLiteDatabase>;

type ProjectRow = {
  id: string;
  name: string;
  description: string;
  created_at: number;
  updated_at: number;
  is_archived: number;
};

function mapRow(
  row: ProjectRow,
): ProjectRecord {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isArchived:
      row.is_archived === 1,
  };
}

export class SQLiteProjectRepository
  implements ProjectRepository
{
  constructor(
    private readonly getDatabase:
      DatabaseProvider,
  ) {}

  async create(
    input: CreateProjectInput,
  ): Promise<void> {
    const db =
      await this.getDatabase();

    await db.runAsync(
      `
        INSERT INTO projects (
          id,
          name,
          description,
          created_at,
          updated_at,
          is_archived
        )
        VALUES (?, ?, ?, ?, ?, 0)
      `,
      [
        input.id,
        input.name,
        input.description,
        input.createdAt,
        input.createdAt,
      ],
    );
  }

  async getById(
    id: string,
  ): Promise<ProjectRecord | null> {
    const db =
      await this.getDatabase();

    const row =
      await db.getFirstAsync<ProjectRow>(
        `
          SELECT *
          FROM projects
          WHERE id = ?
          LIMIT 1
        `,
        [id],
      );

    return row
      ? mapRow(row)
      : null;
  }

  async list(
    includeArchived = false,
  ): Promise<ProjectRecord[]> {
    const db =
      await this.getDatabase();

    const rows =
      includeArchived
        ? await db.getAllAsync<ProjectRow>(
            `
              SELECT *
              FROM projects
              ORDER BY
                is_archived ASC,
                updated_at DESC
            `,
          )
        : await db.getAllAsync<ProjectRow>(
            `
              SELECT *
              FROM projects
              WHERE is_archived = 0
              ORDER BY updated_at DESC
            `,
          );

    return rows.map(mapRow);
  }

  async updateDetails(
    id: string,
    name: string,
    description: string,
    updatedAt: number,
  ): Promise<void> {
    const db =
      await this.getDatabase();

    await db.runAsync(
      `
        UPDATE projects
        SET
          name = ?,
          description = ?,
          updated_at = ?
        WHERE id = ?
      `,
      [
        name,
        description,
        updatedAt,
        id,
      ],
    );
  }

  async rename(
    id: string,
    name: string,
    updatedAt: number,
  ): Promise<void> {
    const db =
      await this.getDatabase();

    await db.runAsync(
      `
        UPDATE projects
        SET
          name = ?,
          updated_at = ?
        WHERE id = ?
      `,
      [
        name,
        updatedAt,
        id,
      ],
    );
  }

  async updateDescription(
    id: string,
    description: string,
    updatedAt: number,
  ): Promise<void> {
    const db =
      await this.getDatabase();

    await db.runAsync(
      `
        UPDATE projects
        SET
          description = ?,
          updated_at = ?
        WHERE id = ?
      `,
      [
        description,
        updatedAt,
        id,
      ],
    );
  }

  async setArchived(
    id: string,
    archived: boolean,
    updatedAt: number,
  ): Promise<void> {
    const db =
      await this.getDatabase();

    await db.runAsync(
      `
        UPDATE projects
        SET
          is_archived = ?,
          updated_at = ?
        WHERE id = ?
      `,
      [
        archived ? 1 : 0,
        updatedAt,
        id,
      ],
    );
  }

  async delete(
    id: string,
  ): Promise<void> {
    const db =
      await this.getDatabase();

    await db.runAsync(
      `
        DELETE FROM projects
        WHERE id = ?
      `,
      [id],
    );
  }
}
