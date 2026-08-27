import {
  useCallback,
  useMemo,
  useState,
} from 'react';

import {
  ConversationRecord,
  ConversationRepository,
} from '../../../contracts/ConversationRepository';

type ViewMode =
  | 'active'
  | 'archived';

export function useConversationHistoryController(
  repository: ConversationRepository,
) {
  const [conversations, setConversations] =
    useState<ConversationRecord[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [failed, setFailed] =
    useState(false);

  const [query, setQuery] =
    useState('');

  const [viewMode, setViewMode] =
    useState<ViewMode>('active');

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);

    try {
      const records =
        await repository.list(500);

      setConversations(records);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [repository]);

  const visibleConversations =
    useMemo(() => {
      const normalizedQuery =
        query.trim().toLocaleLowerCase();

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
            .toLocaleLowerCase()
            .includes(normalizedQuery);
        },
      );
    }, [
      conversations,
      query,
      viewMode,
    ]);

  const togglePinned =
    useCallback(
      async (
        conversation: ConversationRecord,
      ) => {
        await repository.setPinned(
          conversation.id,
          !conversation.isPinned,
          Date.now(),
        );

        await load();
      },
      [load, repository],
    );

  const toggleArchived =
    useCallback(
      async (
        conversation: ConversationRecord,
      ) => {
        await repository.setArchived(
          conversation.id,
          !conversation.isArchived,
          Date.now(),
        );

        await load();
      },
      [load, repository],
    );

  const deleteConversation =
    useCallback(
      async (id: string) => {
        await repository.delete(id);
        await load();
      },
      [load, repository],
    );

  return {
    conversations:
      visibleConversations,

    loading,
    failed,

    query,
    setQuery,

    viewMode,
    setViewMode,

    load,
    togglePinned,
    toggleArchived,
    deleteConversation,
  };
}
