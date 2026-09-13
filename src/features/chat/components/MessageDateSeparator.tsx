import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useLocale } from '../../../core/localization/LocaleProvider';
import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { radius } from '../../../design-system/tokens/radius';
import { spacing } from '../../../design-system/tokens/spacing';
import { formatMessageDate } from '../formatters/formatMessageDate';
import { getMessageDateBucket } from '../formatters/getMessageDateBucket';

type Props = {
  createdAt: number;
  now: number;
};

export function MessageDateSeparator({
  createdAt,
  now,
}: Props) {
  const { colors } = useTheme();
  const { locale, t } = useLocale();

  const bucket = getMessageDateBucket(
    createdAt,
    now,
  );

  const label = bucket === 'today'
    ? t('today')
    : bucket === 'yesterday'
      ? t('yesterday')
      : bucket === 'dated'
        ? formatMessageDate(createdAt, locale)
        : '';

  if (label.length === 0) {
    return null;
  }

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.pill,
          {
            backgroundColor: colors.surfaceElevated,
            borderColor: colors.border,
          },
        ]}
      >
        <Text
          accessibilityRole="text"
          style={[
            styles.label,
            { color: colors.textSecondary },
          ]}
        >
          {label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  pill: {
    minHeight: 28,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
});
