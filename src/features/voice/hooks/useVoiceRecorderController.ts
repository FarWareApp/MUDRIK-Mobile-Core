import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
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

type RecorderOperation =
  | 'start'
  | 'stop';

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

  const mountedRef = useRef(true);
  const phaseRef = useRef<VoiceRecorderPhase>(phase);
  const operationRef = useRef<RecorderOperation | null>(null);

  phaseRef.current = phase;

  const restorePlayback = useCallback(async () => {
    try {
      await audioSession.preparePlayback();
    } catch {
      // Best-effort cleanup must never replace the primary recorder failure.
    }
  }, [audioSession]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      if (operationRef.current === 'stop') {
        return;
      }

      const currentPhase = phaseRef.current;
      const recordingIsActive =
        currentPhase === 'recording' ||
        currentPhase === 'paused';

      if (recordingIsActive) {
        void (async () => {
          try {
            await recorder.stop();
          } catch {
            // Playback restoration still has to run when stop cleanup fails.
          }

          await restorePlayback();
        })();
        return;
      }

      void restorePlayback();
    };
  }, [recorder, restorePlayback]);

  const ensurePermission = useCallback(async () => {
    let status = await permissionService.getStatus();

    if (status !== 'granted') {
      status = await permissionService.request();
    }

    if (mountedRef.current) {
      setPermission(status);
    }

    return status === 'granted';
  }, [permissionService]);

  const start = useCallback(async () => {
    if (
      operationRef.current ||
      phase === 'recording' ||
      phase === 'preparing'
    ) {
      return;
    }

    operationRef.current = 'start';
    let recordingSessionPrepared = false;

    setErrorCode(null);
    setDraft(null);
    setPhase('preparing');

    try {
      const allowed = await ensurePermission();

      if (
        !mountedRef.current ||
        operationRef.current !== 'start'
      ) {
        return;
      }

      if (!allowed) {
        setPhase('idle');
        setErrorCode('microphone-permission-denied');
        return;
      }

      recordingSessionPrepared = true;
      await audioSession.prepareRecording();

      if (
        !mountedRef.current ||
        operationRef.current !== 'start'
      ) {
        await restorePlayback();
        return;
      }

      await recorder.prepareToRecordAsync();

      if (
        !mountedRef.current ||
        operationRef.current !== 'start'
      ) {
        await restorePlayback();
        return;
      }

      recorder.record();
      setPhase('recording');
    } catch {
      if (recordingSessionPrepared) {
        await restorePlayback();
      }

      if (!mountedRef.current) {
        return;
      }

      setPhase('error');
      setErrorCode('recording-start-failed');
    } finally {
      if (operationRef.current === 'start') {
        operationRef.current = null;
      }
    }
  }, [
    audioSession,
    ensurePermission,
    phase,
    recorder,
    restorePlayback,
  ]);

  const pause = useCallback(() => {
    if (
      operationRef.current ||
      phase !== 'recording'
    ) {
      return;
    }

    recorder.pause();
    setPhase('paused');
  }, [phase, recorder]);

  const resume = useCallback(() => {
    if (
      operationRef.current ||
      phase !== 'paused'
    ) {
      return;
    }

    recorder.record();
    setPhase('recording');
  }, [phase, recorder]);

  const stop = useCallback(async () => {
    if (
      operationRef.current ||
      (
        phase !== 'recording' &&
        phase !== 'paused'
      )
    ) {
      return;
    }

    operationRef.current = 'stop';

    try {
      await recorder.stop();

      const uri = recorder.uri;

      await audioSession.preparePlayback();

      if (!mountedRef.current) {
        return;
      }

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

      setPhase('stopped');
    } catch {
      await restorePlayback();

      if (!mountedRef.current) {
        return;
      }

      setPhase('error');
      setErrorCode('recording-stop-failed');
    } finally {
      if (operationRef.current === 'stop') {
        operationRef.current = null;
      }
    }
  }, [
    audioSession,
    phase,
    recorder,
    recorderState.durationMillis,
    restorePlayback,
  ]);

  const discard = useCallback(() => {
    if (operationRef.current) {
      return;
    }

    setDraft(null);
    setErrorCode(null);
    setPhase('idle');
  }, []);

  const dismissError = useCallback(() => {
    if (operationRef.current) {
      return;
    }

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
