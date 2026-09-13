import React, {
  useEffect,
} from 'react';
import {
  StyleSheet,
} from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import {
  useAccessibility,
} from '../../../core/accessibility/AccessibilityProvider';
import {
  useTheme,
} from '../../../design-system/theme/ThemeProvider';
import {
  motion,
} from '../../../design-system/tokens/motion';
import {
  radius,
} from '../../../design-system/tokens/radius';

type Props = {
  index: number;
};

export function SendingIndicatorDot({
  index,
}: Props) {
  const { reducedMotion } =
    useAccessibility();
  const { colors } = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      progress.value = 0.65;
      return;
    }

    progress.value = withDelay(
      index * motion.stagger.compact,
      withRepeat(
        withSequence(
          withTiming(1, {
            duration: motion.duration.fast,
          }),
          withTiming(0.28, {
            duration: motion.duration.fast,
          }),
        ),
        -1,
        false,
      ),
    );

    return () => {
      cancelAnimation(progress);
    };
  }, [
    index,
    progress,
    reducedMotion,
  ]);

  const animatedStyle =
    useAnimatedStyle(() => ({
      opacity: progress.value,
      transform: [
        {
          translateY:
            reducedMotion
              ? 0
              : -2 * progress.value,
        },
      ],
    }));

  return (
    <Animated.View
      importantForAccessibility="no"
      style={[
        styles.dot,
        {
          backgroundColor: colors.accent,
        },
        animatedStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  dot: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
  },
});
