import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ConversationRecord } from '../../../contracts/ConversationRepository';
import { useLocale } from '../../../core/localization/LocaleProvider';
import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { spacing } from '../../../design-system/tokens/spacing';
import { typography } from '../../../design-system/tokens/typography';

import { formatConversationUpdatedAt } from '../formatters/formatConversationUpdatedAt';
import { ConversationListActionButton } from './ConversationListActionButton';

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
  const { locale, t } = useLocale();

  const title =
    conversation.title.trim() ||
    t('untitledConversation');

  const updatedAt =
    formatConversationUpdatedAt(
      conversation.updatedAt,
      locale,
    );

  return (
    <View
      style={[
        styles.container,
        {
          borderBottomColor: colors.border,
          opacity: disabled ? 0.6 : 1,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t('openConversation')}: ${title}`}
        disabled={disabled}
        onPress={onOpen}
        style={({ pressed }) => [
          styles.main,
          {
            backgroundColor: pressed
              ? colors.surfacePressed
              : 'transparent',
          },
        ]}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.title,
            { color: colors.textPrimary },
          ]}
        >
          {title}
        </Text>

        {updatedAt ? (
          <Text
            numberOfLines={1}
            style={[
              styles.date,
              { color: colors.textSecondary },
            ]}
          >
            {updatedAt}
          </Text>
        ) : null}
      </Pressable>

      <View style={styles.actions}>
        <ConversationListActionButton
          accessibilityLabel={`${
            conversation.isPinned
              ? t('unpinConversation')
              : t('pinConversation')
          }: ${title}`}
          disabled={disabled}
          selected={conversation.isPinned}
          onPress={onPin}
        >
          ★
        </ConversationListActionButton>

        <ConversationListActionButton
          accessibilityLabel={`${
            conversation.isArchived
              ? t('restoreConversation')
              : t('archiveConversation')
          }: ${title}`}
          disabled={disabled}
          onPress={onArchive}
        >
          {conversation.isArchived
            ? '↩'
            : '▣'}
        </ConversationListActionButton>

        <ConversationListActionButton
          accessibilityLabel={`${t('deleteConversationAction')}: ${title}`}
          disabled={disabled}
          tone="danger"
          onPress={onDelete}
        >
          ×
        </ConversationListActionButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginHorizontal: spacing.lg,
  },
  main: {
    flex: 1,
    minHeight: 60,
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    marginLeft: -spacing.sm,
    borderRadius: spacing.md,
  },
  title: {
    fontSize: typography.body,
    fontWeight: '600',
  },
  date: {
    marginTop: spacing.xs,
    fontSize: typography.caption,
    fontVariant: ['tabular-nums'],
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
