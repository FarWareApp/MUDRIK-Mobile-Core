import React from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { useLocale } from '../../../core/localization/LocaleProvider';
import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { motion } from '../../../design-system/tokens/motion';
import { radius } from '../../../design-system/tokens/radius';
import { spacing } from '../../../design-system/tokens/spacing';
import { typeScale } from '../../../design-system/tokens/typography';
import { ConversationClearIcon } from './ConversationClearIcon';
import { ConversationSearchIcon } from './ConversationSearchIcon';

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
  const hasQuery = value.length > 0;

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
      <View style={styles.searchIconSlot}>
        <ConversationSearchIcon
          color={colors.textSecondary}
        />
      </View>

      <TextInput
        accessibilityLabel={t('searchConversations')}
        value={value}
        onChangeText={onChangeText}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardAppearance={mode}
        placeholder={t('searchConversations')}
        placeholderTextColor={
          colors.textSecondary
        }
        returnKeyType="search"
        underlineColorAndroid="transparent"
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
              transform: [
                {
                  scale: pressed
                    ? motion.press.subtleScale
                    : 1,
                },
              ],
            },
          ]}
        >
          <ConversationClearIcon
            color={colors.textSecondary}
          />
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
    paddingStart: spacing.md,
    paddingEnd: spacing.xs,
  },
  searchIconSlot: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    ...typeScale.secondary,
    flex: 1,
    minHeight: 46,
    paddingHorizontal: spacing.sm,
    writingDirection: 'auto',
  },
  clear: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
