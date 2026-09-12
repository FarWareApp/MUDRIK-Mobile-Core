import React, {
  useCallback,
} from 'react';
import {
  Alert,
  FlatList,
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

import {
  ConversationRecord,
  ConversationRepository,
} from '../../contracts/ConversationRepository';
import {
  diagnosticsService,
} from '../../core/diagnostics/DiagnosticsService';
import { useLocale } from '../../core/localization/LocaleProvider';
import { useTheme } from '../../design-system/theme/ThemeProvider';
import {
  InlineErrorBanner,
} from '../../shared/components/InlineErrorBanner';
import { useActiveConversation } from './ActiveConversationProvider';
import { ConversationHistoryHeader } from './components/ConversationHistoryHeader';
import { ConversationHistoryState } from './components/ConversationHistoryState';
import { ConversationListItem } from './components/ConversationListItem';
import { ConversationSearchBar } from './components/ConversationSearchBar';
import { ConversationViewTabs } from './components/ConversationViewTabs';
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

  const controller =
    useConversationHistoryController(
      repository,
    );

  useFocusEffect(
    useCallback(() => {
      void controller.load();
    }, [controller.load]),
  );

  const openConversation = (
    conversation: ConversationRecord,
  ) => {
    activateConversation(conversation.id);
    router.back();
  };

  const createNewConversation =
    async () => {
      const id =
        await controller.create();

      if (!id) {
        return;
      }

      activateConversation(id);
      router.back();
    };

  const confirmDelete = (
    conversation: ConversationRecord,
  ) => {
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
                await controller
                  .deleteConversation(
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
  };

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
        onNewConversation={() => {
          void createNewConversation();
        }}
      />

      {controller.error && (
        <InlineErrorBanner
          message={controller.error}
          onDismiss={
            controller.dismissError
          }
        />
      )}

      <View style={styles.controls}>
        <ConversationSearchBar
          value={controller.query}
          onChangeText={controller.setQuery}
        />

        <ConversationViewTabs
          value={controller.viewMode}
          onChange={controller.setViewMode}
        />
      </View>

      {controller.loading ? (
        <ConversationHistoryState
          mode="loading"
        />
      ) : controller.failed ? (
        <ConversationHistoryState
          mode="error"
          onRetry={() => {
            void controller.load();
          }}
        />
      ) : controller.conversations.length === 0 ? (
        <ConversationHistoryState
          mode="empty"
        />
      ) : (
        <FlatList
          data={controller.conversations}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <ConversationListItem
              conversation={item}
              onOpen={() =>
                openConversation(item)
              }
              onPin={() => {
                void controller.togglePinned(item);
              }}
              onArchive={() => {
                void controller.toggleArchived(item);
              }}
              onDelete={() => {
                confirmDelete(item);
              }}
            />
          )}
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
    paddingTop: 14,
  },
});
