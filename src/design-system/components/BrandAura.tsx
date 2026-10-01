import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';

import {
  useTheme,
} from '../theme/ThemeProvider';
import {
  radius,
} from '../tokens/radius';

type Props = {
  size?: number;
  compact?: boolean;
};

export function BrandAura({
  size = 112,
  compact = false,
}: Props) {
  const { colors } = useTheme();
  const middleSize =
    Math.round(size * 0.72);
  const coreSize =
    Math.round(size * 0.42);

  return (
    <View
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[
        styles.frame,
        {
          width: size,
          height: size,
          opacity: compact ? 0.72 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.outer,
          {
            width: size,
            height: size,
            borderColor:
              colors.accentSoft,
            backgroundColor:
              colors.accentSoft,
          },
        ]}
      />
      <View
        style={[
          styles.middle,
          {
            width: middleSize,
            height: middleSize,
            borderColor: colors.border,
            backgroundColor:
              colors.surface,
          },
        ]}
      />
      <View
        style={[
          styles.core,
          {
            width: coreSize,
            height: coreSize,
            borderColor:
              colors.accentSoft,
            backgroundColor:
              colors.surfaceElevated,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  outer: {
    position: 'absolute',
    borderWidth:
      StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
  },
  middle: {
    position: 'absolute',
    borderWidth:
      StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
  },
  core: {
    position: 'absolute',
    borderWidth:
      StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
  },
});
