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
import { useLocale } from '../../core/localization/LocaleProvider';
import { useTheme } from '../../design-system/theme/ThemeProvider';
import { useActiveConversation } from './ActiveConversationProvider';
import { ConversationHistoryHeader } from './components/ConversationHistoryHeader';
import { ConversationHistoryState } from './components/ConversationHistoryState';
import { ConversationListItem } from './components/ConversationListItem';
import { ConversationSearchBar } from './components/ConversationSearchBar';
import { ConversationViewTabs } from './components/ConversationViewTabs';
import { createConversationId } from './createConversationId';
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

    query,
    setQuery,

    viewMode,
    setViewMode,

    load,
    togglePinned,
    toggleArchived,
    deleteConversation,
  } = useConversationHistoryController(
    repository,
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const openConversation = (
    conversation: ConversationRecord,
  ) => {
    activateConversation(conversation.id);
    router.back();
  };

  const createNewConversation =
    async () => {
      const now = Date.now();

      const id = createConversationId();

      await repository.create({
        id,
        title: '',
        createdAt: now,
      });

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
              await deleteConversation(
                conversation.id,
              );

              await onConversationDeleted?.();

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
          mode="empty"
        />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <ConversationListItem
              conversation={item}
              onOpen={() =>
                openConversation(item)
              }
              onPin={() => {
                void togglePinned(item);
              }}
              onArchive={() => {
                void toggleArchived(item);
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
