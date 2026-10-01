import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';

import {
  useLifecycle,
} from '../../../core/lifecycle/LifecycleProvider';

import { MicrophonePermissionService } from '../services/MicrophonePermissionService';
import { VoiceAudioSessionService } from '../services/VoiceAudioSessionService';
import {
  VoiceRecordingFileStore,
} from '../storage/VoiceRecordingFileStore';
import {
  MUDRIK_VOICE_RECORDING_OPTIONS,
} from '../VoiceRecordingProfile';
import type {
  MicrophonePermissionState,
  VoiceRecorderErrorCode,
  VoiceRecorderPhase,
  VoiceRecordingDraft,
} from '../types';

type RecorderOperation =
  | 'start'
  | 'stop'
  | 'discard';

export function useVoiceRecorderController() {
  const recorder = useAudioRecorder(
    MUDRIK_VOICE_RECORDING_OPTIONS,
  );
  const recorderState = useAudioRecorderState(recorder, 200);

  const permissionService = useMemo(
    () => new MicrophonePermissionService(),
    [],
  );

  const audioSession = useMemo(
    () => new VoiceAudioSessionService(),
    [],
  );

  const recordingFileStore = useMemo(
    () => new VoiceRecordingFileStore(),
    [],
  );

  const {
    isForeground,
    lastChangedAt,
  } = useLifecycle();

  const [phase, setPhase] = useState<VoiceRecorderPhase>('idle');
  const [permission, setPermission] =
    useState<MicrophonePermissionState>('unknown');
  const [draft, setDraft] =
    useState<VoiceRecordingDraft | null>(null);
  const [errorCode, setErrorCode] =
    useState<VoiceRecorderErrorCode | null>(null);

  const mountedRef = useRef(true);
  const phaseRef = useRef<VoiceRecorderPhase>(phase);
  const draftRef = useRef<VoiceRecordingDraft | null>(draft);
  const operationRef = useRef<RecorderOperation | null>(null);

  const deleteRecordingFile = useCallback(
    (uri: string | null | undefined): boolean => {
      if (!uri) {
        return true;
      }

      try {
        recordingFileStore.delete(uri);
        return true;
      } catch {
        return false;
      }
    },
    [recordingFileStore],
  );

  const restorePlayback = useCallback(async () => {
    try {
      await audioSession.preparePlayback();
    } catch {
      // Best-effort cleanup must never replace the primary recorder failure.
    }
  }, [audioSession]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      if (operationRef.current === 'stop') {
        return;
      }

      const currentPhase = phaseRef.current;
      const nativeStatus = recorder.getStatus();
      const recordingIsActive =
        nativeStatus.isRecording ||
        currentPhase === 'recording' ||
        currentPhase === 'paused';

      if (recordingIsActive) {
        const activeUri =
          nativeStatus.url ??
          recorder.uri;

        void (async () => {
          try {
            await recorder.stop();
          } catch {
            // Cleanup still deletes the private draft and restores playback.
          }

          deleteRecordingFile(
            recorder.getStatus().url ??
            recorder.uri ??
            activeUri,
          );

          await restorePlayback();
        })();
        return;
      }

      const currentDraft =
        draftRef.current;

      if (currentDraft) {
        deleteRecordingFile(
          currentDraft.uri,
        );
        draftRef.current = null;
      }

      void restorePlayback();
    };
  }, [
    deleteRecordingFile,
    recorder,
    restorePlayback,
  ]);

  useEffect(() => {
    if (!isForeground) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const status =
        await permissionService.getStatus();

      if (
        cancelled
        || !mountedRef.current
      ) {
        return;
      }

      setPermission(status);

      if (status === 'granted') {
        setErrorCode(
          (current) =>
            current ===
            'microphone-permission-denied'
              ? null
              : current,
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    isForeground,
    lastChangedAt,
    permissionService,
  ]);

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

    const currentDraft =
      draftRef.current;

    if (currentDraft) {
      const deleted =
        deleteRecordingFile(
          currentDraft.uri,
        );

      if (!deleted) {
        setErrorCode(
          'recording-delete-failed',
        );
        setPhase('stopped');
        operationRef.current = null;
        return;
      }

      draftRef.current = null;
      setDraft(null);
    }

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
        deleteRecordingFile(
          recorder.getStatus().url ??
          recorder.uri,
        );
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
    deleteRecordingFile,
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
    const durationMs =
      recorderState.durationMillis;

    try {
      await recorder.stop();

      const uri =
        recorder.getStatus().url ??
        recorder.uri;

      await audioSession.preparePlayback();

      if (!mountedRef.current) {
        deleteRecordingFile(uri);
        return;
      }

      if (!uri) {
        setPhase('error');
        setErrorCode('recording-uri-unavailable');
        return;
      }

      const nextDraft = {
        uri,
        durationMs,
        createdAt: Date.now(),
      };

      draftRef.current = nextDraft;
      setDraft(nextDraft);

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
    deleteRecordingFile,
    phase,
    recorder,
    recorderState.durationMillis,
    restorePlayback,
  ]);

  const discard = useCallback(() => {
    if (operationRef.current) {
      return;
    }

    const currentDraft = draftRef.current;

    if (!currentDraft) {
      setErrorCode(null);
      setPhase('idle');
      return;
    }

    operationRef.current = 'discard';

    try {
      recordingFileStore.delete(
        currentDraft.uri,
      );

      draftRef.current = null;
      setDraft(null);
      setErrorCode(null);
      setPhase('idle');
    } catch {
      setErrorCode(
        'recording-delete-failed',
      );
      setPhase('stopped');
    } finally {
      operationRef.current = null;
    }
  }, [recordingFileStore]);

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
