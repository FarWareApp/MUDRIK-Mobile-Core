import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useLocale } from '../../../core/localization/LocaleProvider';
import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { motion } from '../../../design-system/tokens/motion';
import { radius } from '../../../design-system/tokens/radius';
import { spacing } from '../../../design-system/tokens/spacing';
import { typeScale } from '../../../design-system/tokens/typography';

type Props = {
  mode:
    | 'loading'
    | 'error'
    | 'empty'
    | 'no-results';
  onRetry?: () => void;
};

export function ConversationHistoryState({
  mode,
  onRetry,
}: Props) {
  const { colors } = useTheme();
  const { t } = useLocale();

  if (mode === 'loading') {
    return (
      <View style={styles.container}>
        <View
          style={[
            styles.stateCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowColor: colors.shadow,
            },
          ]}
        >
          <ActivityIndicator
            accessibilityRole="progressbar"
            accessibilityLabel={t('loadingConversations')}
            color={colors.accent}
          />

          <Text
            accessibilityLiveRegion="polite"
            style={[
              styles.body,
              {
                color: colors.textSecondary,
              },
            ]}
          >
            {t('loadingConversations')}
          </Text>
        </View>
      </View>
    );
  }

  if (mode === 'error') {
    return (
      <View style={styles.container}>
        <View
          style={[
            styles.stateCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.error,
              shadowColor: colors.shadow,
            },
          ]}
        >
          <Text
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
            style={[
              styles.body,
              {
                color: colors.textPrimary,
              },
            ]}
          >
            {t('conversationHistoryFailed')}
          </Text>

          {onRetry && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('retry')}
              onPress={onRetry}
              style={({ pressed }) => [
                styles.retry,
                {
                  backgroundColor: colors.accent,
                  opacity: pressed ? 0.86 : 1,
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
              <Text
                style={{
                  color: colors.accentText,
                  fontWeight: '700',
                }}
              >
                {t('retry')}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  const message =
    mode === 'no-results'
      ? t('noConversationSearchResults')
      : t('noConversations');

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.stateCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: colors.shadow,
          },
        ]}
      >
        <Text
          accessibilityLiveRegion="polite"
          style={[
            styles.body,
            { color: colors.textSecondary },
          ]}
        >
          {message}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  stateCard: {
    width: '100%',
    maxWidth: 340,
    minHeight: 132,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.xxl,
    elevation: 1,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
  },
  body: {
    ...typeScale.secondary,
    textAlign: 'center',
  },
  retry: {
    minHeight: 44,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
});
