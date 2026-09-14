import React, {
  useMemo,
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
import { motion } from '../../../design-system/tokens/motion';
import { radius } from '../../../design-system/tokens/radius';
import { spacing } from '../../../design-system/tokens/spacing';
import { typeScale } from '../../../design-system/tokens/typography';
import { ProjectSelectionCheckIcon } from './ProjectSelectionCheckIcon';

type Props = {
  conversations: ConversationRecord[];
  linkedIds: readonly string[];
  disabled?: boolean;
  onToggle: (conversationId: string) => void;
};

export function ProjectConversationList({
  conversations,
  linkedIds,
  disabled = false,
  onToggle,
}: Props) {
  const { colors } = useTheme();
  const { t } = useLocale();

  const linkedSet = useMemo(
    () => new Set(linkedIds),
    [linkedIds],
  );

  if (conversations.length === 0) {
    return (
      <Text
        accessibilityLiveRegion="polite"
        style={[
          styles.empty,
          { color: colors.textSecondary },
        ]}
      >
        {t('noProjectConversations')}
      </Text>
    );
  }

  return (
    <View>
      {conversations.map((conversation) => {
        const linked =
          linkedSet.has(conversation.id);
        const title =
          conversation.title.trim()
          || t('untitledConversation');
        const archivedLabel =
          conversation.isArchived
            ? t('projectArchivedConversationLabel')
            : null;

        return (
          <Pressable
            key={conversation.id}
            accessibilityRole="checkbox"
            accessibilityLabel={
              archivedLabel
                ? `${title}, ${archivedLabel}`
                : title
            }
            accessibilityState={{
              checked: linked,
              disabled,
            }}
            disabled={disabled}
            onPress={() => onToggle(conversation.id)}
            style={({ pressed }) => [
              styles.row,
              {
                borderBottomColor: colors.border,
                backgroundColor: pressed
                  ? colors.surfacePressed
                  : 'transparent',
                opacity: disabled ? 0.6 : 1,
                transform: [
                  {
                    scale: pressed && !disabled
                      ? motion.press.subtleScale
                      : 1,
                  },
                ],
              },
            ]}
          >
            <View
              importantForAccessibility="no-hide-descendants"
              style={[
                styles.checkbox,
                {
                  borderColor: linked
                    ? colors.accent
                    : colors.border,
                  backgroundColor: linked
                    ? colors.accent
                    : 'transparent',
                },
              ]}
            >
              {linked ? (
                <ProjectSelectionCheckIcon
                  color={colors.accentText}
                />
              ) : null}
            </View>

            <View style={styles.textBlock}>
              <Text
                numberOfLines={1}
                style={[
                  styles.title,
                  { color: colors.textPrimary },
                ]}
              >
                {title}
              </Text>

              {archivedLabel ? (
                <Text
                  style={[
                    styles.archived,
                    { color: colors.textSecondary },
                  ]}
                >
                  {archivedLabel}
                </Text>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    ...typeScale.secondary,
    paddingVertical: spacing.md,
  },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: spacing.md,
  },
  textBlock: {
    flex: 1,
    paddingVertical: spacing.sm,
  },
  title: {
    ...typeScale.secondary,
    writingDirection: 'auto',
  },
  archived: {
    ...typeScale.caption,
    marginTop: spacing.xs,
  },
});
