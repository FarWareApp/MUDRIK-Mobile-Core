import React from 'react';

import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type {
  CompanionSessionPhase,
} from '../../../contracts/Companion';

import {
  useTheme,
} from '../../../design-system/theme/ThemeProvider';

type Props = {
  phase:
    CompanionSessionPhase;

  enabled?: boolean;

  onStart: () => void;
  onStop: () => void;

  onPause: () => void;
  onResume: () => void;

  onInterrupt: () => void;
  onRecover: () => void;
};

export function CompanionSessionControls({
  phase,
  enabled = true,
  onStart,
  onStop,
  onPause,
  onResume,
  onInterrupt,
  onRecover,
}: Props) {
  if (phase === 'idle') {
    return (
      <Control
        label="Start session"
        primary
        disabled={!enabled}
        onPress={onStart}
      />
    );
  }

  if (phase === 'paused') {
    return (
      <View style={styles.row}>
        <Control
          label="Resume"
          primary
          disabled={!enabled}
          onPress={onResume}
        />

        <Control
          label="End"
          onPress={onStop}
        />
      </View>
    );
  }

  if (
    phase === 'interrupted'
  ) {
    return (
      <View style={styles.row}>
        <Control
          label="Continue"
          primary
          disabled={!enabled}
          onPress={onRecover}
        />

        <Control
          label="End"
          onPress={onStop}
        />
      </View>
    );
  }

  if (phase === 'error') {
    return (
      <Control
        label="End session"
        onPress={onStop}
      />
    );
  }

  return (
    <View style={styles.row}>
      <Control
        label="Pause"
        disabled={!enabled}
        onPress={onPause}
      />

      <Control
        label="Interrupt"
        disabled={!enabled}
        onPress={onInterrupt}
      />

      <Control
        label="End"
        onPress={onStop}
      />
    </View>
  );
}

type ControlProps = {
  label: string;
  primary?: boolean;
  disabled?: boolean;
  onPress: () => void;
};

function Control({
  label,
  primary = false,
  disabled = false,
  onPress,
}: ControlProps) {
  const { colors } =
    useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{
        disabled,
      }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.control,
        {
          backgroundColor:
            primary
              ? colors.accent
              : colors.surfaceElevated,
          opacity:
            disabled
              ? 0.45
              : 1,
        },
      ]}
    >
      <Text
        style={{
          color:
            primary
              ? colors.accentText
              : colors.textPrimary,
          fontWeight: '700',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles =
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent:
        'center',
      gap: 9,
    },

    control: {
      minHeight: 46,
      borderRadius: 23,
      justifyContent:
        'center',
      paddingHorizontal: 18,
    },
  });
