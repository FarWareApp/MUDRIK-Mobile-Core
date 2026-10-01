import {
  RecordingPresets,
} from 'expo-audio';

export const MUDRIK_VOICE_SAMPLE_RATE = 48_000;
export const MUDRIK_VOICE_BIT_RATE = 192_000;

export const MUDRIK_VOICE_RECORDING_OPTIONS = {
  ...RecordingPresets.HIGH_QUALITY,
  sampleRate: MUDRIK_VOICE_SAMPLE_RATE,
  bitRate: MUDRIK_VOICE_BIT_RATE,
  directory: 'document' as const,
  android: {
    ...RecordingPresets.HIGH_QUALITY.android,
    sampleRate: MUDRIK_VOICE_SAMPLE_RATE,
  },
  ios: {
    ...RecordingPresets.HIGH_QUALITY.ios,
    sampleRate: MUDRIK_VOICE_SAMPLE_RATE,
  },
  web: {
    ...RecordingPresets.HIGH_QUALITY.web,
    bitsPerSecond: MUDRIK_VOICE_BIT_RATE,
  },
} as const;
