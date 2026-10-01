import React, {
  PropsWithChildren,
} from 'react';
import {
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';

import {
  AdaptiveGlassSurface,
} from './AdaptiveGlassSurface';
import {
  useTheme,
} from '../theme/ThemeProvider';
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
  const { colors } = useTheme();

  return (
    <AdaptiveGlassSurface
      fallbackColor={colors.surface}
      tintColor={colors.surface}
      style={[
        styles.card,
        elevated && styles.elevated,
        {
          borderColor: colors.border,
          shadowColor: colors.shadow,
        },
        style,
      ]}
    >
      {children}
    </AdaptiveGlassSurface>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderWidth:
      StyleSheet.hairlineWidth,
    borderRadius: radius.xl,
  },
  elevated: {
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 7,
    },
    elevation: 3,
  },
});
