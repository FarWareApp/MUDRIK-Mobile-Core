import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  AppState,
  AppStateStatus,
} from 'react-native';

import { diagnosticsService } from '../diagnostics/DiagnosticsService';

type LifecycleContextValue = {
  appState: AppStateStatus;
};

const LifecycleContext =
  createContext<LifecycleContextValue | null>(null);

export function LifecycleProvider({
  children,
}: PropsWithChildren) {
  const [appState, setAppState] = useState<AppStateStatus>(
    AppState.currentState,
  );

  useEffect(() => {
    diagnosticsService.record(
      'lifecycle',
      `initial:${AppState.currentState}`,
    );

    const subscription = AppState.addEventListener(
      'change',
      (nextState) => {
        diagnosticsService.record(
          'lifecycle',
          `state:${nextState}`,
        );

        setAppState(nextState);
      },
    );

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <LifecycleContext.Provider value={{ appState }}>
      {children}
    </LifecycleContext.Provider>
  );
}

export function useLifecycle(): LifecycleContextValue {
  const value = useContext(LifecycleContext);

  if (!value) {
    throw new Error(
      'useLifecycle must be used inside LifecycleProvider',
    );
  }

  return value;
}
