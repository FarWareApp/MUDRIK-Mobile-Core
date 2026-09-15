import React, { memo } from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type {
  DiagnosticEvent,
  DiagnosticLevel,
} from '../../../contracts/Diagnostics';
import type { AppLocale } from '../../../core/localization/translations';
import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { radius } from '../../../design-system/tokens/radius';
import { spacing } from '../../../design-system/tokens/spacing';
import { typeScale } from '../../../design-system/tokens/typography';
import { formatDiagnosticTimestamp } from '../formatters/formatDiagnosticTimestamp';

type Props = {
  event: DiagnosticEvent;
  locale: AppLocale;
  levelLabels: Record<DiagnosticLevel, string>;
};

export const DiagnosticEventCard = memo(
  function DiagnosticEventCard({
    event,
    locale,
    levelLabels,
  }: Props) {
    const { colors } = useTheme();
    const timestamp = formatDiagnosticTimestamp(
      event.timestamp,
      locale,
    );
    const levelColor =
      event.level === 'error'
        ? colors.error
        : event.level === 'warning'
          ? colors.warning
          : colors.textSecondary;

    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.rowBetween}>
          <Text
            numberOfLines={2}
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
              { color: levelColor },
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
  },
);

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  module: {
    ...typeScale.secondary,
    flex: 1,
    fontWeight: '700',
    writingDirection: 'auto',
  },
  level: {
    ...typeScale.caption,
    flexShrink: 0,
    fontWeight: '700',
    writingDirection: 'auto',
  },
  eventText: {
    ...typeScale.caption,
    marginTop: spacing.sm,
    writingDirection: 'auto',
  },
  timestamp: {
    ...typeScale.caption,
    marginTop: spacing.sm,
    fontVariant: ['tabular-nums'],
    writingDirection: 'auto',
  },
});
