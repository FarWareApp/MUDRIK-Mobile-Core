import React from 'react';
import {
  StyleSheet,
  Text,
} from 'react-native';

import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { spacing } from '../../../design-system/tokens/spacing';
import { typeScale } from '../../../design-system/tokens/typography';

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
    ...typeScale.caption,
    marginTop: spacing.xxl,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xxl,
    fontWeight: '800',
    letterSpacing: 0.25,
    writingDirection: 'auto',
  },
});
