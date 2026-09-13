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

import { MicrophonePermissionService } from '../services/MicrophonePermissionService';
import { VoiceAudioSessionService } from '../services/VoiceAudioSessionService';
import type {
  MicrophonePermissionState,
  VoiceRecorderErrorCode,
  VoiceRecorderPhase,
  VoiceRecordingDraft,
} from '../types';

const recordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  directory: 'document' as const,
};

export function useVoiceRecorderController() {
  const recorder = useAudioRecorder(recordingOptions);
  const recorderState = useAudioRecorderState(recorder, 200);

  const permissionService = useMemo(
    () => new MicrophonePermissionService(),
    [],
  );

  const audioSession = useMemo(
    () => new VoiceAudioSessionService(),
    [],
  );

  const [phase, setPhase] = useState<VoiceRecorderPhase>('idle');
  const [permission, setPermission] =
    useState<MicrophonePermissionState>('unknown');
  const [draft, setDraft] =
    useState<VoiceRecordingDraft | null>(null);
  const [errorCode, setErrorCode] =
    useState<VoiceRecorderErrorCode | null>(null);

  const ensurePermission = useCallback(async () => {
    let status = await permissionService.getStatus();

    if (status !== 'granted') {
      status = await permissionService.request();
    }

    setPermission(status);
    return status === 'granted';
  }, [permissionService]);

  const start = useCallback(async () => {
    if (phase === 'recording' || phase === 'preparing') {
      return;
    }

    setErrorCode(null);
    setDraft(null);
    setPhase('preparing');

    try {
      const allowed = await ensurePermission();

      if (!allowed) {
        setPhase('idle');
        setErrorCode('microphone-permission-denied');
        return;
      }

      await audioSession.prepareRecording();
      await recorder.prepareToRecordAsync();
      recorder.record();
      setPhase('recording');
    } catch {
      setPhase('error');
      setErrorCode('recording-start-failed');
    }
  }, [
    audioSession,
    ensurePermission,
    phase,
    recorder,
  ]);

  const pause = useCallback(() => {
    if (phase !== 'recording') {
      return;
    }

    recorder.pause();
    setPhase('paused');
  }, [phase, recorder]);

  const resume = useCallback(() => {
    if (phase !== 'paused') {
      return;
    }

    recorder.record();
    setPhase('recording');
  }, [phase, recorder]);

  const stop = useCallback(async () => {
    if (phase !== 'recording' && phase !== 'paused') {
      return;
    }

    try {
      await recorder.stop();

      const uri = recorder.uri;

      if (!uri) {
        setPhase('error');
        setErrorCode('recording-uri-unavailable');
        return;
      }

      setDraft({
        uri,
        durationMs: recorderState.durationMillis,
        createdAt: Date.now(),
      });

      await audioSession.preparePlayback();
      setPhase('stopped');
    } catch {
      setPhase('error');
      setErrorCode('recording-stop-failed');
    }
  }, [
    audioSession,
    phase,
    recorder,
    recorderState.durationMillis,
  ]);

  const discard = useCallback(() => {
    setDraft(null);
    setErrorCode(null);
    setPhase('idle');
  }, []);

  const dismissError = useCallback(() => {
    setErrorCode(null);

    if (phase === 'error') {
      setPhase(draft ? 'stopped' : 'idle');
    }
  }, [draft, phase]);

  return {
    phase,
    permission,
    draft,
    errorCode,
    durationMs: recorderState.durationMillis,
    isRecording: recorderState.isRecording,
    start,
    pause,
    resume,
    stop,
    discard,
    dismissError,
  };
}
