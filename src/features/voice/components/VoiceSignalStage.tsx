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
} from '../../../design-system/theme/ThemeProvider';
import {
  flagshipPalette,
} from '../../../design-system/tokens/flagship';
import {
  radius,
} from '../../../design-system/tokens/radius';
import type {
  VoiceRecorderPhase,
} from '../types';
import {
  VoiceRecorderIndicator,
} from './VoiceRecorderIndicator';

type Props = {
  phase: VoiceRecorderPhase;
};

const BAR_HEIGHTS =
  [18, 30, 44, 58, 72, 58, 44, 30, 18] as const;

export function VoiceSignalStage({
  phase,
}: Props) {
  const {
    colors,
    mode,
  } = useTheme();
  const palette =
    flagshipPalette[mode];

  const active =
    phase === 'recording';
  const paused =
    phase === 'paused';
  const error =
    phase === 'error';

  const signalColor = error
    ? colors.error
    : paused
      ? colors.warning
      : colors.accent;

  const centerColors = error
    ? [
        colors.error,
        colors.error,
      ] as const
    : active
      ? palette.primaryAction
      : palette.card;

  return (
    <View
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.frame,
        {
          borderColor:
            palette.hairline,
          shadowColor:
            colors.shadow,
        },
      ]}
    >
      <LinearGradient
        colors={palette.heroStrong}
        start={{
          x: 0.04,
          y: 0,
        }}
        end={{
          x: 0.96,
          y: 1,
        }}
        style={styles.stage}
      >
        <View
          style={[
            styles.topMetal,
            {
              backgroundColor:
                palette.metal,
            },
          ]}
        />

        <View
          style={[
            styles.outerOrbit,
            {
              borderColor:
                active
                  ? palette.glow
                  : palette.hairline,
            },
          ]}
        />

        <View
          style={[
            styles.middleOrbit,
            {
              borderColor: paused
                ? colors.warning
                : palette.hairline,
            },
          ]}
        />

        <View
          style={[
            styles.innerOrbit,
            {
              borderColor:
                active
                  ? colors.accent
                  : colors.border,
            },
          ]}
        />

        <View
          style={[
            styles.orbitNode,
            styles.nodeTop,
            {
              backgroundColor:
                signalColor,
              opacity:
                active ? 0.95 : 0.42,
            },
          ]}
        />

        <View
          style={[
            styles.orbitNode,
            styles.nodeEnd,
            {
              backgroundColor:
                palette.metal,
              opacity:
                active ? 0.72 : 0.28,
            },
          ]}
        />

        <View
          style={[
            styles.orbitNode,
            styles.nodeBottom,
            {
              backgroundColor:
                signalColor,
              opacity:
                active ? 0.58 : 0.24,
            },
          ]}
        />

        <View
          style={[
            styles.signalBed,
            {
              opacity: active
                ? 0.88
                : paused
                  ? 0.48
                  : 0.3,
            },
          ]}
        >
          {BAR_HEIGHTS.map(
            (height, index) => (
              <View
                key={'voice-signal-' + index}
                style={[
                  styles.bar,
                  {
                    height:
                      active
                        ? height
                        : Math.max(
                            9,
                            Math.round(
                              height * 0.48,
                            ),
                          ),
                    backgroundColor:
                      signalColor,
                  },
                ]}
              />
            ),
          )}
        </View>

        <LinearGradient
          colors={centerColors}
          start={{
            x: 0,
            y: 0,
          }}
          end={{
            x: 1,
            y: 1,
          }}
          style={[
            styles.center,
            {
              borderColor:
                active
                  ? palette.glow
                  : palette.hairline,
              shadowColor:
                colors.shadow,
            },
          ]}
        >
          <View
            style={[
              styles.centerHighlight,
              {
                backgroundColor:
                  active
                    ? palette.shine
                    : colors.accentSoft,
              },
            ]}
          />

          <VoiceRecorderIndicator
            color={
              active
                ? palette.primaryActionText
                : colors.accent
            }
          />
        </LinearGradient>

        <View
          style={[
            styles.baseRail,
            {
              backgroundColor:
                palette.metal,
            },
          ]}
        />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: 238,
    height: 238,
    borderWidth:
      StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    shadowOpacity: 0.14,
    shadowRadius: 28,
    shadowOffset: {
      width: 0,
      height: 12,
    },
    elevation: 6,
  },
  stage: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topMetal: {
    position: 'absolute',
    top: 14,
    width: 74,
    height: 1,
    opacity: 0.5,
    borderRadius: radius.pill,
  },
  outerOrbit: {
    position: 'absolute',
    width: 204,
    height: 204,
    borderWidth: 2,
    borderRadius: radius.pill,
    opacity: 0.72,
  },
  middleOrbit: {
    position: 'absolute',
    width: 176,
    height: 176,
    borderWidth:
      StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    opacity: 0.8,
  },
  innerOrbit: {
    position: 'absolute',
    width: 136,
    height: 136,
    borderWidth:
      StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    opacity: 0.72,
  },
  orbitNode: {
    position: 'absolute',
    borderRadius: radius.pill,
  },
  nodeTop: {
    top: 25,
    width: 8,
    height: 8,
  },
  nodeEnd: {
    end: 25,
    width: 6,
    height: 6,
  },
  nodeBottom: {
    bottom: 30,
    start: 66,
    width: 5,
    height: 5,
  },
  signalBed: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bar: {
    width: 3,
    borderRadius: radius.pill,
  },
  center: {
    width: 84,
    height: 84,
    overflow: 'hidden',
    borderWidth:
      StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 7,
    },
    elevation: 7,
  },
  centerHighlight: {
    position: 'absolute',
    top: 0,
    start: 18,
    end: 18,
    height: 1,
    opacity: 0.5,
    borderRadius: radius.pill,
  },
  baseRail: {
    position: 'absolute',
    bottom: 16,
    width: 52,
    height: 1,
    opacity: 0.34,
    borderRadius: radius.pill,
  },
});
