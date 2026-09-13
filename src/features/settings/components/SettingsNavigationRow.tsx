import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { spacing } from '../../../design-system/tokens/spacing';
import { typography } from '../../../design-system/tokens/typography';

type Props = {
  title: string;
  description?: string;
  accessibilityLabel: string;
  onPress: () => void;
};

export function SettingsNavigationRow({
  title,
  description,
  accessibilityLabel,
  onPress,
}: Props) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        {
          borderBottomColor: colors.border,
          backgroundColor: pressed
            ? colors.surfacePressed
            : 'transparent',
        },
      ]}
    >
      <View style={styles.copy}>
        <Text
          style={[
            styles.title,
            { color: colors.textPrimary },
          ]}
        >
          {title}
        </Text>

        {description ? (
          <Text
            style={[
              styles.description,
              { color: colors.textSecondary },
            ]}
          >
            {description}
          </Text>
        ) : null}
      </View>

      <Text
        importantForAccessibility="no"
        style={[
          styles.chevron,
          { color: colors.textSecondary },
        ]}
      >
        ›
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  copy: {
    flex: 1,
    paddingRight: spacing.md,
  },
  title: {
    fontSize: typography.secondary,
    fontWeight: '600',
  },
  description: {
    marginTop: spacing.xs,
    fontSize: typography.caption,
    lineHeight: 17,
  },
  chevron: {
    fontSize: 22,
  },
});
