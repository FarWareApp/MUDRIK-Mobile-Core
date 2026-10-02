import React, {
  type ReactNode,
} from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import {
  LinearGradient,
} from 'expo-linear-gradient';

import {
  useAccessibility,
} from '../../core/accessibility/AccessibilityProvider';
import {
  useTheme,
} from '../theme/ThemeProvider';
import {
  depth,
} from '../tokens/depth';
import {
  flagshipPalette,
} from '../tokens/flagship';
import {
  motion,
} from '../tokens/motion';
import {
  radius,
} from '../tokens/radius';

type Props = {
  accessibilityLabel: string;
  primary?: boolean;
  disabled?: boolean;
  size?: number;
  renderIcon: (
    color: string,
  ) => ReactNode;
  onPress: () => void;
};

export function FlagshipIconButton({
  accessibilityLabel,
  primary = false,
  disabled = false,
  size = 44,
  renderIcon,
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

  const iconColor =
    primary
      ? palette.primaryActionText
      : colors.textPrimary;

  const depthStyle:
    ViewStyle =
      primary
        ? depth.elevated
        : depth.subtle;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        accessibilityLabel
      }
      accessibilityState={{
        disabled,
      }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.frame,
        depthStyle,
        {
          width: size,
          height: size,
          borderRadius:
            radius.pill,
          shadowColor:
            colors.shadow,
          opacity:
            disabled
              ? 0.44
              : pressed
                ? 0.96
                : 1,
          transform: [
            {
              scale:
                pressed
                && !disabled
                && !reducedMotion
                  ? primary
                    ? motion.press.scale
                    : motion.press
                        .subtleScale
                  : 1,
            },
          ],
        },
      ]}
    >
      {({ pressed }) => (
        <LinearGradient
          colors={
            primary
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
            x: 0.08,
            y: 0,
          }}
          end={{
            x: 0.92,
            y: 1,
          }}
          style={[
            styles.surface,
            {
              borderColor:
                primary
                  ? palette.glow
                  : palette.hairline,
              borderRadius:
                radius.pill,
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
                  primary
                    ? 'rgba(255,255,255,0.14)'
                    : palette.shine,
              },
            ]}
          />

          {renderIcon(
            iconColor,
          )}
        </LinearGradient>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: 'stretch',
    justifyContent: 'center',
  },
  surface: {
    flex: 1,
    overflow: 'hidden',
    borderWidth:
      StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlight: {
    position: 'absolute',
    top: 0,
    start: 9,
    end: 9,
    height: 1,
    opacity: 0.7,
    borderRadius: radius.pill,
  },
});
