import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  useAudioPlayer,
  useAudioPlayerStatus,
} from 'expo-audio';

type PlaybackOperation =
  | 'toggle';

export function useVoicePlaybackController(uri: string) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);

  const mountedRef = useRef(true);
  const operationRef = useRef<PlaybackOperation | null>(null);
  const [isSeeking, setIsSeeking] = useState(false);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const toggle = useCallback(async () => {
    if (
      operationRef.current ||
      !status.isLoaded
    ) {
      return;
    }

    operationRef.current = 'toggle';
    let seeking = false;

    try {
      if (status.playing) {
        player.pause();
        return;
      }

      const shouldRestart =
        status.didJustFinish ||
        (
          status.duration > 0 &&
          status.currentTime >= status.duration
        );

      if (shouldRestart) {
        seeking = true;
        setIsSeeking(true);
        await player.seekTo(0);

        if (
          !mountedRef.current ||
          operationRef.current !== 'toggle'
        ) {
          return;
        }
      }

      player.play();
    } catch {
      // Native playback errors are reflected by status.error.
      // Keep raw platform error strings out of app state and diagnostics.
    } finally {
      if (operationRef.current === 'toggle') {
        operationRef.current = null;
      }

      if (seeking && mountedRef.current) {
        setIsSeeking(false);
      }
    }
  }, [
    player,
    status.currentTime,
    status.didJustFinish,
    status.duration,
    status.isLoaded,
    status.playing,
  ]);

  return {
    playing: status.playing,
    currentTime: status.currentTime,
    duration: status.duration,
    hasError: Boolean(status.error),
    isBusy:
      !status.isLoaded ||
      status.isBuffering ||
      isSeeking,
    isDisabled:
      !status.isLoaded ||
      isSeeking,
    toggle,
  };
}
