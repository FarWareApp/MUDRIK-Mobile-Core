import {
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';

import type {
  ConversationRecord,
  ConversationRepository,
} from '../../../contracts/ConversationRepository';
import {
  diagnosticsService,
} from '../../../core/diagnostics/DiagnosticsService';
import type {
  ConversationHistoryErrorCode,
} from '../ConversationHistoryErrorCode';
import type {
  ConversationViewMode,
} from '../ConversationViewMode';
import {
  createConversationId,
} from '../createConversationId';
import {
  filterConversationRecords,
  hasConversationSearchQuery,
  sortConversationRecords,
} from '../conversationListPolicy';

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
    useState<ConversationHistoryErrorCode | null>(null);

  const [query, setQuery] =
    useState('');

  const [viewMode, setViewMode] =
    useState<ConversationViewMode>('active');

  const mutationInFlightRef =
    useRef(false);

  const beginMutation =
    useCallback((): boolean => {
      if (mutationInFlightRef.current) {
        return false;
      }

      mutationInFlightRef.current = true;
      setBusy(true);
      setError(null);
      return true;
    }, []);

  const endMutation =
    useCallback(() => {
      mutationInFlightRef.current = false;
      setBusy(false);
    }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    setError(null);

    try {
      const records =
        await repository.list(500);

      setConversations(
        sortConversationRecords(records),
      );
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
      if (!beginMutation()) {
        return null;
      }

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

        setError('create-failed');
        return null;
      } finally {
        endMutation();
      }
    }, [
      beginMutation,
      endMutation,
      repository,
    ]);

  const togglePinned =
    useCallback(
      async (
        conversation: ConversationRecord,
      ) => {
        if (!beginMutation()) {
          return;
        }

        const nextPinned =
          !conversation.isPinned;
        const updatedAt = Date.now();

        try {
          await repository.setPinned(
            conversation.id,
            nextPinned,
            updatedAt,
          );

          setConversations(
            (current) =>
              sortConversationRecords(
                current.map((item) =>
                  item.id === conversation.id
                    ? {
                        ...item,
                        isPinned: nextPinned,
                        updatedAt,
                      }
                    : item,
                ),
              ),
          );
        } catch (caught) {
          recordConversationError(
            'pin-failed',
            caught,
          );

          setError('pin-failed');
        } finally {
          endMutation();
        }
      },
      [
        beginMutation,
        endMutation,
        repository,
      ],
    );

  const toggleArchived =
    useCallback(
      async (
        conversation: ConversationRecord,
      ) => {
        if (!beginMutation()) {
          return;
        }

        const nextArchived =
          !conversation.isArchived;
        const updatedAt = Date.now();

        try {
          await repository.setArchived(
            conversation.id,
            nextArchived,
            updatedAt,
          );

          setConversations(
            (current) =>
              sortConversationRecords(
                current.map((item) =>
                  item.id === conversation.id
                    ? {
                        ...item,
                        isArchived: nextArchived,
                        updatedAt,
                      }
                    : item,
                ),
              ),
          );
        } catch (caught) {
          recordConversationError(
            'archive-failed',
            caught,
          );

          setError('archive-failed');
        } finally {
          endMutation();
        }
      },
      [
        beginMutation,
        endMutation,
        repository,
      ],
    );

  const deleteConversation =
    useCallback(
      async (id: string) => {
        if (!beginMutation()) {
          return false;
        }

        try {
          await repository.delete(id);

          setConversations(
            (current) =>
              current.filter(
                (item) => item.id !== id,
              ),
          );

          return true;
        } catch (caught) {
          recordConversationError(
            'delete-failed',
            caught,
          );

          setError('delete-failed');
          return false;
        } finally {
          endMutation();
        }
      },
      [
        beginMutation,
        endMutation,
        repository,
      ],
    );

  const visibleConversations =
    useMemo(
      () =>
        filterConversationRecords(
          conversations,
          viewMode,
          query,
        ),
      [
        conversations,
        query,
        viewMode,
      ],
    );

  const hasSearchQuery =
    useMemo(
      () =>
        hasConversationSearchQuery(query),
      [query],
    );

  const dismissError =
    useCallback(() => {
      setError(null);
    }, []);

  return {
    conversations:
      visibleConversations,

    loading,
    failed: loadFailed,
    busy,
    error,

    query,
    setQuery,
    hasSearchQuery,

    viewMode,
    setViewMode,

    load,
    create,
    togglePinned,
    toggleArchived,
    deleteConversation,
    dismissError,
  };
}
