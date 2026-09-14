import React, {
  type ReactNode,
} from 'react';
import {
  Pressable,
  StyleSheet,
} from 'react-native';

import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { motion } from '../../../design-system/tokens/motion';
import { radius } from '../../../design-system/tokens/radius';

type ActionTone =
  | 'default'
  | 'accent'
  | 'danger';

type Props = {
  accessibilityLabel: string;
  disabled?: boolean;
  selected?: boolean;
  tone?: ActionTone;
  icon: (color: string) => ReactNode;
  onPress: () => void;
};

export function ConversationListActionButton({
  accessibilityLabel,
  disabled = false,
  selected = false,
  tone = 'default',
  icon,
  onPress,
}: Props) {
  const { colors } = useTheme();

  const iconColor =
    tone === 'danger'
      ? colors.error
      : selected || tone === 'accent'
        ? colors.accent
        : colors.textSecondary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{
        disabled,
        selected,
      }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        {
          backgroundColor: selected
            ? colors.accentSoft
            : pressed
              ? colors.surfacePressed
              : 'transparent',
          opacity: disabled
            ? 0.44
            : pressed
              ? 0.82
              : 1,
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
      {icon(iconColor)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  action: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
