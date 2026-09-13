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
import { typography } from '../../../design-system/tokens/typography';

type Props = {
  health: CoreHealthSnapshot;
};

export function CoreHealthCard({
  health,
}: Props) {
  const { colors } = useTheme();
  const { t } = useLocale();

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

        <Text
          style={{
            color: health.status === 'healthy'
              ? colors.success
              : colors.warning,
            fontWeight: '700',
          }}
        >
          {health.ready
            ? t('healthReady')
            : t('healthStarting')}
        </Text>
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
            style={styles.issue}
          >
            <Text
              style={{
                color: colors.warning,
                fontWeight: '700',
              }}
            >
              {issue.id}
            </Text>
            <Text
              style={[
                styles.body,
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
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  title: {
    fontSize: typography.body,
    fontWeight: '700',
  },
  body: {
    marginTop: spacing.sm,
    fontSize: typography.secondary,
    lineHeight: 19,
  },
  issue: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
});
