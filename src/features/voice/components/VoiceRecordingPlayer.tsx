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

import {
  useTheme,
} from '../../../design-system/theme/ThemeProvider';

type Props = {
  uri: string;
};

export function VoiceRecordingPlayer({
  uri,
}: Props) {
  const { colors } = useTheme();

  const player =
    useAudioPlayer(uri);

  const status =
    useAudioPlayerStatus(player);

  const toggle = () => {
    if (status.playing) {
      player.pause();
      return;
    }

    if (
      status.duration > 0 &&
      status.currentTime >=
        status.duration
    ) {
      player.seekTo(0);
    }

    player.play();
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor:
            colors.surfaceElevated,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          status.playing
            ? 'Pause recording'
            : 'Play recording'
        }
        onPress={toggle}
        style={[
          styles.button,
          {
            backgroundColor:
              colors.accent,
          },
        ]}
      >
        <Text
          style={{
            color: colors.accentText,
            fontWeight: '700',
          }}
        >
          {status.playing
            ? 'Ⅱ'
            : '▶'}
        </Text>
      </Pressable>

      <View style={styles.info}>
        <Text
          style={{
            color: colors.textPrimary,
            fontWeight: '600',
          }}
        >
          Voice recording
        </Text>

        <Text
          style={{
            color:
              colors.textSecondary,
            marginTop: 3,
          }}
        >
          {formatTime(
            status.currentTime,
          )}
          {' / '}
          {formatTime(
            status.duration,
          )}
        </Text>
      </View>
    </View>
  );
}

function formatTime(
  seconds: number,
): string {
  const safe =
    Number.isFinite(seconds)
      ? Math.max(0, seconds)
      : 0;

  const minutes =
    Math.floor(safe / 60);

  const remaining =
    Math.floor(safe % 60);

  return `${minutes}:${remaining
    .toString()
    .padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: {
    minHeight: 72,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },

  button: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },

  info: {
    flex: 1,
    marginLeft: 12,
  },
});
