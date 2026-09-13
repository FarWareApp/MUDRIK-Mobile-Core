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
  const unavailable = disabled || !onPress;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: unavailable }}
      disabled={unavailable}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: emphasized
            ? colors.accent
            : pressed
              ? colors.surfacePressed
              : colors.surface,
          borderColor: emphasized
            ? 'transparent'
            : pressed
              ? colors.accentSoft
              : colors.border,
          opacity: unavailable
            ? 0.44
            : pressed
              ? 0.86
              : 1,
          shadowColor: colors.shadow,
          shadowOpacity:
            emphasized && !unavailable
              ? pressed
                ? 0.18
                : 0.26
              : 0,
          shadowRadius: pressed ? 5 : 8,
          shadowOffset: {
            width: 0,
            height: pressed ? 2 : 4,
          },
          elevation:
            emphasized && !unavailable
              ? pressed
                ? 2
                : 4
              : 0,
          transform: [
            {
              scale:
                pressed && !unavailable
                  ? 0.96
                  : 1,
            },
          ],
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
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
