import React, {
  type ReactNode,
} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { motion } from '../../../design-system/tokens/motion';
import { radius } from '../../../design-system/tokens/radius';
import { spacing } from '../../../design-system/tokens/spacing';
import { typeScale } from '../../../design-system/tokens/typography';

type Props = {
  title: string;
  actionLabel?: string;
  actionText?: string;
  actionIcon?: ReactNode;
  disabled?: boolean;
  onAction?: () => void;
};

export function ProjectSectionHeader({
  title,
  actionLabel,
  actionText,
  actionIcon,
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
              transform: [
                {
                  scale: pressed && !disabled
                    ? motion.press.subtleScale
                    : 1,
                },
              ],
            },
          ]}
        >
          {actionIcon}
          <Text
            style={[
              styles.actionText,
              { color: colors.accent },
            ]}
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
    ...typeScale.body,
    fontWeight: '700',
  },
  action: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  actionText: {
    ...typeScale.secondary,
    fontWeight: '700',
  },
});
