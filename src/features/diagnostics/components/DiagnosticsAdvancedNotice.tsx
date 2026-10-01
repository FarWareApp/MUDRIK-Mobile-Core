import React from 'react';
import {
  StyleSheet,
  Text,
} from 'react-native';

import {
  useLocale,
} from '../../../core/localization/LocaleProvider';
import {
  InsetSurfaceCard,
} from '../../../design-system/components/InsetSurfaceCard';
import {
  useTheme,
} from '../../../design-system/theme/ThemeProvider';
import {
  spacing,
} from '../../../design-system/tokens/spacing';
import {
  typeScale,
} from '../../../design-system/tokens/typography';

export function DiagnosticsAdvancedNotice() {
  const { colors } = useTheme();
  const { t } = useLocale();

  return (
    <InsetSurfaceCard
      elevated={false}
      style={[
        styles.card,
        {
          backgroundColor:
            colors.surfaceInput,
        },
      ]}
    >
      <Text
        style={[
          styles.title,
          {
            color: colors.textPrimary,
          },
        ]}
      >
        {t('diagnosticsAdvancedTab')}
      </Text>

      <Text
        style={[
          styles.body,
          {
            color:
              colors.textSecondary,
          },
        ]}
      >
        {t(
          'diagnosticsAdvancedDescription',
        )}
      </Text>
    </InsetSurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  title: {
    ...typeScale.secondary,
    fontWeight: '800',
    writingDirection: 'auto',
  },
  body: {
    ...typeScale.caption,
    marginTop: spacing.xs,
    writingDirection: 'auto',
  },
});
