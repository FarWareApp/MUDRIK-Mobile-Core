import {
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  AppState,
  AppStateStatus,
} from 'react-native';

import {
  diagnosticsService,
} from '../diagnostics/DiagnosticsService';

export type SystemLifecycleState = {
  appState: AppStateStatus;
  lastChangedAt: number;
};

export function useSystemLifecycleState():
  SystemLifecycleState {
  const [
    state,
    setState,
  ] = useState<SystemLifecycleState>(
    () => ({
      appState: AppState.currentState,
      lastChangedAt: 0,
    }),
  );

  const currentStateRef =
    useRef<AppStateStatus>(
      state.appState,
    );

  useEffect(() => {
    const applyState = (
      nextState: AppStateStatus,
    ) => {
      if (
        nextState ===
        currentStateRef.current
      ) {
        return;
      }

      currentStateRef.current =
        nextState;

      diagnosticsService.record(
        'lifecycle',
        `state:${nextState}`,
      );

      setState({
        appState: nextState,
        lastChangedAt: Date.now(),
      });
    };

    diagnosticsService.record(
      'lifecycle',
      `initial:${currentStateRef.current}`,
    );

    const subscription =
      AppState.addEventListener(
        'change',
        applyState,
      );

    applyState(
      AppState.currentState,
    );

    return () => {
      subscription.remove();
    };
  }, []);

  return state;
}
