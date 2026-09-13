import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useLocale } from '../../../core/localization/LocaleProvider';
import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { radius } from '../../../design-system/tokens/radius';
import { spacing } from '../../../design-system/tokens/spacing';
import { typography } from '../../../design-system/tokens/typography';

type Props = {
  value: string;
  onChangeText: (value: string) => void;
};

export function ConversationSearchBar({
  value,
  onChangeText,
}: Props) {
  const { colors, mode } = useTheme();
  const { isRTL, t } = useLocale();
  const hasQuery =
    value.trim().length > 0;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor:
            colors.surfaceInput,
          borderColor: colors.border,
        },
      ]}
    >
      <Text
        importantForAccessibility="no"
        style={[
          styles.icon,
          { color: colors.textSecondary },
        ]}
      >
        ⌕
      </Text>

      <TextInput
        accessibilityLabel={t('searchConversations')}
        value={value}
        onChangeText={onChangeText}
        keyboardAppearance={mode}
        placeholder={t('searchConversations')}
        placeholderTextColor={
          colors.textSecondary
        }
        returnKeyType="search"
        style={[
          styles.input,
          {
            color: colors.textPrimary,
            textAlign: isRTL ? 'right' : 'left',
          },
        ]}
      />

      {hasQuery && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('clearSearch')}
          onPress={() => onChangeText('')}
          style={({ pressed }) => [
            styles.clear,
            {
              backgroundColor: pressed
                ? colors.surfacePressed
                : colors.surface,
            },
          ]}
        >
          <Text
            importantForAccessibility="no"
            style={[
              styles.clearText,
              { color: colors.textSecondary },
            ]}
          >
            ×
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
  },

  icon: {
    width: 24,
    fontSize: 19,
    lineHeight: 22,
    textAlign: 'center',
  },

  input: {
    flex: 1,
    minHeight: 46,
    paddingHorizontal: spacing.sm,
    fontSize: typography.secondary,
    writingDirection: 'auto',
  },

  clear: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },

  clearText: {
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '700',
  },
});
