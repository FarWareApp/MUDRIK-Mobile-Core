import React, { useRef } from 'react';
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
} from 'react-native';

import { useAccessibility } from '../../../core/accessibility/AccessibilityProvider';
import { spacing } from '../../../design-system/tokens/spacing';
import {
  buildMessageListItems,
} from '../list/buildMessageListItems';
import type {
  MessageListItem,
} from '../list/buildMessageListItems';
import { isNearMessageListEnd } from '../scroll/isNearMessageListEnd';
import type { ChatMessage } from '../types';
import { EmptyChatState } from './EmptyChatState';
import { MessageBubble } from './MessageBubble';
import { MessageDateSeparator } from './MessageDateSeparator';

type Props = {
  messages: ChatMessage[];
};

export function MessageList({
  messages,
}: Props) {
  const listRef = useRef<FlatList<MessageListItem>>(null);
  const shouldFollowEndRef = useRef(true);
  const { reducedMotion } = useAccessibility();

  const items = buildMessageListItems(messages);

  const handleScroll = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const {
      contentOffset,
      contentSize,
      layoutMeasurement,
    } = event.nativeEvent;

    shouldFollowEndRef.current = isNearMessageListEnd(
      contentSize.height,
      layoutMeasurement.height,
      contentOffset.y,
    );
  };

  return (
    <FlatList
      ref={listRef}
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => {
        if (item.kind === 'date') {
          return (
            <MessageDateSeparator
              createdAt={item.createdAt}
            />
          );
        }

        return (
          <MessageBubble
            message={item.message}
          />
        );
      }}
      ListEmptyComponent={EmptyChatState}
      contentContainerStyle={[
        styles.content,
        messages.length === 0 && styles.emptyContent,
      ]}
      keyboardShouldPersistTaps="handled"
      onScroll={handleScroll}
      scrollEventThrottle={32}
      onContentSizeChange={() => {
        if (
          messages.length > 0
          && shouldFollowEndRef.current
        ) {
          listRef.current?.scrollToEnd({
            animated: !reducedMotion,
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
