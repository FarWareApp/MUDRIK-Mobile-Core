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
          x: 0.06,
          y: 0,
        }}
        end={{
          x: 0.94,
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
          y: 0.18,
        }}
        end={{
          x: 0.78,
          y: 0.86,
        }}
        style={[
          styles.lightField,
          styles.emeraldField,
          {
            opacity:
              quiet ? 0.44 : 0.74,
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
          x: 0.36,
          y: 1,
        }}
        style={[
          styles.lightField,
          styles.warmField,
          {
            opacity:
              quiet ? 0.34 : 0.62,
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
              quiet ? 0.28 : 0.46,
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
              quiet ? 0.08 : 0.13,
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
              quiet ? 0.18 : 0.32,
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
              quiet ? 0.08 : 0.14,
          },
        ]}
      />

      <LinearGradient
        colors={[
          'transparent',
          mode === 'dark'
            ? 'rgba(0,0,0,0.24)'
            : 'rgba(46,43,36,0.05)',
        ]}
        style={[
          styles.lowerVignette,
          {
            opacity:
              quiet ? 0.72 : 1,
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
    top: -80,
    start: -96,
    width: 420,
    height: 580,
    transform: [
      {
        rotate: '-12deg',
      },
    ],
  },
  warmField: {
    top: 40,
    end: -148,
    width: 370,
    height: 520,
    transform: [
      {
        rotate: '10deg',
      },
    ],
  },
  architecturalBeam: {
    position: 'absolute',
    top: 84,
    end: 42,
    width: 128,
    height: 300,
    borderStartWidth:
      StyleSheet.hairlineWidth,
    borderTopWidth:
      StyleSheet.hairlineWidth,
  },
  verticalRail: {
    position: 'absolute',
    top: 112,
    bottom: 184,
    end: 38,
    width: 1,
  },
  horizon: {
    position: 'absolute',
    top: 196,
    start: '8%',
    end: '8%',
    height: 1,
    borderTopWidth:
      StyleSheet.hairlineWidth,
  },
  horizonSecondary: {
    top: 201,
    start: '14%',
    end: '14%',
  },
  lowerVignette: {
    position: 'absolute',
    start: 0,
    end: 0,
    bottom: 0,
    height: 260,
  },
});
