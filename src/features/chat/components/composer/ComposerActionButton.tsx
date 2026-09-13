import React, {
  PropsWithChildren,
} from 'react';
import {
  Pressable,
  StyleSheet,
} from 'react-native';

import { useTheme } from '../../../../design-system/theme/ThemeProvider';
import { radius } from '../../../../design-system/tokens/radius';

type Props = PropsWithChildren<{
  accessibilityLabel: string;
  disabled?: boolean;
  emphasized?: boolean;
  onPress?: () => void;
}>;

export function ComposerActionButton({
  accessibilityLabel,
  children,
  disabled = false,
  emphasized = false,
  onPress,
}: Props) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: emphasized
            ? colors.accent
            : pressed
              ? colors.surfaceElevated
              : 'transparent',
          opacity: disabled
            ? 0.4
            : pressed
              ? 0.72
              : 1,
        },
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
