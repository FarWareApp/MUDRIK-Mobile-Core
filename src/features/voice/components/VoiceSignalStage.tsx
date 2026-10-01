import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';

import {
  useTheme,
} from '../../../design-system/theme/ThemeProvider';
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
  [18, 30, 44, 56, 44, 30, 18] as const;

export function VoiceSignalStage({
  phase,
}: Props) {
  const { colors } = useTheme();

  const active =
    phase === 'recording';
  const paused =
    phase === 'paused';
  const error =
    phase === 'error';

  const signalColor = error
    ? colors.error
    : active
      ? colors.error
      : colors.accent;

  return (
    <View
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.stage,
        {
          backgroundColor:
            colors.surfaceInput,
          borderColor: colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.outerRing,
          {
            borderColor: active
              ? colors.error
              : colors.accentSoft,
          },
        ]}
      />

      <View
        style={[
          styles.innerRing,
          {
            borderColor: paused
              ? colors.warning
              : colors.border,
            backgroundColor:
              colors.surface,
          },
        ]}
      >
        <View
          style={[
            styles.signal,
            {
              opacity: active
                ? 0.82
                : paused
                  ? 0.42
                  : 0.28,
            },
          ]}
        >
          {BAR_HEIGHTS.map(
            (height, index) => (
              <View
                key={`voice-signal-${index}`}
                style={[
                  styles.bar,
                  {
                    height:
                      active
                        ? height
                        : Math.max(
                            8,
                            Math.round(
                              height * 0.55,
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

        <View
          style={[
            styles.center,
            {
              backgroundColor:
                active
                  ? colors.error
                  : colors.accent,
              shadowColor:
                colors.shadow,
            },
          ]}
        >
          <VoiceRecorderIndicator
            color={colors.accentText}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    width: 216,
    height: 216,
    borderWidth:
      StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  outerRing: {
    position: 'absolute',
    width: 178,
    height: 178,
    borderWidth: 2,
    borderRadius: radius.pill,
  },
  innerRing: {
    width: 150,
    height: 150,
    borderWidth:
      StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signal: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  bar: {
    width: 4,
    borderRadius: radius.pill,
  },
  center: {
    width: 70,
    height: 70,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 5,
  },
});
