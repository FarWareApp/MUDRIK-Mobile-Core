import {
  useCallback,
  useMemo,
  useState,
} from 'react';

import {
  ConversationRecord,
  ConversationRepository,
} from '../../../contracts/ConversationRepository';
import {
  diagnosticsService,
} from '../../../core/diagnostics/DiagnosticsService';
import {
  createConversationId,
} from '../createConversationId';

type ViewMode =
  | 'active'
  | 'archived';

function recordConversationError(
  event: string,
  caught: unknown,
): void {
  diagnosticsService.record(
    'conversation-history',
    caught instanceof Error
      ? `${event}:${caught.message}`
      : `${event}:unknown`,
    'error',
  );
}

export function useConversationHistoryController(
  repository: ConversationRepository,
) {
  const [conversations, setConversations] =
    useState<ConversationRecord[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [loadFailed, setLoadFailed] =
    useState(false);

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [query, setQuery] =
    useState('');

  const [viewMode, setViewMode] =
    useState<ViewMode>('active');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);

    try {
      const records =
        await repository.list(500);

      setConversations(records);
    } catch (caught) {
      recordConversationError(
        'load-failed',
        caught,
      );

      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [repository]);

  const create =
    useCallback(async () => {
      if (busy) {
        return null;
      }

      setBusy(true);
      setError(null);

      try {
        const now = Date.now();
        const id = createConversationId();

        await repository.create({
          id,
          title: '',
          createdAt: now,
        });

        return id;
      } catch (caught) {
        recordConversationError(
          'create-failed',
          caught,
        );

        setError(
          'Unable to create conversation.',
        );
        return null;
      } finally {
        setBusy(false);
      }
    }, [
      busy,
      repository,
    ]);

  const togglePinned =
    useCallback(
      async (
        conversation: ConversationRecord,
      ) => {
        if (busy) {
          return;
        }

        setBusy(true);
        setError(null);

        try {
          await repository.setPinned(
            conversation.id,
            !conversation.isPinned,
            Date.now(),
          );

          await load();
        } catch (caught) {
          recordConversationError(
            'pin-failed',
            caught,
          );

          setError(
            'Unable to update pinned state.',
          );
        } finally {
          setBusy(false);
        }
      },
      [
        busy,
        load,
        repository,
      ],
    );

  const toggleArchived =
    useCallback(
      async (
        conversation: ConversationRecord,
      ) => {
        if (busy) {
          return;
        }

        setBusy(true);
        setError(null);

        try {
          await repository.setArchived(
            conversation.id,
            !conversation.isArchived,
            Date.now(),
          );

          await load();
        } catch (caught) {
          recordConversationError(
            'archive-failed',
            caught,
          );

          setError(
            'Unable to update archived state.',
          );
        } finally {
          setBusy(false);
        }
      },
      [
        busy,
        load,
        repository,
      ],
    );

  const deleteConversation =
    useCallback(
      async (id: string) => {
        if (busy) {
          return false;
        }

        setBusy(true);
        setError(null);

        try {
          await repository.delete(id);
          await load();
          return true;
        } catch (caught) {
          recordConversationError(
            'delete-failed',
            caught,
          );

          setError(
            'Unable to delete conversation.',
          );
          return false;
        } finally {
          setBusy(false);
        }
      },
      [
        busy,
        load,
        repository,
      ],
    );

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

  return {
    conversations:
      visibleConversations,

    loading,
    failed: loadFailed,
    busy,
    error,

    query,
    setQuery,

    viewMode,
    setViewMode,

    load,
    create,
    togglePinned,
    toggleArchived,
    deleteConversation,

    dismissError: () =>
      setError(null),
  };
}
