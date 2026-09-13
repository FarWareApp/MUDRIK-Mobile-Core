import React from 'react';
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
import { typography } from '../../../design-system/tokens/typography';
import { formatDiagnosticTimestamp } from '../formatters/formatDiagnosticTimestamp';

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

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (events.length === 0) {
    return (
      <View
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

  const levelLabels: Record<DiagnosticLevel, string> = {
    info: t('diagnosticLevelInfo'),
    warning: t('diagnosticLevelWarning'),
    error: t('diagnosticLevelError'),
  };

  return (
    <View>
      {events.map((event) => {
        const timestamp = formatDiagnosticTimestamp(
          event.timestamp,
          locale,
        );

        return (
          <View
            key={event.id}
            style={[
              styles.eventCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.rowBetween}>
              <Text
                numberOfLines={1}
                style={[
                  styles.module,
                  { color: colors.textPrimary },
                ]}
              >
                {event.module}
              </Text>

              <Text
                style={[
                  styles.level,
                  {
                    color:
                      event.level === 'error'
                        ? colors.error
                        : event.level === 'warning'
                          ? colors.warning
                          : colors.textSecondary,
                  },
                ]}
              >
                {levelLabels[event.level]}
              </Text>
            </View>

            <Text
              selectable
              style={[
                styles.eventText,
                { color: colors.textSecondary },
              ]}
            >
              {event.event}
            </Text>

            {timestamp ? (
              <Text
                style={[
                  styles.timestamp,
                  { color: colors.textSecondary },
                ]}
              >
                {timestamp}
              </Text>
            ) : null}
          </View>
        );
      })}
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
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  eventCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  module: {
    flex: 1,
    fontSize: typography.secondary,
    fontWeight: '700',
  },
  level: {
    fontSize: typography.caption,
    fontWeight: '700',
  },
  eventText: {
    marginTop: spacing.sm,
    fontSize: typography.caption,
    lineHeight: 18,
  },
  timestamp: {
    marginTop: spacing.sm,
    fontSize: typography.caption,
    fontVariant: ['tabular-nums'],
  },
  body: {
    fontSize: typography.secondary,
    lineHeight: 19,
  },
});
