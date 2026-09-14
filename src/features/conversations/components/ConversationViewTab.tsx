import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';

import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { motion } from '../../../design-system/tokens/motion';
import { radius } from '../../../design-system/tokens/radius';
import { typeScale } from '../../../design-system/tokens/typography';

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

export function ConversationViewTab({
  label,
  selected,
  onPress,
}: Props) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tab,
        {
          backgroundColor: selected
            ? colors.surface
            : pressed
              ? colors.surfacePressed
              : 'transparent',
          borderColor: selected
            ? colors.border
            : 'transparent',
          transform: [
            {
              scale: pressed
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
            color: selected
              ? colors.textPrimary
              : colors.textSecondary,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tab: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
  },
  label: {
    ...typeScale.secondary,
    fontWeight: '700',
  },
});
