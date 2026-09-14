import React from 'react';

import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  useLocale,
} from '../localization/LocaleProvider';
import {
  useTheme,
} from '../../design-system/theme/ThemeProvider';
import {
  spacing,
} from '../../design-system/tokens/spacing';
import {
  typeScale,
} from '../../design-system/tokens/typography';

import {
  useRuntime,
} from './RuntimeProvider';

export function RuntimeStatusBanner() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const runtime = useRuntime();

  if (
    runtime.networkLoading
    || !runtime.isOffline
  ) {
    return null;
  }

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.container,
        {
          backgroundColor:
            colors.surfaceElevated,
          borderBottomColor:
            colors.border,
        },
      ]}
    >
      <Text
        style={[
          styles.title,
          { color: colors.textPrimary },
        ]}
      >
        {t('offlineStatus')}
      </Text>

      <Text
        style={[
          styles.detail,
          { color: colors.textSecondary },
        ]}
      >
        {t('offlineLocalFeaturesAvailable')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 44,
    borderBottomWidth:
      StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  title: {
    ...typeScale.caption,
    fontWeight: '700',
    textAlign: 'center',
  },
  detail: {
    ...typeScale.micro,
    textAlign: 'center',
  },
});
