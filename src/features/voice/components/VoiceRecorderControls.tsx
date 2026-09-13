import React, { PropsWithChildren } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { VoiceRecorderPhase } from '../types';
import { useLocale } from '../../../core/localization/LocaleProvider';
import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { radius } from '../../../design-system/tokens/radius';
import { spacing } from '../../../design-system/tokens/spacing';

type Props = {
  phase: VoiceRecorderPhase;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
};

export function VoiceRecorderControls({
  phase,
  onStart,
  onPause,
  onResume,
  onStop,
}: Props) {
  const { t } = useLocale();

  if (phase === 'idle' || phase === 'stopped' || phase === 'error') {
    return (
      <VoiceControl
        label={t('voiceRecord')}
        primary
        onPress={onStart}
      />
    );
  }

  if (phase === 'preparing') {
    return (
      <VoiceControl
        label={t('voicePreparing')}
        disabled
        primary
        onPress={() => undefined}
      />
    );
  }

  if (phase === 'paused') {
    return (
      <View style={styles.row}>
        <VoiceControl
          label={t('voiceResume')}
          primary
          onPress={onResume}
        />
        <VoiceControl
          label={t('voiceStop')}
          onPress={onStop}
        />
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <VoiceControl
        label={t('voicePause')}
        onPress={onPause}
      />
      <VoiceControl
        label={t('voiceStop')}
        primary
        onPress={onStop}
      />
    </View>
  );
}

type ControlProps = PropsWithChildren<{
  label: string;
  primary?: boolean;
  disabled?: boolean;
  onPress: () => void;
}>;

function VoiceControl({
  label,
  primary = false,
  disabled = false,
  onPress,
}: ControlProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.control,
        {
          backgroundColor: primary
            ? colors.accent
            : pressed
              ? colors.surfacePressed
              : colors.surfaceElevated,
          borderColor: primary
            ? colors.accent
            : colors.border,
          opacity: disabled
            ? 0.5
            : pressed
              ? 0.86
              : 1,
          transform: [
            { scale: pressed && !disabled ? 0.98 : 1 },
          ],
        },
      ]}
    >
      <Text
        style={{
          color: primary
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

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  control: {
    minWidth: 104,
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
});
