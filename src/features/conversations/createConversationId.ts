export function createConversationId(): string {
  return `conversation-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}
