import React, {
  PropsWithChildren,
} from 'react';
import {
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

import {
  useTheme,
} from '../theme/ThemeProvider';
import {
  depth,
} from '../tokens/depth';
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
}>;

export function PremiumHeroSurface({
  children,
  style,
  accentRail = true,
  decorativeAura = true,
}: Props) {
  const { colors } = useTheme();

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
        <View
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          style={styles.decorativeLayer}
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
        </View>
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
    opacity: 0.78,
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
