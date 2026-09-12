import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  AppState,
  AppStateStatus,
} from 'react-native';

import {
  AppLifecyclePhase,
} from '../../contracts/AppLifecycle';

import {
  diagnosticsService,
} from '../diagnostics/DiagnosticsService';

type LifecycleContextValue = {
  appState: AppStateStatus;
  phase: AppLifecyclePhase;

  isForeground: boolean;
  lastChangedAt: number;
};

const LifecycleContext =
  createContext<
    LifecycleContextValue | null
  >(null);

function mapPhase(
  state: AppStateStatus,
): AppLifecyclePhase {
  if (state === 'active') {
    return 'active';
  }

  if (state === 'inactive') {
    return 'inactive';
  }

  if (state === 'background') {
    return 'background';
  }

  return 'unknown';
}

export function LifecycleProvider({
  children,
}: PropsWithChildren) {
  const [
    appState,
    setAppState,
  ] = useState<AppStateStatus>(
    AppState.currentState,
  );

  const [
    lastChangedAt,
    setLastChangedAt,
  ] = useState(0);

  useEffect(() => {
    diagnosticsService.record(
      'lifecycle',
      `initial:${AppState.currentState}`,
    );

    const subscription =
      AppState.addEventListener(
        'change',
        (nextState) => {
          diagnosticsService.record(
            'lifecycle',
            `state:${nextState}`,
          );

          setAppState(nextState);

          setLastChangedAt(
            Date.now(),
          );
        },
      );

    return () => {
      subscription.remove();
    };
  }, []);

  const value =
    useMemo<LifecycleContextValue>(
      () => {
        const phase =
          mapPhase(appState);

        return {
          appState,
          phase,

          isForeground:
            phase === 'active',

          lastChangedAt,
        };
      },
      [
        appState,
        lastChangedAt,
      ],
    );

  return (
    <LifecycleContext.Provider
      value={value}
    >
      {children}
    </LifecycleContext.Provider>
  );
}

export function useLifecycle():
  LifecycleContextValue {
  const value =
    useContext(
      LifecycleContext,
    );

  if (!value) {
    throw new Error(
      'useLifecycle must be used inside LifecycleProvider',
    );
  }

  return value;
}
