import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';

import { useTheme } from '../../../design-system/theme/ThemeProvider';

type Props = {
  expanded: boolean;
  onPress: () => void;
};

export function QuickActionButton({
  expanded,
  onPress,
}: Props) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Quick actions"
      accessibilityState={{ expanded }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: expanded
            ? colors.surface
            : colors.accent,
          borderColor: expanded
            ? colors.border
            : colors.accent,
          opacity: pressed ? 0.86 : 1,
          shadowColor: colors.shadow,
          transform: [
            { scale: pressed ? 0.96 : 1 },
          ],
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: expanded
              ? colors.textPrimary
              : colors.accentText,
          },
        ]}
      >
        {expanded ? '×' : '+'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: 18,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 40,
    elevation: 8,
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 8,
    },
  },

  text: {
    fontSize: 30,
    lineHeight: 32,
    fontWeight: '500',
  },
});
