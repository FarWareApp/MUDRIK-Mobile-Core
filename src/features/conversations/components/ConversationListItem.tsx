import React, {
  memo,
  useCallback,
} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type {
  ConversationRecord,
} from '../../../contracts/ConversationRepository';
import { useLocale } from '../../../core/localization/LocaleProvider';
import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { spacing } from '../../../design-system/tokens/spacing';
import { typeScale } from '../../../design-system/tokens/typography';

import { formatConversationUpdatedAt } from '../formatters/formatConversationUpdatedAt';
import { ConversationArchiveIcon } from './ConversationArchiveIcon';
import { ConversationDeleteIcon } from './ConversationDeleteIcon';
import { ConversationListActionButton } from './ConversationListActionButton';
import { ConversationPinIcon } from './ConversationPinIcon';
import { ConversationRestoreIcon } from './ConversationRestoreIcon';

type ConversationAction = (
  conversation: ConversationRecord,
) => void;

type Props = {
  conversation: ConversationRecord;
  disabled?: boolean;
  onOpen: ConversationAction;
  onPin: ConversationAction;
  onArchive: ConversationAction;
  onDelete: ConversationAction;
};

export const ConversationListItem = memo(
  function ConversationListItem({
    conversation,
    disabled = false,
    onOpen,
    onPin,
    onArchive,
    onDelete,
  }: Props) {
    const { colors } = useTheme();
    const { locale, t, isRTL } = useLocale();

    const title =
      conversation.title.trim() ||
      t('untitledConversation');

    const updatedAt =
      formatConversationUpdatedAt(
        conversation.updatedAt,
        locale,
      );

    const handleOpen = useCallback(
      () => onOpen(conversation),
      [conversation, onOpen],
    );
    const handlePin = useCallback(
      () => onPin(conversation),
      [conversation, onPin],
    );
    const handleArchive = useCallback(
      () => onArchive(conversation),
      [conversation, onArchive],
    );
    const handleDelete = useCallback(
      () => onDelete(conversation),
      [conversation, onDelete],
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
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={handleOpen}
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
            icon={(color) => (
              <ConversationPinIcon color={color} />
            )}
            onPress={handlePin}
          />

          <ConversationListActionButton
            accessibilityLabel={`${
              conversation.isArchived
                ? t('restoreConversation')
                : t('archiveConversation')
            }: ${title}`}
            disabled={disabled}
            icon={(color) =>
              conversation.isArchived ? (
                <ConversationRestoreIcon
                  color={color}
                  isRTL={isRTL}
                />
              ) : (
                <ConversationArchiveIcon
                  color={color}
                />
              )
            }
            onPress={handleArchive}
          />

          <ConversationListActionButton
            accessibilityLabel={`${t('deleteConversationAction')}: ${title}`}
            disabled={disabled}
            tone="danger"
            icon={(color) => (
              <ConversationDeleteIcon color={color} />
            )}
            onPress={handleDelete}
          />
        </View>
      </View>
    );
  },
);

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
    marginStart: -spacing.sm,
    borderRadius: spacing.md,
  },
  title: {
    ...typeScale.body,
    fontWeight: '600',
    writingDirection: 'auto',
  },
  date: {
    ...typeScale.caption,
    marginTop: spacing.xs,
    fontVariant: ['tabular-nums'],
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
