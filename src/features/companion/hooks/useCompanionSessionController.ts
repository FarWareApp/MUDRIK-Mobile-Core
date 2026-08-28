import {
  useCallback,
  useState,
} from 'react';

import {
  CompanionSessionPhase,
} from '../../../contracts/Companion';

export function useCompanionSessionController() {
  const [phase, setPhase] =
    useState<CompanionSessionPhase>(
      'idle',
    );

  const [
    phaseBeforePause,
    setPhaseBeforePause,
  ] = useState<
    CompanionSessionPhase
  >('listening');

  const [error, setError] =
    useState<string | null>(
      null,
    );

  const start =
    useCallback(() => {
      setError(null);
      setPhase('listening');
    }, []);

  const beginProcessing =
    useCallback(() => {
      setPhase('processing');
    }, []);

  const beginSpeaking =
    useCallback(() => {
      setPhase('speaking');
    }, []);

  const beginListening =
    useCallback(() => {
      setPhase('listening');
    }, []);

  const pause =
    useCallback(() => {
      if (
        phase !== 'listening'
        &&
        phase !== 'speaking'
      ) {
        return;
      }

      setPhaseBeforePause(
        phase,
      );

      setPhase('paused');
    }, [phase]);

  const resume =
    useCallback(() => {
      if (
        phase !== 'paused'
      ) {
        return;
      }

      setPhase(
        phaseBeforePause,
      );
    }, [
      phase,
      phaseBeforePause,
    ]);

  const interrupt =
    useCallback(() => {
      if (
        phase === 'idle'
      ) {
        return;
      }

      setPhase(
        'interrupted',
      );
    }, [phase]);

  const recover =
    useCallback(() => {
      if (
        phase !==
        'interrupted'
      ) {
        return;
      }

      setPhase('listening');
    }, [phase]);

  const stop =
    useCallback(() => {
      setError(null);
      setPhase('idle');
    }, []);

  const fail =
    useCallback(
      (message: string) => {
        setError(message);
        setPhase('error');
      },
      [],
    );

  return {
    phase,
    error,

    start,
    stop,

    beginListening,
    beginProcessing,
    beginSpeaking,

    pause,
    resume,

    interrupt,
    recover,

    fail,

    dismissError: () =>
      setError(null),
  };
}
