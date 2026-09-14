export type ProjectRecord = {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  isArchived: boolean;
};

export type CreateProjectInput = {
  id: string;
  name: string;
  description: string;
  createdAt: number;
};

export interface ProjectRepository {
  create(
    input: CreateProjectInput,
  ): Promise<void>;

  getById(
    id: string,
  ): Promise<ProjectRecord | null>;

  list(
    includeArchived?: boolean,
  ): Promise<ProjectRecord[]>;

  updateDetails(
    id: string,
    name: string,
    description: string,
    updatedAt: number,
  ): Promise<void>;

  rename(
    id: string,
    name: string,
    updatedAt: number,
  ): Promise<void>;

  updateDescription(
    id: string,
    description: string,
    updatedAt: number,
  ): Promise<void>;

  setArchived(
    id: string,
    archived: boolean,
    updatedAt: number,
  ): Promise<void>;

  delete(
    id: string,
  ): Promise<void>;
}
