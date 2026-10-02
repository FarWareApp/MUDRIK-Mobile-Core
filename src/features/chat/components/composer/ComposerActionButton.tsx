import React, {
  PropsWithChildren,
} from 'react';
import {
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import {
  LinearGradient,
} from 'expo-linear-gradient';

import {
  useAccessibility,
} from '../../../../core/accessibility/AccessibilityProvider';
import {
  useTheme,
} from '../../../../design-system/theme/ThemeProvider';
import {
  depth,
} from '../../../../design-system/tokens/depth';
import {
  flagshipPalette,
} from '../../../../design-system/tokens/flagship';
import {
  motion,
} from '../../../../design-system/tokens/motion';
import {
  radius,
} from '../../../../design-system/tokens/radius';

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
  const {
    colors,
    mode,
  } = useTheme();
  const { reducedMotion } =
    useAccessibility();
  const palette =
    flagshipPalette[mode];
  const unavailable =
    disabled || !onPress;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        accessibilityLabel
      }
      accessibilityState={{
        disabled: unavailable,
      }}
      disabled={unavailable}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        emphasized
          ? depth.elevated
          : depth.subtle,
        {
          shadowColor:
            colors.shadow,
          opacity: unavailable
            ? 0.4
            : pressed
              ? 0.9
              : 1,
          transform: [
            {
              scale:
                pressed
                && !unavailable
                && !reducedMotion
                  ? motion.press.scale
                  : 1,
            },
          ],
        },
      ]}
    >
      {({ pressed }) => (
        <LinearGradient
          colors={
            emphasized
              ? pressed
                ? palette
                    .primaryActionPressed
                : palette
                    .primaryAction
              : pressed
                ? palette
                    .secondaryAction
                : palette.card
          }
          start={{
            x: 0.04,
            y: 0,
          }}
          end={{
            x: 0.96,
            y: 1,
          }}
          style={[
            styles.surface,
            {
              borderColor:
                emphasized
                  ? palette.glow
                  : palette.hairline,
            },
          ]}
        >
          <View
            importantForAccessibility="no"
            pointerEvents="none"
            style={[
              styles.highlight,
              {
                backgroundColor:
                  emphasized
                    ? 'rgba(255,255,255,0.14)'
                    : palette.shine,
              },
            ]}
          />

          <View
            importantForAccessibility="no"
            pointerEvents="none"
            style={[
              styles.metalTick,
              {
                backgroundColor:
                  emphasized
                    ? palette
                        .primaryActionText
                    : palette.metal,
              },
            ]}
          />

          {children}
        </LinearGradient>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 46,
    height: 46,
    borderRadius: radius.pill,
    flexShrink: 0,
  },
  surface: {
    flex: 1,
    overflow: 'hidden',
    borderWidth:
      StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlight: {
    position: 'absolute',
    top: 0,
    start: 9,
    end: 9,
    height: 1,
    opacity: 0.78,
  },
  metalTick: {
    position: 'absolute',
    top: 7,
    end: 7,
    width: 8,
    height: 2,
    borderRadius: radius.pill,
    opacity: 0.38,
  },
});
