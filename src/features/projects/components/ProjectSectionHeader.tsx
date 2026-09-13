import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { radius } from '../../../design-system/tokens/radius';
import { spacing } from '../../../design-system/tokens/spacing';
import { typography } from '../../../design-system/tokens/typography';

type Props = {
  title: string;
  actionLabel?: string;
  actionText?: string;
  disabled?: boolean;
  onAction?: () => void;
};

export function ProjectSectionHeader({
  title,
  actionLabel,
  actionText,
  disabled = false,
  onAction,
}: Props) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text
        accessibilityRole="header"
        style={[
          styles.title,
          { color: colors.textPrimary },
        ]}
      >
        {title}
      </Text>

      {actionLabel && actionText && onAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={onAction}
          style={({ pressed }) => [
            styles.action,
            {
              backgroundColor: pressed
                ? colors.surfacePressed
                : 'transparent',
              opacity: disabled ? 0.44 : 1,
            },
          ]}
        >
          <Text
            style={{
              color: colors.accent,
              fontWeight: '700',
            }}
          >
            {actionText}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  title: {
    fontSize: typography.body,
    fontWeight: '700',
  },
  action: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
});
