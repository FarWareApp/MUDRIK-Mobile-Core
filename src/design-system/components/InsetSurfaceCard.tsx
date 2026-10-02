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
  LinearGradient,
} from 'expo-linear-gradient';

import {
  AdaptiveGlassSurface,
} from './AdaptiveGlassSurface';
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
  radius,
} from '../tokens/radius';

type Props = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
}>;

export function InsetSurfaceCard({
  children,
  style,
  elevated = true,
}: Props) {
  const {
    colors,
    mode,
  } = useTheme();
  const palette =
    flagshipPalette[mode];

  return (
    <LinearGradient
      colors={palette.card}
      start={{
        x: 0.04,
        y: 0,
      }}
      end={{
        x: 0.96,
        y: 1,
      }}
      style={[
        styles.card,
        elevated
          ? depth.subtle
          : null,
        {
          borderColor:
            palette.hairline,
          shadowColor:
            colors.shadow,
        },
        style,
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
            styles.highlight,
            {
              backgroundColor:
                palette.shine,
            },
          ]}
        />

        {children}
      </AdaptiveGlassSurface>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderWidth:
      StyleSheet.hairlineWidth,
    borderRadius: radius.xl,
  },
  glass: {
    borderRadius: radius.xl,
  },
  highlight: {
    position: 'absolute',
    top: 0,
    start: 24,
    end: 24,
    height: 1,
    opacity: 0.62,
    borderRadius: radius.pill,
  },
});
