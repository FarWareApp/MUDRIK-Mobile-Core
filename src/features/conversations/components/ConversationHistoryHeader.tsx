import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { useLocale } from '../../../core/localization/LocaleProvider';
import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { motion } from '../../../design-system/tokens/motion';
import { radius } from '../../../design-system/tokens/radius';
import { spacing } from '../../../design-system/tokens/spacing';
import { typeScale } from '../../../design-system/tokens/typography';
import { ConversationAddIcon } from './ConversationAddIcon';
import { ConversationBackIcon } from './ConversationBackIcon';

type Props = {
  busy?: boolean;
  onNewConversation: () => void;
};

export function ConversationHistoryHeader({
  busy = false,
  onNewConversation,
}: Props) {
  const { colors } = useTheme();
  const { isRTL, t } = useLocale();

  return (
    <View
      style={[
        styles.container,
        {
          borderBottomColor: colors.border,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('back')}
        onPress={() => router.back()}
        style={({ pressed }) => [
          styles.circleButton,
          {
            backgroundColor: pressed
              ? colors.surfacePressed
              : colors.surfaceElevated,
            borderColor: colors.border,
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
        <ConversationBackIcon
          color={colors.textPrimary}
          isRTL={isRTL}
        />
      </Pressable>

      <Text
        accessibilityRole="header"
        numberOfLines={1}
        style={[
          styles.title,
          {
            color: colors.textPrimary,
          },
        ]}
      >
        {t('conversations')}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('newConversation')}
        accessibilityState={{ disabled: busy }}
        disabled={busy}
        onPress={onNewConversation}
        style={({ pressed }) => [
          styles.circleButton,
          styles.primaryButton,
          {
            backgroundColor: colors.accent,
            borderColor: colors.accent,
            opacity: busy
              ? 0.44
              : pressed
                ? 0.86
                : 1,
            shadowColor: colors.shadow,
            transform: [
              {
                scale: pressed && !busy
                  ? motion.press.scale
                  : 1,
              },
            ],
          },
        ]}
      >
        <ConversationAddIcon
          color={colors.accentText}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth:
      StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
  },
  title: {
    ...typeScale.heading,
    flex: 1,
    paddingHorizontal: spacing.sm,
    textAlign: 'center',
    fontWeight: '700',
  },
  circleButton: {
    width: 44,
    height: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    elevation: 4,
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },
  },
});
