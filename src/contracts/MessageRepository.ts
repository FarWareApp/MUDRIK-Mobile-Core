export type StoredMessageRole =
  | 'user'
  | 'assistant'
  | 'system';

export type StoredMessage = {
  id: string;
  conversationId: string;
  role: StoredMessageRole;
  kind: string;
  text: string;
  createdAt: number;
};

export interface MessageRepository {
  save(
    message: StoredMessage,
  ): Promise<void>;

  listByConversation(
    conversationId: string,
  ): Promise<StoredMessage[]>;

  deleteByConversation(
    conversationId: string,
  ): Promise<void>;
}
