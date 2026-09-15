import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { CoreHealthSnapshot } from '../../../contracts/CoreHealth';
import { useLocale } from '../../../core/localization/LocaleProvider';
import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { radius } from '../../../design-system/tokens/radius';
import { spacing } from '../../../design-system/tokens/spacing';
import { typeScale } from '../../../design-system/tokens/typography';

type Props = {
  health: CoreHealthSnapshot;
};

export function CoreHealthCard({
  health,
}: Props) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const statusColor =
    health.status === 'healthy'
      ? colors.success
      : colors.warning;

  return (
    <View
      accessibilityLiveRegion="polite"
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          shadowColor: colors.shadow,
        },
      ]}
    >
      <View style={styles.rowBetween}>
        <Text
          style={[
            styles.title,
            { color: colors.textPrimary },
          ]}
        >
          {health.status === 'healthy'
            ? t('healthHealthy')
            : t('healthDegraded')}
        </Text>

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: statusColor,
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: statusColor },
            ]}
          >
            {health.ready
              ? t('healthReady')
              : t('healthStarting')}
          </Text>
        </View>
      </View>

      {health.issues.length === 0 ? (
        <Text
          style={[
            styles.body,
            { color: colors.textSecondary },
          ]}
        >
          {t('noCoreIssues')}
        </Text>
      ) : (
        health.issues.map((issue) => (
          <View
            key={issue.id}
            style={[
              styles.issue,
              { borderStartColor: colors.warning },
            ]}
          >
            <Text
              style={[
                styles.issueId,
                { color: colors.warning },
              ]}
            >
              {issue.id}
            </Text>
            <Text
              style={[
                styles.issueMessage,
                { color: colors.textSecondary },
              ]}
            >
              {issue.message}
            </Text>
          </View>
        ))
      )}
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
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  title: {
    ...typeScale.heading,
    flexShrink: 1,
    fontWeight: '700',
    writingDirection: 'auto',
  },
  statusBadge: {
    minHeight: 32,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  statusText: {
    ...typeScale.caption,
    fontWeight: '700',
    writingDirection: 'auto',
  },
  body: {
    ...typeScale.secondary,
    marginTop: spacing.md,
    writingDirection: 'auto',
  },
  issue: {
    marginTop: spacing.md,
    borderStartWidth: 2,
    paddingStart: spacing.md,
    gap: spacing.xs,
  },
  issueId: {
    ...typeScale.caption,
    fontWeight: '700',
    writingDirection: 'auto',
  },
  issueMessage: {
    ...typeScale.secondary,
    writingDirection: 'auto',
  },
});
