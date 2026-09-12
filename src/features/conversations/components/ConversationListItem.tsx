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
  disabled?: boolean;
  onOpen: () => void;
  onPin: () => void;
  onArchive: () => void;
  onDelete: () => void;
};

export function ConversationListItem({
  conversation,
  disabled = false,
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
          opacity: disabled ? 0.6 : 1,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open conversation: ${title}`}
        disabled={disabled}
        onPress={onOpen}
        style={styles.main}
      >
        <View style={styles.titleRow}>
          {conversation.isPinned && (
            <Text
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
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
          accessibilityRole="button"
          accessibilityLabel={
            conversation.isPinned
              ? `Unpin ${title}`
              : `Pin ${title}`
          }
          disabled={disabled}
          onPress={onPin}
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
          accessibilityRole="button"
          accessibilityLabel={
            conversation.isArchived
              ? `Restore ${title}`
              : `Archive ${title}`
          }
          disabled={disabled}
          onPress={onArchive}
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
          accessibilityRole="button"
          accessibilityLabel={`Delete ${title}`}
          disabled={disabled}
          onPress={onDelete}
          style={styles.action}
        >
          <Text
            style={{
              color: colors.error,
              fontSize: 20,
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
    minHeight: 56,
    justifyContent: 'center',
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
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
