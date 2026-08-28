import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  router,
} from 'expo-router';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  useTheme,
} from '../../design-system/theme/ThemeProvider';

import {
  VoiceRecordingPlayer,
} from './components/VoiceRecordingPlayer';

import {
  useVoiceRecorderController,
} from './hooks/useVoiceRecorderController';

export function VoiceScreen() {
  const { colors } = useTheme();

  const recorder =
    useVoiceRecorderController();

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor:
            colors.background,
        },
      ]}
    >
      <View style={styles.header}>
        <Pressable
          onPress={() =>
            router.back()
          }
          style={[
            styles.back,
            {
              backgroundColor:
                colors.surfaceElevated,
            },
          ]}
        >
          <Text
            style={{
              color:
                colors.textPrimary,
              fontSize: 24,
            }}
          >
            ‹
          </Text>
        </Pressable>

        <Text
          style={[
            styles.headerTitle,
            {
              color:
                colors.textPrimary,
            },
          ]}
        >
          Voice
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.body}>
        <Text
          style={[
            styles.title,
            {
              color:
                colors.textPrimary,
            },
          ]}
        >
          Voice conversation
        </Text>

        <Text
          style={[
            styles.duration,
            {
              color:
                colors.textSecondary,
            },
          ]}
        >
          {formatDuration(
            recorder.durationMs,
          )}
        </Text>

        <View
          style={[
            styles.mic,
            {
              backgroundColor:
                recorder.phase ===
                'recording'
                  ? colors.error
                  : colors.accent,
            },
          ]}
        >
          <Text
            style={styles.micText}
          >
            ●
          </Text>
        </View>

        <Text
          style={[
            styles.phase,
            {
              color:
                colors.textSecondary,
            },
          ]}
        >
          {recorder.phase}
        </Text>

        <View style={styles.controls}>
          {recorder.phase ===
            'idle' && (
            <Control
              label="Record"
              onPress={() => {
                void recorder.start();
              }}
            />
          )}

          {recorder.phase ===
            'recording' && (
            <>
              <Control
                label="Pause"
                onPress={
                  recorder.pause
                }
              />

              <Control
                label="Stop"
                onPress={() => {
                  void recorder.stop();
                }}
              />
            </>
          )}

          {recorder.phase ===
            'paused' && (
            <>
              <Control
                label="Resume"
                onPress={
                  recorder.resume
                }
              />

              <Control
                label="Stop"
                onPress={() => {
                  void recorder.stop();
                }}
              />
            </>
          )}
        </View>

        {recorder.draft && (
          <View style={styles.draft}>
            <VoiceRecordingPlayer
              uri={
                recorder.draft.uri
              }
            />

            <Pressable
              onPress={
                recorder.discard
              }
              style={[
                styles.discard,
                {
                  borderColor:
                    colors.border,
                },
              ]}
            >
              <Text
                style={{
                  color:
                    colors.textPrimary,
                }}
              >
                Discard
              </Text>
            </Pressable>
          </View>
        )}

        {recorder.error && (
          <Text
            style={[
              styles.error,
              {
                color:
                  colors.error,
              },
            ]}
          >
            {recorder.error}
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

type ControlProps = {
  label: string;
  onPress: () => void;
};

function Control({
  label,
  onPress,
}: ControlProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.control,
        {
          backgroundColor:
            colors.surfaceElevated,
        },
      ]}
    >
      <Text
        style={{
          color:
            colors.textPrimary,
          fontWeight: '600',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function formatDuration(
  milliseconds: number,
): string {
  const totalSeconds =
    Math.floor(
      milliseconds / 1000,
    );

  const minutes =
    Math.floor(
      totalSeconds / 60,
    );

  const seconds =
    totalSeconds % 60;

  return `${minutes}:${seconds
    .toString()
    .padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  header: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },

  back: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
  },

  headerSpacer: {
    width: 42,
  },

  body: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 44,
  },

  title: {
    fontSize: 24,
    fontWeight: '700',
  },

  duration: {
    marginTop: 14,
    fontSize: 30,
    fontVariant: [
      'tabular-nums',
    ],
  },

  mic: {
    marginTop: 30,
    width: 116,
    height: 116,
    borderRadius: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },

  micText: {
    color: '#FFFFFF',
    fontSize: 38,
  },

  phase: {
    marginTop: 14,
    fontSize: 14,
  },

  controls: {
    marginTop: 28,
    flexDirection: 'row',
    gap: 12,
  },

  control: {
    minWidth: 96,
    minHeight: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },

  draft: {
    width: '100%',
    marginTop: 32,
  },

  discard: {
    alignSelf: 'center',
    marginTop: 12,
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 21,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },

  error: {
    marginTop: 22,
    textAlign: 'center',
  },
});
