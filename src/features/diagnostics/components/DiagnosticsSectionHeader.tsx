import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAccessibility } from '../../../core/accessibility/AccessibilityProvider';
import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { motion } from '../../../design-system/tokens/motion';
import { radius } from '../../../design-system/tokens/radius';
import { spacing } from '../../../design-system/tokens/spacing';
import { typeScale } from '../../../design-system/tokens/typography';

type Props = {
  title: string;
  actionLabel?: string;
  actionText?: string;
  disabled?: boolean;
  onAction?: () => void;
};

export function DiagnosticsSectionHeader({
  title,
  actionLabel,
  actionText,
  disabled = false,
  onAction,
}: Props) {
  const { colors } = useTheme();
  const { reducedMotion } = useAccessibility();

  return (
    <View style={styles.container}>
      <Text
        accessibilityRole="header"
        style={[
          styles.title,
          { color: colors.textSecondary },
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
                  scale:
                    pressed
                    && !disabled
                    && !reducedMotion
                      ? motion.press.subtleScale
                      : 1,
                },
              ],
            },
          ]}
        >
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
    minHeight: 52,
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    ...typeScale.caption,
    flex: 1,
    fontWeight: '700',
    writingDirection: 'auto',
  },
  action: {
    minHeight: 44,
    flexShrink: 0,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  actionText: {
    ...typeScale.secondary,
    fontWeight: '700',
    writingDirection: 'auto',
  },
});
