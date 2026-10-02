import React, {
  type ReactNode,
} from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
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
import {
  spacing,
} from '../tokens/spacing';
import {
  typeScale,
} from '../tokens/typography';

type Props = {
  label: string;
  primary?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress: () => void;
};

export function FlagshipActionButton({
  label,
  primary = false,
  disabled = false,
  icon,
  style,
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

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{
        disabled,
      }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.frame,
        primary
          ? depth.elevated
          : depth.subtle,
        {
          shadowColor:
            colors.shadow,
          opacity:
            disabled
              ? 0.46
              : pressed
                ? 0.96
                : 1,
          transform: [
            {
              scale:
                pressed
                && !disabled
                && !reducedMotion
                  ? motion.press
                      .subtleScale
                  : 1,
            },
          ],
        },
        style,
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
                primary
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
                  primary
                    ? 'rgba(255,255,255,0.12)'
                    : palette.shine,
              },
            ]}
          />

          <View
            importantForAccessibility="no"
            pointerEvents="none"
            style={[
              styles.metalLine,
              {
                backgroundColor:
                  primary
                    ? palette.primaryActionText
                    : palette.metal,
                opacity:
                  primary
                    ? 0.28
                    : 0.36,
              },
            ]}
          />

          {icon ? (
            <View
              importantForAccessibility="no-hide-descendants"
              style={[
                styles.icon,
                {
                  backgroundColor:
                    primary
                      ? 'rgba(247,244,236,0.10)'
                      : colors.accentSoft,
                  borderColor:
                    primary
                      ? 'rgba(247,244,236,0.18)'
                      : palette.hairline,
                },
              ]}
            >
              {icon}
            </View>
          ) : null}

          <Text
            numberOfLines={2}
            style={[
              styles.label,
              {
                color: primary
                  ? palette
                      .primaryActionText
                  : colors.textPrimary,
              },
            ]}
          >
            {label}
          </Text>

          <View
            importantForAccessibility="no"
            pointerEvents="none"
            style={[
              styles.actionDisc,
              {
                borderColor:
                  primary
                    ? 'rgba(247,244,236,0.20)'
                    : palette.hairline,
              },
            ]}
          >
            <View
              style={[
                styles.actionLine,
                {
                  backgroundColor:
                    primary
                      ? palette
                          .primaryActionText
                      : colors.accent,
                },
              ]}
            />
          </View>
        </LinearGradient>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  frame: {
    minWidth: 124,
    minHeight: 52,
    borderRadius: radius.pill,
  },
  surface: {
    minHeight: 52,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth:
      StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    paddingStart: spacing.xl,
    paddingEnd: 48,
    paddingVertical: spacing.sm,
  },
  highlight: {
    position: 'absolute',
    top: 0,
    start: 18,
    end: 18,
    height: 1,
    borderRadius: radius.pill,
  },
  metalLine: {
    position: 'absolute',
    top: 12,
    start: 28,
    width: 28,
    height: 1,
    borderRadius: radius.pill,
  },
  icon: {
    width: 34,
    height: 34,
    borderWidth:
      StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typeScale.secondary,
    flexShrink: 1,
    fontWeight: '800',
    textAlign: 'center',
    writingDirection: 'auto',
  },
  actionDisc: {
    position: 'absolute',
    end: spacing.sm,
    width: 32,
    height: 32,
    borderWidth:
      StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLine: {
    width: 10,
    height: 2,
    borderRadius: radius.pill,
  },
});
