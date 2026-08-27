import React, { useRef } from 'react';
import {
  FlatList,
  StyleSheet,
} from 'react-native';

import { spacing } from '../../../design-system/tokens/spacing';
import { ChatMessage } from '../types';
import { EmptyChatState } from './EmptyChatState';
import { MessageBubble } from './MessageBubble';

type Props = {
  messages: ChatMessage[];
};

export function MessageList({
  messages,
}: Props) {
  const listRef = useRef<FlatList<ChatMessage>>(null);

  return (
    <FlatList
      ref={listRef}
      data={messages}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <MessageBubble message={item} />
      )}
      ListEmptyComponent={EmptyChatState}
      contentContainerStyle={[
        styles.content,
        messages.length === 0 && styles.emptyContent,
      ]}
      keyboardShouldPersistTaps="handled"
      onContentSizeChange={() => {
        if (messages.length > 0) {
          listRef.current?.scrollToEnd({
            animated: true,
          });
        }
      }}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },

  emptyContent: {
    flexGrow: 1,
  },
});
