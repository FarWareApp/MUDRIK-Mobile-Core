import React, { useRef } from 'react';
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
} from 'react-native';

import { useAccessibility } from '../../../core/accessibility/AccessibilityProvider';
import { spacing } from '../../../design-system/tokens/spacing';
import { isNearMessageListEnd } from '../scroll/isNearMessageListEnd';
import type { ChatMessage } from '../types';
import { EmptyChatState } from './EmptyChatState';
import { MessageBubble } from './MessageBubble';

type Props = {
  messages: ChatMessage[];
};

export function MessageList({
  messages,
}: Props) {
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const shouldFollowEndRef = useRef(true);
  const { reducedMotion } = useAccessibility();

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
