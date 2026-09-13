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
import { radius } from '../../../design-system/tokens/radius';
import { spacing } from '../../../design-system/tokens/spacing';
import { typography } from '../../../design-system/tokens/typography';

type Props = {
  onNewConversation: () => void;
};

export function ConversationHistoryHeader({
  onNewConversation,
}: Props) {
  const { colors } = useTheme();
  const { t } = useLocale();

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
          },
        ]}
      >
        <Text
          style={{
            color: colors.textPrimary,
            fontSize: 23,
          }}
        >
          ‹
        </Text>
      </Pressable>

      <Text
        accessibilityRole="header"
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
        onPress={onNewConversation}
        style={({ pressed }) => [
          styles.circleButton,
          styles.primaryButton,
          {
            backgroundColor: colors.accent,
            borderColor: colors.accent,
            opacity: pressed ? 0.86 : 1,
            shadowColor: colors.shadow,
            transform: [
              { scale: pressed ? 0.96 : 1 },
            ],
          },
        ]}
      >
        <Text
          style={{
            color: colors.accentText,
            fontSize: 25,
          }}
        >
          +
        </Text>
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
    flex: 1,
    textAlign: 'center',
    fontSize: typography.heading,
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
