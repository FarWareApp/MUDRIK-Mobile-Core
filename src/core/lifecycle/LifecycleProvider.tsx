import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useMemo,
} from 'react';

import type {
  AppStateStatus,
} from 'react-native';

import type {
  AppLifecyclePhase,
} from '../../contracts/AppLifecycle';
import {
  resolveAppLifecyclePhase,
} from './AppLifecyclePhaseResolver';
import {
  useSystemLifecycleState,
} from './useSystemLifecycleState';

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

export function LifecycleProvider({
  children,
}: PropsWithChildren) {
  const {
    appState,
    lastChangedAt,
  } = useSystemLifecycleState();

  const value =
    useMemo<LifecycleContextValue>(
      () => {
        const phase =
          resolveAppLifecyclePhase(
            appState,
          );

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
