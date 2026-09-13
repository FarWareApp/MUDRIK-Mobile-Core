import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useLocale } from '../../../core/localization/LocaleProvider';
import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { radius } from '../../../design-system/tokens/radius';
import { spacing } from '../../../design-system/tokens/spacing';
import { typography } from '../../../design-system/tokens/typography';

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
            opacity: busy
              ? 0.5
              : pressed
                ? 0.86
                : 1,
          },
        ]}
      >
        <Text
          style={{
            color: colors.accentText,
            fontWeight: '700',
          }}
        >
          {t('runSafeCleanup')}
        </Text>
      </Pressable>

      {feedback ? (
        <Text
          accessibilityRole="alert"
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
    borderRadius: radius.lg,
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
    fontSize: typography.secondary,
    lineHeight: 19,
  },
  button: {
    alignSelf: 'flex-start',
    minHeight: 44,
    borderRadius: radius.pill,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    marginTop: spacing.lg,
  },
  feedback: {
    marginTop: spacing.md,
    fontSize: typography.caption,
    lineHeight: 17,
  },
});
