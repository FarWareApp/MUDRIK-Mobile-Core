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

type Props = {
  createdAt: number;
};

export function MessageDateSeparator({
  createdAt,
}: Props) {
  const { colors } = useTheme();
  const { locale } = useLocale();

  const label = formatMessageDate(
    createdAt,
    locale,
  );

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
