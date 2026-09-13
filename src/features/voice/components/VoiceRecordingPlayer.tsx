import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  useAudioPlayer,
  useAudioPlayerStatus,
} from 'expo-audio';

import { useLocale } from '../../../core/localization/LocaleProvider';
import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { radius } from '../../../design-system/tokens/radius';
import { spacing } from '../../../design-system/tokens/spacing';
import { typography } from '../../../design-system/tokens/typography';
import { formatVoiceDurationSeconds } from '../formatters/formatVoiceDuration';

type Props = {
  uri: string;
};

export function VoiceRecordingPlayer({
  uri,
}: Props) {
  const { colors } = useTheme();
  const { t } = useLocale();

  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);

  const toggle = async () => {
    if (status.playing) {
      player.pause();
      return;
    }

    if (
      status.duration > 0 &&
      status.currentTime >= status.duration
    ) {
      await player.seekTo(0);
    }

    player.play();
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceElevated,
          borderColor: colors.border,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          status.playing
            ? t('voicePauseRecording')
            : t('voicePlayRecording')
        }
        onPress={() => {
          void toggle();
        }}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: colors.accent,
            opacity: pressed ? 0.86 : 1,
            transform: [{ scale: pressed ? 0.97 : 1 }],
          },
        ]}
      >
        <Text
          importantForAccessibility="no"
          style={{
            color: colors.accentText,
            fontWeight: '700',
            fontSize: 17,
          }}
        >
          {status.playing ? 'Ⅱ' : '▶'}
        </Text>
      </Pressable>

      <View style={styles.info}>
        <Text
          style={[
            styles.title,
            { color: colors.textPrimary },
          ]}
        >
          {t('voiceRecording')}
        </Text>

        <Text
          style={[
            styles.time,
            { color: colors.textSecondary },
          ]}
        >
          {formatVoiceDurationSeconds(status.currentTime)}
          {' / '}
          {formatVoiceDurationSeconds(status.duration)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 72,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
  },
  button: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    marginLeft: spacing.md,
  },
  title: {
    fontSize: typography.secondary,
    fontWeight: '600',
  },
  time: {
    marginTop: spacing.xs,
    fontSize: typography.caption,
    fontVariant: ['tabular-nums'],
  },
});
