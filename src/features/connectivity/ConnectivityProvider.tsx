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
  ConnectivityService,
} from '../../contracts/ConnectivityService';
import {
  useLifecycle,
} from '../../core/lifecycle/LifecycleProvider';

import {
  useConnectivityController,
} from './hooks/useConnectivityController';

type ConnectivityContextValue = {
  connectivity:
    ConnectivitySnapshot;

  loading: boolean;

  error:
    string | null;

  dismissError:
    () => void;
};

const ConnectivityContext =
  createContext<
    ConnectivityContextValue | null
  >(null);

type Props =
  PropsWithChildren<{
    service:
      ConnectivityService;
  }>;

export function ConnectivityProvider({
  service,
  children,
}: Props) {
  const lifecycle =
    useLifecycle();

  const controller =
    useConnectivityController(
      service,
      lifecycle.isForeground,
    );

  const value =
    useMemo<
      ConnectivityContextValue
    >(
      () => ({
        connectivity:
          controller.connectivity,

        loading:
          controller.loading,

        error:
          controller.error,

        dismissError:
          controller.dismissError,
      }),
      [
        controller.connectivity,
        controller.loading,
        controller.error,
        controller.dismissError,
      ],
    );

  return (
    <ConnectivityContext.Provider
      value={value}
    >
      {children}
    </ConnectivityContext.Provider>
  );
}

export function useConnectivity():
  ConnectivityContextValue {
  const value =
    useContext(
      ConnectivityContext,
    );

  if (!value) {
    throw new Error(
      'useConnectivity must be used inside ConnectivityProvider',
    );
  }

  return value;
}
