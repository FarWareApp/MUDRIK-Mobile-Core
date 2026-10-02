import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';
import {
  LinearGradient,
} from 'expo-linear-gradient';

import {
  useTheme,
} from '../theme/ThemeProvider';
import {
  flagshipPalette,
} from '../tokens/flagship';
import {
  radius,
} from '../tokens/radius';

type Props = {
  quiet?: boolean;
};

export function FlagshipBackdrop({
  quiet = false,
}: Props) {
  const { mode } = useTheme();
  const palette =
    flagshipPalette[mode];

  return (
    <View
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
    >
      <LinearGradient
        colors={palette.canvas}
        start={{
          x: 0.04,
          y: 0,
        }}
        end={{
          x: 0.96,
          y: 1,
        }}
        style={StyleSheet.absoluteFill}
      />

      <LinearGradient
        colors={[
          'transparent',
          palette.canvasGlowPrimary,
          'transparent',
        ]}
        start={{
          x: 0,
          y: 0.08,
        }}
        end={{
          x: 0.78,
          y: 0.92,
        }}
        style={[
          styles.lightField,
          styles.emeraldField,
          {
            opacity:
              quiet ? 0.42 : 0.82,
          },
        ]}
      />

      <LinearGradient
        colors={[
          'transparent',
          palette.canvasGlowSecondary,
          'transparent',
        ]}
        start={{
          x: 0.96,
          y: 0,
        }}
        end={{
          x: 0.32,
          y: 1,
        }}
        style={[
          styles.lightField,
          styles.warmField,
          {
            opacity:
              quiet ? 0.3 : 0.66,
          },
        ]}
      />

      <LinearGradient
        colors={[
          'transparent',
          palette.canvasGlowTertiary,
          'transparent',
        ]}
        start={{
          x: 0.12,
          y: 0,
        }}
        end={{
          x: 0.9,
          y: 1,
        }}
        style={[
          styles.lightField,
          styles.graphiteField,
          {
            opacity:
              quiet ? 0.26 : 0.5,
          },
        ]}
      />

      <View
        style={[
          styles.architecturalFrame,
          {
            borderColor:
              palette.hairline,
            opacity:
              quiet ? 0.2 : 0.38,
          },
        ]}
      />

      <View
        style={[
          styles.architecturalBeam,
          {
            borderColor:
              palette.hairline,
            opacity:
              quiet ? 0.24 : 0.48,
          },
        ]}
      />

      <View
        style={[
          styles.metalRail,
          {
            backgroundColor:
              palette.metal,
            opacity:
              quiet ? 0.06 : 0.15,
          },
        ]}
      />

      <View
        style={[
          styles.verticalRail,
          {
            backgroundColor:
              palette.metal,
            opacity:
              quiet ? 0.07 : 0.14,
          },
        ]}
      />

      <View
        style={[
          styles.horizon,
          {
            borderColor:
              palette.hairline,
            opacity:
              quiet ? 0.16 : 0.34,
          },
        ]}
      />

      <View
        style={[
          styles.horizon,
          styles.horizonSecondary,
          {
            borderColor:
              palette.hairline,
            opacity:
              quiet ? 0.07 : 0.16,
          },
        ]}
      />

      <View
        style={[
          styles.focusWindow,
          {
            borderColor:
              palette.hairline,
            opacity:
              quiet ? 0.09 : 0.18,
          },
        ]}
      />

      <LinearGradient
        colors={[
          mode === 'dark'
            ? 'rgba(0,0,0,0.34)'
            : 'rgba(255,255,255,0.14)',
          'transparent',
        ]}
        style={[
          styles.topVignette,
          {
            opacity:
              quiet ? 0.66 : 1,
          },
        ]}
      />

      <LinearGradient
        colors={[
          'transparent',
          mode === 'dark'
            ? 'rgba(0,0,0,0.38)'
            : 'rgba(46,43,36,0.07)',
        ]}
        style={[
          styles.lowerVignette,
          {
            opacity:
              quiet ? 0.7 : 1,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  lightField: {
    position: 'absolute',
  },
  emeraldField: {
    top: -118,
    start: -128,
    width: 468,
    height: 650,
    transform: [
      {
        rotate: '-13deg',
      },
    ],
  },
  warmField: {
    top: 22,
    end: -176,
    width: 410,
    height: 580,
    transform: [
      {
        rotate: '11deg',
      },
    ],
  },
  graphiteField: {
    bottom: -120,
    start: -54,
    width: 420,
    height: 520,
    transform: [
      {
        rotate: '-9deg',
      },
    ],
  },
  architecturalFrame: {
    position: 'absolute',
    top: 92,
    start: 22,
    end: 22,
    height: 226,
    borderWidth:
      StyleSheet.hairlineWidth,
    borderRadius: radius.xxl,
  },
  architecturalBeam: {
    position: 'absolute',
    top: 72,
    end: 36,
    width: 154,
    height: 338,
    borderStartWidth:
      StyleSheet.hairlineWidth,
    borderTopWidth:
      StyleSheet.hairlineWidth,
    transform: [
      {
        rotate: '2deg',
      },
    ],
  },
  metalRail: {
    position: 'absolute',
    top: 110,
    start: 34,
    width: 84,
    height: 1,
  },
  verticalRail: {
    position: 'absolute',
    top: 128,
    bottom: 176,
    end: 34,
    width: 1,
  },
  horizon: {
    position: 'absolute',
    top: 214,
    start: '7%',
    end: '7%',
    height: 1,
    borderTopWidth:
      StyleSheet.hairlineWidth,
  },
  horizonSecondary: {
    top: 219,
    start: '14%',
    end: '14%',
  },
  focusWindow: {
    position: 'absolute',
    bottom: 86,
    start: -94,
    width: 286,
    height: 286,
    borderWidth:
      StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
  },
  topVignette: {
    position: 'absolute',
    top: 0,
    start: 0,
    end: 0,
    height: 168,
  },
  lowerVignette: {
    position: 'absolute',
    start: 0,
    end: 0,
    bottom: 0,
    height: 310,
  },
});
