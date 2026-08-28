import {
  useCallback,
  useMemo,
  useState,
} from 'react';

import {
  RecordingPresets,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';

import {
  MicrophonePermissionService,
} from '../services/MicrophonePermissionService';
import {
  VoiceAudioSessionService,
} from '../services/VoiceAudioSessionService';
import {
  MicrophonePermissionState,
  VoiceRecorderPhase,
  VoiceRecordingDraft,
} from '../types';

const recordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  directory: 'document' as const,
};

export function useVoiceRecorderController() {
  const recorder =
    useAudioRecorder(
      recordingOptions,
    );

  const recorderState =
    useAudioRecorderState(
      recorder,
      200,
    );

  const permissionService =
    useMemo(
      () =>
        new MicrophonePermissionService(),
      [],
    );

  const audioSession =
    useMemo(
      () =>
        new VoiceAudioSessionService(),
      [],
    );

  const [phase, setPhase] =
    useState<VoiceRecorderPhase>(
      'idle',
    );

  const [permission, setPermission] =
    useState<MicrophonePermissionState>(
      'unknown',
    );

  const [draft, setDraft] =
    useState<VoiceRecordingDraft | null>(
      null,
    );

  const [error, setError] =
    useState<string | null>(
      null,
    );

  const ensurePermission =
    useCallback(async () => {
      let status =
        await permissionService.getStatus();

      if (status !== 'granted') {
        status =
          await permissionService.request();
      }

      setPermission(status);

      return status === 'granted';
    }, [permissionService]);

  const start =
    useCallback(async () => {
      if (
        phase === 'recording' ||
        phase === 'preparing'
      ) {
        return;
      }

      setError(null);
      setDraft(null);
      setPhase('preparing');

      try {
        const allowed =
          await ensurePermission();

        if (!allowed) {
          setPhase('idle');
          setError(
            'Microphone permission denied.',
          );
          return;
        }

        await audioSession
          .prepareRecording();

        await recorder
          .prepareToRecordAsync();

        recorder.record();

        setPhase('recording');
      } catch (caught) {
        setPhase('error');

        setError(
          caught instanceof Error
            ? caught.message
            : 'Unable to start recording.',
        );
      }
    }, [
      audioSession,
      ensurePermission,
      phase,
      recorder,
    ]);

  const pause =
    useCallback(() => {
      if (phase !== 'recording') {
        return;
      }

      recorder.pause();
      setPhase('paused');
    }, [
      phase,
      recorder,
    ]);

  const resume =
    useCallback(() => {
      if (phase !== 'paused') {
        return;
      }

      recorder.record();
      setPhase('recording');
    }, [
      phase,
      recorder,
    ]);

  const stop =
    useCallback(async () => {
      if (
        phase !== 'recording' &&
        phase !== 'paused'
      ) {
        return;
      }

      try {
        await recorder.stop();

        const uri =
          recorder.uri;

        if (!uri) {
          throw new Error(
            'Recording URI is unavailable.',
          );
        }

        setDraft({
          uri,
          durationMs:
            recorderState.durationMillis,
          createdAt: Date.now(),
        });

        await audioSession
          .preparePlayback();

        setPhase('stopped');
      } catch (caught) {
        setPhase('error');

        setError(
          caught instanceof Error
            ? caught.message
            : 'Unable to stop recording.',
        );
      }
    }, [
      audioSession,
      phase,
      recorder,
      recorderState.durationMillis,
    ]);

  const discard =
    useCallback(() => {
      setDraft(null);
      setError(null);
      setPhase('idle');
    }, []);

  return {
    phase,
    permission,
    draft,
    error,

    durationMs:
      recorderState.durationMillis,

    isRecording:
      recorderState.isRecording,

    start,
    pause,
    resume,
    stop,
    discard,

    dismissError: () =>
      setError(null),
  };
}
