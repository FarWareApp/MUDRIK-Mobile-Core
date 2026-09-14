import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';

import { useLocale } from '../../../core/localization/LocaleProvider';
import { spacing } from '../../../design-system/tokens/spacing';
import type { VoiceRecorderPhase } from '../types';
import { VoiceControlButton } from './VoiceControlButton';

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

  if (
    phase === 'idle' ||
    phase === 'stopped' ||
    phase === 'error'
  ) {
    return (
      <VoiceControlButton
        label={t('voiceRecord')}
        primary
        onPress={onStart}
      />
    );
  }

  if (phase === 'preparing') {
    return (
      <VoiceControlButton
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
        <VoiceControlButton
          label={t('voiceResume')}
          primary
          onPress={onResume}
        />
        <VoiceControlButton
          label={t('voiceStop')}
          onPress={onStop}
        />
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <VoiceControlButton
        label={t('voicePause')}
        onPress={onPause}
      />
      <VoiceControlButton
        label={t('voiceStop')}
        primary
        onPress={onStop}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
});
