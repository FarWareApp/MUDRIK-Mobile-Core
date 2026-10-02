import React, {
  PropsWithChildren,
  useEffect,
} from 'react';
import {
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import {
  LinearGradient,
} from 'expo-linear-gradient';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

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
  AdaptiveGlassSurface,
} from './AdaptiveGlassSurface';

type Props = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  accentRail?: boolean;
  decorativeAura?: boolean;
  active?: boolean;
  strong?: boolean;
}>;

export function PremiumHeroSurface({
  children,
  style,
  accentRail = true,
  decorativeAura = true,
  active = false,
  strong = false,
}: Props) {
  const {
    colors,
    mode,
  } = useTheme();
  const { reducedMotion } =
    useAccessibility();
  const palette =
    flagshipPalette[mode];
  const energy = useSharedValue(
    active ? 0.55 : 0,
  );

  useEffect(() => {
    cancelAnimation(energy);

    if (!active) {
      energy.value = 0;
      return;
    }

    if (reducedMotion) {
      energy.value = 0.6;
      return;
    }

    energy.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration:
            motion.duration.ambient,
        }),
        withTiming(0.32, {
          duration:
            motion.duration.ambient,
        }),
      ),
      -1,
      false,
    );

    return () => {
      cancelAnimation(energy);
    };
  }, [
    active,
    energy,
    reducedMotion,
  ]);

  const auraAnimatedStyle =
    useAnimatedStyle(() => ({
      opacity: active
        ? 0.52
          + energy.value * 0.32
        : 0.64,
      transform: [
        {
          scale: active
            ? 1
              + energy.value * 0.05
            : 1,
        },
      ],
    }));

  return (
    <View
      style={[
        styles.frame,
        strong
          ? depth.floating
          : depth.elevated,
        {
          shadowColor:
            colors.shadow,
        },
        style,
      ]}
    >
      <LinearGradient
        colors={
          strong
            ? palette.heroStrong
            : palette.hero
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
              strong
                ? palette.glow
                : palette.hairline,
          },
        ]}
      >
        <AdaptiveGlassSurface
          fallbackColor="transparent"
          tintColor="transparent"
          style={styles.glass}
        >
          <View
            importantForAccessibility="no"
            pointerEvents="none"
            style={[
              styles.topHighlight,
              {
                backgroundColor:
                  palette.shine,
              },
            ]}
          />

          {strong ? (
            <>
              <LinearGradient
                importantForAccessibility="no"
                pointerEvents="none"
                colors={[
                  'transparent',
                  palette.metal,
                  'transparent',
                ]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.strongTopRail}
              />

              <View
                importantForAccessibility="no"
                pointerEvents="none"
                style={[
                  styles.strongCornerPlate,
                  {
                    borderColor:
                      palette.hairline,
                  },
                ]}
              />

              <View
                importantForAccessibility="no"
                pointerEvents="none"
                style={[
                  styles.strongLowerRail,
                  {
                    backgroundColor:
                      palette.metal,
                  },
                ]}
              />
            </>
          ) : null}

          {decorativeAura ? (
            <>
              <Animated.View
                importantForAccessibility="no-hide-descendants"
                pointerEvents="none"
                style={[
                  styles.decorativeLayer,
                  auraAnimatedStyle,
                ]}
              >
                <View
                  style={[
                    styles.auraOuter,
                    {
                      borderColor:
                        palette.glow,
                      backgroundColor:
                        palette.glow,
                    },
                  ]}
                />

                <View
                  style={[
                    styles.auraInner,
                    {
                      borderColor:
                        palette.warmGlow,
                      backgroundColor:
                        palette.warmGlow,
                    },
                  ]}
                />
              </Animated.View>

              <View
                importantForAccessibility="no-hide-descendants"
                pointerEvents="none"
                style={[
                  styles.secondaryGlow,
                  {
                    backgroundColor:
                      palette.warmGlow,
                  },
                ]}
              />
            </>
          ) : null}

          {accentRail ? (
            <LinearGradient
              importantForAccessibility="no"
              pointerEvents="none"
              colors={
                palette.primaryAction
              }
              style={styles.accentRail}
            />
          ) : null}

          <View
            style={styles.content}
          >
            {children}
          </View>
        </AdaptiveGlassSurface>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: radius.xxl,
  },
  surface: {
    overflow: 'hidden',
    borderWidth:
      StyleSheet.hairlineWidth,
    borderRadius: radius.xxl,
  },
  glass: {
    overflow: 'hidden',
    borderRadius: radius.xxl,
  },
  content: {
    zIndex: 2,
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    start: 32,
    end: 32,
    height: 1,
    opacity: 0.78,
    borderRadius: radius.pill,
  },
  strongTopRail: {
    position: 'absolute',
    top: 10,
    start: 42,
    width: 124,
    height: 1,
    opacity: 0.48,
  },
  strongCornerPlate: {
    position: 'absolute',
    top: 18,
    end: 18,
    width: 74,
    height: 74,
    borderTopWidth:
      StyleSheet.hairlineWidth,
    borderEndWidth:
      StyleSheet.hairlineWidth,
    borderTopEndRadius:
      radius.xl,
    opacity: 0.58,
  },
  strongLowerRail: {
    position: 'absolute',
    bottom: 14,
    end: 32,
    width: 76,
    height: 1,
    opacity: 0.32,
    borderRadius: radius.pill,
  },
  decorativeLayer: {
    position: 'absolute',
    top: -104,
    end: -82,
    width: 276,
    height: 276,
    alignItems: 'center',
    justifyContent: 'center',
  },
  auraOuter: {
    position: 'absolute',
    width: 276,
    height: 276,
    borderWidth:
      StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
  },
  auraInner: {
    position: 'absolute',
    width: 168,
    height: 168,
    borderWidth:
      StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
  },
  secondaryGlow: {
    position: 'absolute',
    bottom: -88,
    start: -72,
    width: 210,
    height: 210,
    borderRadius: radius.pill,
    opacity: 0.42,
  },
  accentRail: {
    position: 'absolute',
    top: 24,
    start: 0,
    width: 5,
    height: 56,
    borderTopEndRadius:
      radius.pill,
    borderBottomEndRadius:
      radius.pill,
  },
});
