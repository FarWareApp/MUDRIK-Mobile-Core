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
  busy: boolean;
  removedCount: number | null;
  onRun: () => void;
};

export function StorageMaintenanceCard({
  busy,
  removedCount,
  onRun,
}: Props) {
  const { colors } = useTheme();
  const { reducedMotion } = useAccessibility();
  const { locale, t } = useLocale();

  const feedback =
    removedCount === null
      ? null
      : removedCount === 0
        ? t('storageAlreadyClean')
        : `${t('storageCleanupRemoved')} ${new Intl.NumberFormat(locale).format(removedCount)} ${t('orphanAttachments')}`;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          shadowColor: colors.shadow,
        },
      ]}
    >
      <Text
        style={[
          styles.body,
          { color: colors.textSecondary },
        ]}
      >
        {t('storageMaintenanceDescription')}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('runSafeStorageCleanup')}
        accessibilityState={{ disabled: busy, busy }}
        disabled={busy}
        onPress={onRun}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: colors.accent,
            opacity: busy ? 0.58 : 1,
            transform: [
              {
                scale:
                  pressed
                  && !busy
                  && !reducedMotion
                    ? motion.press.subtleScale
                    : 1,
              },
            ],
          },
        ]}
      >
        <View style={styles.buttonContent}>
          {busy ? (
            <ActivityIndicator
              color={colors.accentText}
              size="small"
            />
          ) : null}

          <Text
            style={[
              styles.buttonText,
              { color: colors.accentText },
            ]}
          >
            {t('runSafeCleanup')}
          </Text>
        </View>
      </Pressable>

      {feedback ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[
            styles.feedback,
            { color: colors.success },
          ]}
        >
          {feedback}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.xl,
    padding: spacing.lg,
    elevation: 1,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
  },
  body: {
    ...typeScale.secondary,
    writingDirection: 'auto',
  },
  button: {
    minHeight: 48,
    borderRadius: radius.pill,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    marginTop: spacing.lg,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  buttonText: {
    ...typeScale.secondary,
    fontWeight: '700',
    textAlign: 'center',
    writingDirection: 'auto',
  },
  feedback: {
    ...typeScale.caption,
    marginTop: spacing.md,
    writingDirection: 'auto',
  },
});
