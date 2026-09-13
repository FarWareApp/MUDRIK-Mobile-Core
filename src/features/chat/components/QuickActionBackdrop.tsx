import React from 'react';
import {
  Pressable,
  StyleSheet,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';

import {
  useAccessibility,
} from '../../../core/accessibility/AccessibilityProvider';
import {
  useLocale,
} from '../../../core/localization/LocaleProvider';
import {
  useTheme,
} from '../../../design-system/theme/ThemeProvider';

type Props = {
  visible: boolean;
  onPress: () => void;
};

export function QuickActionBackdrop({
  visible,
  onPress,
}: Props) {
  const { reducedMotion } =
    useAccessibility();
  const { t } = useLocale();
  const { colors } = useTheme();

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      entering={
        reducedMotion
          ? undefined
          : FadeIn.duration(140)
      }
      exiting={
        reducedMotion
          ? undefined
          : FadeOut.duration(120)
      }
      pointerEvents="box-none"
      style={styles.container}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          t('closeQuickActions')
        }
        onPress={onPress}
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor:
              colors.overlay,
          },
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 20,
  },
});
