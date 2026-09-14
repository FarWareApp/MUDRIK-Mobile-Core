import type {
  ConversationRecord,
} from '../../contracts/ConversationRepository';
import type {
  ConversationViewMode,
} from './ConversationViewMode';

function normalizeSearchQuery(
  value: string,
): string {
  return value
    .trim()
    .toLowerCase();
}

export function hasConversationSearchQuery(
  query: string,
): boolean {
  return normalizeSearchQuery(query).length > 0;
}

export function filterConversationRecords(
  conversations: readonly ConversationRecord[],
  viewMode: ConversationViewMode,
  query: string,
): ConversationRecord[] {
  const normalizedQuery =
    normalizeSearchQuery(query);

  return conversations.filter(
    (conversation) => {
      const archiveMatches =
        viewMode === 'archived'
          ? conversation.isArchived
          : !conversation.isArchived;

      if (!archiveMatches) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return conversation.title
        .toLowerCase()
        .includes(normalizedQuery);
    },
  );
}

export function sortConversationRecords(
  conversations: readonly ConversationRecord[],
): ConversationRecord[] {
  return [...conversations].sort(
    (left, right) => {
      const pinDifference =
        Number(right.isPinned)
        - Number(left.isPinned);

      if (pinDifference !== 0) {
        return pinDifference;
      }

      return right.updatedAt - left.updatedAt;
    },
  );
}
