import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';

import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { motion } from '../../../design-system/tokens/motion';
import { radius } from '../../../design-system/tokens/radius';
import { spacing } from '../../../design-system/tokens/spacing';
import { typeScale } from '../../../design-system/tokens/typography';

type Props = {
  label: string;
  primary?: boolean;
  disabled?: boolean;
  onPress: () => void;
};

export function VoiceControlButton({
  label,
  primary = false,
  disabled = false,
  onPress,
}: Props) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.control,
        {
          backgroundColor: primary
            ? colors.accent
            : pressed
              ? colors.surfacePressed
              : colors.surfaceElevated,
          borderColor: primary
            ? colors.accent
            : colors.border,
          opacity: disabled
            ? 0.5
            : pressed
              ? 0.86
              : 1,
          transform: [
            {
              scale:
                pressed && !disabled
                  ? motion.press.subtleScale
                  : 1,
            },
          ],
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            color: primary
              ? colors.accentText
              : colors.textPrimary,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  control: {
    minWidth: 104,
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  label: {
    ...typeScale.secondary,
    fontWeight: '700',
  },
});
