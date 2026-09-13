import React, {
  PropsWithChildren,
} from 'react';
import {
  Platform,
  StyleProp,
  View,
  ViewStyle,
} from 'react-native';
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from 'expo-glass-effect';

import {
  useAccessibility,
} from '../../core/accessibility/AccessibilityProvider';
import {
  useTheme,
} from '../theme/ThemeProvider';

type Props = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
}>;

export function AdaptiveGlassSurface({
  children,
  style,
}: Props) {
  const {
    reducedTransparency,
  } = useAccessibility();
  const { colors, mode } = useTheme();

  const canUseLiquidGlass =
    Platform.OS === 'ios'
    && !reducedTransparency
    && isGlassEffectAPIAvailable()
    && isLiquidGlassAvailable();

  if (canUseLiquidGlass) {
    return (
      <GlassView
        colorScheme={mode}
        glassEffectStyle="regular"
        tintColor={colors.surface}
        style={style}
      >
        {children}
      </GlassView>
    );
  }

  return (
    <View
      style={[
        {
          backgroundColor:
            colors.surface,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
