import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ConversationRecord } from '../../../contracts/ConversationRepository';
import { useTheme } from '../../../design-system/theme/ThemeProvider';

type Props = {
  conversation: ConversationRecord;
  onOpen: () => void;
  onPin: () => void;
  onArchive: () => void;
  onDelete: () => void;
};

export function ConversationListItem({
  conversation,
  onOpen,
  onPin,
  onArchive,
  onDelete,
}: Props) {
  const { colors } = useTheme();

  const title =
    conversation.title.trim() ||
    'New conversation';

  const date = new Date(
    conversation.updatedAt,
  ).toLocaleString();

  return (
    <View
      style={[
        styles.container,
        {
          borderBottomColor:
            colors.border,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        onPress={onOpen}
        style={styles.main}
      >
        <View style={styles.titleRow}>
          {conversation.isPinned && (
            <Text
              style={{
                color: colors.accent,
                marginRight: 6,
              }}
            >
              ●
            </Text>
          )}

          <Text
            numberOfLines={1}
            style={[
              styles.title,
              {
                color: colors.textPrimary,
              },
            ]}
          >
            {title}
          </Text>
        </View>

        <Text
          style={[
            styles.date,
            {
              color: colors.textSecondary,
            },
          ]}
        >
          {date}
        </Text>
      </Pressable>

      <View style={styles.actions}>
        <Pressable
          onPress={onPin}
          hitSlop={6}
          style={styles.action}
        >
          <Text
            style={{
              color: colors.textSecondary,
            }}
          >
            {conversation.isPinned
              ? '☆'
              : '★'}
          </Text>
        </Pressable>

        <Pressable
          onPress={onArchive}
          hitSlop={6}
          style={styles.action}
        >
          <Text
            style={{
              color: colors.textSecondary,
            }}
          >
            {conversation.isArchived
              ? '↩'
              : '▣'}
          </Text>
        </Pressable>

        <Pressable
          onPress={onDelete}
          hitSlop={6}
          style={styles.action}
        >
          <Text
            style={{
              color: colors.error,
            }}
          >
            ×
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth:
      StyleSheet.hairlineWidth,
    marginHorizontal: 16,
  },

  main: {
    flex: 1,
    paddingVertical: 12,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },

  date: {
    marginTop: 5,
    fontSize: 11,
  },

  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  action: {
    width: 34,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
