export interface ProjectConversationRepository {
  link(
    projectId: string,
    conversationId: string,
  ): Promise<void>;

  unlink(
    conversationId: string,
  ): Promise<void>;

  getProjectIdForConversation(
    conversationId: string,
  ): Promise<string | null>;

  listConversationIds(
    projectId: string,
  ): Promise<string[]>;
}
