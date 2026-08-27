export type ConversationRecord = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  isArchived: boolean;
  isPinned: boolean;
};

export type CreateConversationInput = {
  id: string;
  title: string;
  createdAt: number;
};

export interface ConversationRepository {
  create(
    input: CreateConversationInput,
  ): Promise<void>;

  getById(
    id: string,
  ): Promise<ConversationRecord | null>;

  getMostRecent():
    Promise<ConversationRecord | null>;

  list(
    limit?: number,
  ): Promise<ConversationRecord[]>;

  touch(
    id: string,
    updatedAt: number,
  ): Promise<void>;

  delete(
    id: string,
  ): Promise<void>;
}
