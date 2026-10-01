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
}>;

export function PremiumHeroSurface({
  children,
  style,
  accentRail = true,
  decorativeAura = true,
  active = false,
}: Props) {
  const { colors } = useTheme();
  const { reducedMotion } =
    useAccessibility();
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
        ? 0.62
          + energy.value * 0.24
        : 0.78,
      transform: [
        {
          scale: active
            ? 1
              + energy.value * 0.035
            : 1,
        },
      ],
    }));

  return (
    <AdaptiveGlassSurface
      fallbackColor={colors.surface}
      tintColor={colors.surface}
      style={[
        styles.surface,
        depth.elevated,
        {
          borderColor: colors.border,
          shadowColor: colors.shadow,
        },
        style,
      ]}
    >
      {decorativeAura ? (
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
                  colors.accentSoft,
                backgroundColor:
                  colors.accentSoft,
              },
            ]}
          />
          <View
            style={[
              styles.auraInner,
              {
                borderColor:
                  colors.border,
              },
            ]}
          />
        </Animated.View>
      ) : null}

      {accentRail ? (
        <View
          importantForAccessibility="no"
          pointerEvents="none"
          style={[
            styles.accentRail,
            {
              backgroundColor:
                colors.accent,
            },
          ]}
        />
      ) : null}

      {children}
    </AdaptiveGlassSurface>
  );
}

const styles = StyleSheet.create({
  surface: {
    overflow: 'hidden',
    borderWidth:
      StyleSheet.hairlineWidth,
    borderRadius: radius.xl,
  },
  decorativeLayer: {
    position: 'absolute',
    top: -68,
    end: -54,
    width: 196,
    height: 196,
    alignItems: 'center',
    justifyContent: 'center',
  },
  auraOuter: {
    position: 'absolute',
    width: 196,
    height: 196,
    borderWidth:
      StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
  },
  auraInner: {
    position: 'absolute',
    width: 126,
    height: 126,
    borderWidth:
      StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
  },
  accentRail: {
    position: 'absolute',
    top: 22,
    start: 0,
    width: 4,
    height: 44,
    borderTopEndRadius: radius.pill,
    borderBottomEndRadius: radius.pill,
  },
});
