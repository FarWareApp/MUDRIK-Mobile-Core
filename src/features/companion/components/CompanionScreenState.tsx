import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAccessibility } from '../../../core/accessibility/AccessibilityProvider';
import { useLocale } from '../../../core/localization/LocaleProvider';
import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { motion } from '../../../design-system/tokens/motion';
import { radius } from '../../../design-system/tokens/radius';
import { spacing } from '../../../design-system/tokens/spacing';
import { typeScale } from '../../../design-system/tokens/typography';

type Props = {
  mode: 'loading' | 'error';
  onRetry?: () => void;
};

export function CompanionScreenState({
  mode,
  onRetry,
}: Props) {
  const { colors } = useTheme();
  const { reducedMotion } = useAccessibility();
  const { t } = useLocale();
  const loading = mode === 'loading';

  return (
    <View style={styles.container}>
      <View
        accessibilityRole={loading ? undefined : 'alert'}
        accessibilityLiveRegion={loading ? 'polite' : 'assertive'}
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: colors.shadow,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator
            accessibilityRole="progressbar"
            color={colors.accent}
          />
        ) : null}

        <Text
          style={[
            styles.label,
            { color: colors.textSecondary },
          ]}
        >
          {loading
            ? t('loadingCompanion')
            : t('companionLoadFailed')}
        </Text>

        {!loading && onRetry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('retryLoadingCompanion')}
            onPress={onRetry}
            style={({ pressed }) => [
              styles.retry,
              {
                backgroundColor: pressed
                  ? colors.surfacePressed
                  : colors.surfaceElevated,
                borderColor: colors.border,
                transform: [
                  {
                    scale:
                      pressed && !reducedMotion
                        ? motion.press.subtleScale
                        : 1,
                  },
                ],
              },
            ]}
          >
            <Text
              style={[
                styles.retryText,
                { color: colors.accent },
              ]}
            >
              {t('retry')}
            </Text>
          </Pressable>
        ) : null}
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
  card: {
    width: '100%',
    maxWidth: 360,
    minHeight: 124,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.xl,
    elevation: 1,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
  },
  label: {
    ...typeScale.secondary,
    marginTop: spacing.sm,
    textAlign: 'center',
    writingDirection: 'auto',
  },
  retry: {
    minHeight: 44,
    marginTop: spacing.lg,
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
  },
  retryText: {
    ...typeScale.secondary,
    fontWeight: '700',
  },
});
