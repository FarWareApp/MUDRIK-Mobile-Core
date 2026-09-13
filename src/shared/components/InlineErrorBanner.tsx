import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useLocale } from '../../core/localization/LocaleProvider';
import { useTheme } from '../../design-system/theme/ThemeProvider';
import { radius } from '../../design-system/tokens/radius';
import { spacing } from '../../design-system/tokens/spacing';
import { typography } from '../../design-system/tokens/typography';

type Props = {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
};

export function InlineErrorBanner({
  message,
  onRetry,
  onDismiss,
}: Props) {
  const { colors } = useTheme();
  const { t } = useLocale();

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.error,
        },
      ]}
    >
      <Text
        style={[
          styles.message,
          { color: colors.textPrimary },
        ]}
      >
        {message}
      </Text>

      {onRetry ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('retry')}
          onPress={onRetry}
          style={({ pressed }) => [
            styles.action,
            {
              backgroundColor: pressed
                ? colors.surfacePressed
                : 'transparent',
            },
          ]}
        >
          <Text
            style={{
              color: colors.accent,
              fontWeight: '700',
            }}
          >
            {t('retry')}
          </Text>
        </Pressable>
      ) : null}

      {onDismiss ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('dismissError')}
          onPress={onDismiss}
          style={({ pressed }) => [
            styles.action,
            {
              backgroundColor: pressed
                ? colors.surfacePressed
                : 'transparent',
            },
          ]}
        >
          <Text
            importantForAccessibility="no"
            style={{
              color: colors.textSecondary,
              fontSize: 18,
            }}
          >
            ×
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.md,
    overflow: 'hidden',
  },
  message: {
    flex: 1,
    fontSize: typography.caption,
    lineHeight: 17,
  },
  action: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
});
