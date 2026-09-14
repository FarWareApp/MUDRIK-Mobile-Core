import React, {
  useCallback,
  useMemo,
  useRef,
} from 'react';
import {
  FlatList,
  ListRenderItemInfo,
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

function getMessageListItemKey(
  item: MessageListItem,
) {
  return item.id;
}

function renderMessageListItem({
  item,
}: ListRenderItemInfo<MessageListItem>) {
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
}

export function MessageList({
  messages,
}: Props) {
  const listRef = useRef<FlatList<MessageListItem>>(null);
  const shouldFollowEndRef = useRef(true);
  const { reducedMotion } = useAccessibility();

  const items = useMemo(
    () => buildMessageListItems(messages),
    [messages],
  );

  const handleScroll = useCallback(
    (
      event: NativeSyntheticEvent<NativeScrollEvent>,
    ) => {
      const {
        contentOffset,
        contentSize,
        layoutMeasurement,
      } = event.nativeEvent;

      shouldFollowEndRef.current =
        isNearMessageListEnd(
          contentSize.height,
          layoutMeasurement.height,
          contentOffset.y,
        );
    },
    [],
  );

  const handleContentSizeChange =
    useCallback(() => {
      if (
        messages.length > 0
        && shouldFollowEndRef.current
      ) {
        listRef.current?.scrollToEnd({
          animated: !reducedMotion,
        });
      }
    }, [messages.length, reducedMotion]);

  return (
    <FlatList
      ref={listRef}
      data={items}
      keyExtractor={getMessageListItemKey}
      renderItem={renderMessageListItem}
      ListEmptyComponent={EmptyChatState}
      contentContainerStyle={[
        styles.content,
        messages.length === 0 && styles.emptyContent,
      ]}
      keyboardShouldPersistTaps="handled"
      onScroll={handleScroll}
      scrollEventThrottle={32}
      onContentSizeChange={handleContentSizeChange}
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
