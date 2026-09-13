import React from 'react';
import {
  StyleSheet,
  Text,
} from 'react-native';

import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { spacing } from '../../../design-system/tokens/spacing';
import { typography } from '../../../design-system/tokens/typography';

type Props = {
  title: string;
};

export function SettingsSectionTitle({
  title,
}: Props) {
  const { colors } = useTheme();

  return (
    <Text
      accessibilityRole="header"
      style={[
        styles.title,
        { color: colors.textSecondary },
      ]}
    >
      {title}
    </Text>
  );
}

const styles = StyleSheet.create({
  title: {
    marginTop: spacing.xxl,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xl,
    fontSize: typography.caption,
    fontWeight: '700',
  },
});
