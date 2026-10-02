import React, {
  memo,
  type ReactNode,
} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  LinearGradient,
} from 'expo-linear-gradient';

import {
  useAccessibility,
} from '../../../core/accessibility/AccessibilityProvider';
import {
  useTheme,
} from '../../../design-system/theme/ThemeProvider';
import {
  depth,
} from '../../../design-system/tokens/depth';
import {
  flagshipPalette,
} from '../../../design-system/tokens/flagship';
import {
  motion,
} from '../../../design-system/tokens/motion';
import {
  radius,
} from '../../../design-system/tokens/radius';
import {
  spacing,
} from '../../../design-system/tokens/spacing';
import {
  typeScale,
} from '../../../design-system/tokens/typography';

type Props = {
  label: string;
  description: string;
  icon: ReactNode;
  primary?: boolean;
  onPress: () => void;
};

export const HomeCommandTile = memo(
  function HomeCommandTile({
    label,
    description,
    icon,
    primary = false,
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
        accessibilityHint={description}
        onPress={onPress}
        style={({ pressed }) => [
          styles.frame,
          primary && styles.primaryFrame,
          primary
            ? depth.elevated
            : depth.subtle,
          {
            shadowColor:
              colors.shadow,
            opacity:
              pressed ? 0.96 : 1,
            transform: [
              {
                scale:
                  pressed
                  && !reducedMotion
                    ? motion.press
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
              x: 0.04,
              y: 0,
            }}
            end={{
              x: 0.96,
              y: 1,
            }}
            style={[
              styles.tile,
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
                styles.topHighlight,
                {
                  backgroundColor:
                    primary
                      ? 'rgba(255,255,255,0.16)'
                      : palette.shine,
                },
              ]}
            />

            <View
              importantForAccessibility="no"
              pointerEvents="none"
              style={[
                styles.metalAccent,
                {
                  backgroundColor:
                    primary
                      ? palette.primaryActionText
                      : palette.metal,
                  opacity:
                    primary ? 0.34 : 0.28,
                },
              ]}
            />

            {primary ? (
              <View
                importantForAccessibility="no-hide-descendants"
                pointerEvents="none"
                style={styles.primaryDecoration}
              >
                <View
                  style={[
                    styles.primaryPanel,
                    {
                      borderColor:
                        colors.accentText,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.primaryPanel,
                    styles.primaryPanelInner,
                    {
                      borderColor:
                        colors.accentText,
                    },
                  ]}
                />
              </View>
            ) : null}

            <View
              importantForAccessibility="no-hide-descendants"
              style={[
                styles.icon,
                {
                  backgroundColor:
                    primary
                      ? 'rgba(247,244,236,0.94)'
                      : colors.accentSoft,
                  borderColor:
                    primary
                      ? 'rgba(255,255,255,0.22)'
                      : palette.hairline,
                },
              ]}
            >
              {icon}
            </View>

            <Text
              numberOfLines={1}
              style={[
                primary
                  ? styles.primaryLabel
                  : styles.label,
                {
                  color: primary
                    ? palette.primaryActionText
                    : colors.textPrimary,
                },
              ]}
            >
              {label}
            </Text>

            <Text
              numberOfLines={2}
              style={[
                styles.description,
                {
                  color: primary
                    ? palette.primaryActionText
                    : colors.textSecondary,
                  opacity:
                    primary ? 0.86 : 1,
                },
              ]}
            >
              {description}
            </Text>

            <View
              importantForAccessibility="no"
              pointerEvents="none"
              style={[
                styles.actionMark,
                {
                  borderColor:
                    primary
                      ? 'rgba(255,255,255,0.34)'
                      : palette.hairline,
                },
              ]}
            >
              <View
                style={[
                  styles.actionMarkLine,
                  {
                    backgroundColor:
                      primary
                        ? palette.primaryActionText
                        : colors.accent,
                  },
                ]}
              />
            </View>
          </LinearGradient>
        )}
      </Pressable>
    );
  },
);

const styles = StyleSheet.create({
  frame: {
    minHeight: 136,
    flexBasis: '47%',
    flexGrow: 1,
    borderRadius: radius.xl,
  },
  primaryFrame: {
    flexBasis: '100%',
    minHeight: 148,
  },
  tile: {
    flex: 1,
    overflow: 'hidden',
    borderWidth:
      StyleSheet.hairlineWidth,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    start: 22,
    end: 22,
    height: 1,
    borderRadius: radius.pill,
  },
  metalAccent: {
    position: 'absolute',
    top: 20,
    end: 18,
    width: 28,
    height: 2,
    borderRadius: radius.pill,
  },
  primaryDecoration: {
    position: 'absolute',
    top: -34,
    end: -20,
    width: 182,
    height: 170,
    opacity: 0.14,
  },
  primaryPanel: {
    position: 'absolute',
    top: 10,
    end: 8,
    width: 142,
    height: 118,
    borderWidth: 1,
    borderRadius: radius.xxl,
    transform: [
      {
        rotate: '-8deg',
      },
    ],
  },
  primaryPanelInner: {
    top: 30,
    end: 26,
    width: 102,
    height: 82,
  },
  icon: {
    width: 46,
    height: 46,
    borderWidth:
      StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typeScale.secondary,
    marginTop: spacing.md,
    fontWeight: '800',
    writingDirection: 'auto',
  },
  primaryLabel: {
    ...typeScale.heading,
    marginTop: spacing.md,
    fontWeight: '800',
    writingDirection: 'auto',
  },
  description: {
    ...typeScale.caption,
    maxWidth: '88%',
    marginTop: spacing.xs,
    writingDirection: 'auto',
  },
  actionMark: {
    position: 'absolute',
    end: spacing.lg,
    bottom: spacing.lg,
    width: 30,
    height: 30,
    borderWidth:
      StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionMarkLine: {
    width: 10,
    height: 2,
    borderRadius: radius.pill,
  },
});
