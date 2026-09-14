import React, {
  useCallback,
} from 'react';
import {
  Alert,
  StyleSheet,
  View,
} from 'react-native';
import {
  router,
  useFocusEffect,
} from 'expo-router';
import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import type {
  ConversationRecord,
  ConversationRepository,
} from '../../contracts/ConversationRepository';
import {
  diagnosticsService,
} from '../../core/diagnostics/DiagnosticsService';
import { useLocale } from '../../core/localization/LocaleProvider';
import { useTheme } from '../../design-system/theme/ThemeProvider';
import { spacing } from '../../design-system/tokens/spacing';
import {
  InlineErrorBanner,
} from '../../shared/components/InlineErrorBanner';
import { useActiveConversation } from './ActiveConversationProvider';
import { ConversationHistoryHeader } from './components/ConversationHistoryHeader';
import { ConversationHistoryList } from './components/ConversationHistoryList';
import { ConversationHistoryState } from './components/ConversationHistoryState';
import { ConversationSearchBar } from './components/ConversationSearchBar';
import { ConversationViewTabs } from './components/ConversationViewTabs';
import { getConversationHistoryErrorTranslationKey } from './getConversationHistoryErrorTranslationKey';
import { useConversationHistoryController } from './hooks/useConversationHistoryController';

type Props = {
  repository: ConversationRepository;
  onConversationDeleted?: () => Promise<void>;
};

export function ConversationsScreen({
  repository,
  onConversationDeleted,
}: Props) {
  const { colors } = useTheme();
  const { t } = useLocale();

  const {
    activeConversationId,
    activateConversation,
    clearActiveConversation,
  } = useActiveConversation();

  const {
    conversations,
    loading,
    failed,
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
  } = useConversationHistoryController(
    repository,
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const openConversation =
    useCallback(
      (conversation: ConversationRecord) => {
        activateConversation(conversation.id);
        router.back();
      },
      [activateConversation],
    );

  const createNewConversation =
    useCallback(async () => {
      const id = await create();

      if (!id) {
        return;
      }

      activateConversation(id);
      router.back();
    }, [
      activateConversation,
      create,
    ]);

  const pinConversation =
    useCallback(
      (conversation: ConversationRecord) => {
        void togglePinned(conversation);
      },
      [togglePinned],
    );

  const archiveConversation =
    useCallback(
      (conversation: ConversationRecord) => {
        void toggleArchived(conversation);
      },
      [toggleArchived],
    );

  const confirmDelete =
    useCallback(
      (conversation: ConversationRecord) => {
        Alert.alert(
          t('deleteConversation'),
          t('deleteConversationMessage'),
          [
            {
              text: t('cancel'),
              style: 'cancel',
            },
            {
              text: t('delete'),
              style: 'destructive',
              onPress: () => {
                void (async () => {
                  const deleted =
                    await deleteConversation(
                      conversation.id,
                    );

                  if (!deleted) {
                    return;
                  }

                  try {
                    await onConversationDeleted?.();
                  } catch (caught) {
                    diagnosticsService.record(
                      'conversation-history',
                      caught instanceof Error
                        ? `cleanup-after-delete-failed:${caught.message}`
                        : 'cleanup-after-delete-failed:unknown',
                      'warning',
                    );
                  }

                  if (
                    activeConversationId ===
                    conversation.id
                  ) {
                    clearActiveConversation();
                  }
                })();
              },
            },
          ],
        );
      },
      [
        activeConversationId,
        clearActiveConversation,
        deleteConversation,
        onConversationDeleted,
        t,
      ],
    );

  const errorMessage = error
    ? t(
        getConversationHistoryErrorTranslationKey(
          error,
        ),
      )
    : null;

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor: colors.background,
        },
      ]}
    >
      <ConversationHistoryHeader
        busy={busy}
        onNewConversation={() => {
          void createNewConversation();
        }}
      />

      {errorMessage ? (
        <InlineErrorBanner
          message={errorMessage}
          onDismiss={dismissError}
        />
      ) : null}

      <View style={styles.controls}>
        <ConversationSearchBar
          value={query}
          onChangeText={setQuery}
        />

        <ConversationViewTabs
          value={viewMode}
          onChange={setViewMode}
        />
      </View>

      {loading ? (
        <ConversationHistoryState
          mode="loading"
        />
      ) : failed ? (
        <ConversationHistoryState
          mode="error"
          onRetry={() => {
            void load();
          }}
        />
      ) : conversations.length === 0 ? (
        <ConversationHistoryState
          mode={
            hasSearchQuery
              ? 'no-results'
              : 'empty'
          }
        />
      ) : (
        <ConversationHistoryList
          conversations={conversations}
          disabled={busy}
          onOpen={openConversation}
          onPin={pinConversation}
          onArchive={archiveConversation}
          onDelete={confirmDelete}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  controls: {
    paddingTop: spacing.lg,
  },
});
