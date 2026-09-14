import React, {
  useCallback,
} from 'react';
import {
  FlatList,
  StyleSheet,
  type ListRenderItem,
} from 'react-native';

import type {
  ConversationRecord,
} from '../../../contracts/ConversationRepository';
import { spacing } from '../../../design-system/tokens/spacing';
import { ConversationListItem } from './ConversationListItem';

type ConversationAction = (
  conversation: ConversationRecord,
) => void;

type Props = {
  conversations: ConversationRecord[];
  disabled: boolean;
  onOpen: ConversationAction;
  onPin: ConversationAction;
  onArchive: ConversationAction;
  onDelete: ConversationAction;
};

function getConversationKey(
  conversation: ConversationRecord,
): string {
  return conversation.id;
}

export function ConversationHistoryList({
  conversations,
  disabled,
  onOpen,
  onPin,
  onArchive,
  onDelete,
}: Props) {
  const renderItem =
    useCallback<ListRenderItem<ConversationRecord>>(
      ({ item }) => (
        <ConversationListItem
          conversation={item}
          disabled={disabled}
          onOpen={onOpen}
          onPin={onPin}
          onArchive={onArchive}
          onDelete={onDelete}
        />
      ),
      [
        disabled,
        onArchive,
        onDelete,
        onOpen,
        onPin,
      ],
    );

  return (
    <FlatList
      data={conversations}
      keyExtractor={getConversationKey}
      renderItem={renderItem}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xxl,
  },
});
