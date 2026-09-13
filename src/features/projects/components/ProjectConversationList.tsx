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
import { radius } from '../../../design-system/tokens/radius';
import { spacing } from '../../../design-system/tokens/spacing';
import { typography } from '../../../design-system/tokens/typography';

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

  if (conversations.length === 0) {
    return (
      <Text
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
        const linked = linkedIds.includes(conversation.id);
        const title =
          conversation.title.trim() ||
          t('untitledConversation');

        return (
          <Pressable
            key={conversation.id}
            accessibilityRole="checkbox"
            accessibilityLabel={title}
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
              },
            ]}
          >
            <View
              importantForAccessibility="no"
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
                <Text
                  importantForAccessibility="no"
                  style={{
                    color: colors.accentText,
                    fontWeight: '700',
                  }}
                >
                  ✓
                </Text>
              ) : null}
            </View>

            <Text
              numberOfLines={1}
              style={[
                styles.title,
                { color: colors.textPrimary },
              ]}
            >
              {title}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    paddingVertical: spacing.md,
    fontSize: typography.secondary,
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
    marginRight: spacing.md,
  },
  title: {
    flex: 1,
    fontSize: typography.secondary,
  },
});
