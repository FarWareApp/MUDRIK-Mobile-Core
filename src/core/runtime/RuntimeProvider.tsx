import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useMemo,
} from 'react';

import {
  ConnectivitySnapshot,
} from '../../contracts/Connectivity';

import {
  AppLifecyclePhase,
} from '../../contracts/AppLifecycle';

import {
  useConnectivity,
} from '../../features/connectivity/ConnectivityProvider';

import {
  useLifecycle,
} from '../lifecycle/LifecycleProvider';

import {
  resolveRuntimeMode,
  RuntimeMode,
} from './RuntimeModeResolver';

type RuntimeContextValue = {
  mode: RuntimeMode;

  connectivity:
    ConnectivitySnapshot;

  lifecyclePhase:
    AppLifecyclePhase;

  isForeground: boolean;

  isOnline: boolean;
  isOffline: boolean;

  isWifi: boolean;
  isCellular: boolean;

  networkLoading: boolean;

  networkError:
    string | null;
};

const RuntimeContext =
  createContext<
    RuntimeContextValue | null
  >(null);

export function RuntimeProvider({
  children,
}: PropsWithChildren) {
  const connectivityState =
    useConnectivity();

  const lifecycle =
    useLifecycle();

  const value =
    useMemo<
      RuntimeContextValue
    >(
      () => {
        const mode =
          resolveRuntimeMode(
            connectivityState
              .connectivity,
          );

        return {
          mode,

          connectivity:
            connectivityState
              .connectivity,

          lifecyclePhase:
            lifecycle.phase,

          isForeground:
            lifecycle.isForeground,

          isOnline:
            mode === 'online',

          isOffline:
            mode === 'offline',

          isWifi:
            connectivityState
              .connectivity.kind ===
            'wifi',

          isCellular:
            connectivityState
              .connectivity.kind ===
            'cellular',

          networkLoading:
            connectivityState.loading,

          networkError:
            connectivityState.error,
        };
      },
      [
        connectivityState
          .connectivity,
        connectivityState.error,
        connectivityState.loading,
        lifecycle.isForeground,
        lifecycle.phase,
      ],
    );

  return (
    <RuntimeContext.Provider
      value={value}
    >
      {children}
    </RuntimeContext.Provider>
  );
}

export function useRuntime():
  RuntimeContextValue {
  const value =
    useContext(
      RuntimeContext,
    );

  if (!value) {
    throw new Error(
      'useRuntime must be used inside RuntimeProvider',
    );
  }

  return value;
}
