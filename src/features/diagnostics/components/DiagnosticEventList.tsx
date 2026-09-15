import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type {
  DiagnosticEvent,
  DiagnosticLevel,
} from '../../../contracts/Diagnostics';
import { useLocale } from '../../../core/localization/LocaleProvider';
import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { radius } from '../../../design-system/tokens/radius';
import { spacing } from '../../../design-system/tokens/spacing';
import { typeScale } from '../../../design-system/tokens/typography';
import { DiagnosticEventCard } from './DiagnosticEventCard';

type Props = {
  loading: boolean;
  events: readonly DiagnosticEvent[];
};

export function DiagnosticEventList({
  loading,
  events,
}: Props) {
  const { colors } = useTheme();
  const { locale, t } = useLocale();
  const levelLabels = useMemo<Record<DiagnosticLevel, string>>(
    () => ({
      info: t('diagnosticLevelInfo'),
      warning: t('diagnosticLevelWarning'),
      error: t('diagnosticLevelError'),
    }),
    [t],
  );

  if (loading) {
    return (
      <View
        accessibilityLiveRegion="polite"
        accessibilityRole="progressbar"
        style={styles.loader}
      >
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (events.length === 0) {
    return (
      <View
        accessibilityLiveRegion="polite"
        style={[
          styles.emptyCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <Text
          style={[
            styles.body,
            { color: colors.textSecondary },
          ]}
        >
          {t('noLocalDiagnosticEvents')}
        </Text>
      </View>
    );
  }

  return (
    <View>
      {events.map((event) => (
        <DiagnosticEventCard
          key={event.id}
          event={event}
          locale={locale}
          levelLabels={levelLabels}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  loader: {
    minHeight: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  body: {
    ...typeScale.secondary,
    writingDirection: 'auto',
  },
});
