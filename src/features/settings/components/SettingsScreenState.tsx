import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useLocale } from '../../../core/localization/LocaleProvider';
import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { radius } from '../../../design-system/tokens/radius';
import { spacing } from '../../../design-system/tokens/spacing';
import { typeScale } from '../../../design-system/tokens/typography';

export function SettingsScreenState() {
  const { colors } = useTheme();
  const { t } = useLocale();

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLiveRegion="polite"
      style={styles.container}
    >
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
        <ActivityIndicator color={colors.accent} />
        <Text
          style={[
            styles.label,
            { color: colors.textSecondary },
          ]}
        >
          {t('loadingSettings')}
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
  card: {
    width: '100%',
    maxWidth: 320,
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
});
