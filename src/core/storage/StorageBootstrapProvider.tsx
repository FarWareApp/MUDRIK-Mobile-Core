import React, {
  PropsWithChildren,
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  runAppMaintenance,
} from '../composition/runAppMaintenance';

import {
  initializeStorage,
} from './initializeStorage';

import {
  StorageBootstrapState,
} from './StorageBootstrapState';

type BootstrapState =
  | 'initializing'
  | 'ready'
  | 'error';

export function StorageBootstrapProvider({
  children,
}: PropsWithChildren) {
  const [state, setState] =
    useState<BootstrapState>(
      'initializing',
    );

  const initialize =
    useCallback(async () => {
      setState(
        'initializing',
      );

      try {
        await initializeStorage();

        await runAppMaintenance();

        setState('ready');
      } catch {
        setState('error');
      }
    }, []);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  if (state === 'ready') {
    return children;
  }

  return (
    <StorageBootstrapState
      failed={
        state === 'error'
      }
      onRetry={() => {
        void initialize();
      }}
    />
  );
}
