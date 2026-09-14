import type {
  ConversationRecord,
} from '../../contracts/ConversationRepository';

export function selectProjectConversations(
  records: readonly ConversationRecord[],
  linkedIds: readonly string[],
): ConversationRecord[] {
  const linked = new Set(linkedIds);

  return records
    .filter(
      (conversation) =>
        !conversation.isArchived
        || linked.has(conversation.id),
    )
    .sort((left, right) => {
      const linkedDelta =
        Number(linked.has(right.id))
        - Number(linked.has(left.id));

      if (linkedDelta !== 0) {
        return linkedDelta;
      }

      return right.updatedAt - left.updatedAt;
    });
}
