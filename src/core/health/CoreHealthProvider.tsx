import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
} from 'react';

import {
  CoreHealthSnapshot,
} from '../../contracts/CoreHealth';

import {
  useNotifications,
} from '../../features/notifications/NotificationProvider';

import {
  diagnosticsService,
} from '../diagnostics/DiagnosticsService';

import {
  useRuntime,
} from '../runtime/RuntimeProvider';

import {
  useAppSettings,
} from '../settings/AppSettingsProvider';

const CoreHealthContext =
  createContext<
    CoreHealthSnapshot | null
  >(null);

export function CoreHealthProvider({
  children,
}: PropsWithChildren) {
  const runtime =
    useRuntime();

  const notifications =
    useNotifications();

  const settings =
    useAppSettings();

  const value =
    useMemo<
      CoreHealthSnapshot
    >(() => {
      const issues = [];

      if (
        runtime.networkError
      ) {
        issues.push({
          id:
            'network-monitor',

          message:
            runtime.networkError,
        });
      }

      if (
        notifications.error
      ) {
        issues.push({
          id:
            'notifications',

          message:
            notifications.error,
        });
      }

      if (
        settings.error
      ) {
        issues.push({
          id:
            'settings',

          message:
            settings.error,
        });
      }

      return {
        status:
          issues.length > 0
            ? 'degraded'
            : 'healthy',

        ready:
          !runtime
            .networkLoading
          &&
          notifications
            .initialized
          &&
          !settings.loading,

        issues,

        evaluatedAt:
          Date.now(),
      };
    }, [
      notifications.error,
      notifications
        .initialized,
      runtime.networkError,
      runtime.networkLoading,
      settings.error,
      settings.loading,
    ]);

  useEffect(() => {
    diagnosticsService.record(
      'core-health',
      `${value.status}:ready=${value.ready}:issues=${value.issues.length}`,
      value.status ===
        'healthy'
        ? 'info'
        : 'warning',
    );
  }, [
    value.ready,
    value.status,
    value.issues.length,
  ]);

  return (
    <CoreHealthContext.Provider
      value={value}
    >
      {children}
    </CoreHealthContext.Provider>
  );
}

export function useCoreHealth():
  CoreHealthSnapshot {
  const value =
    useContext(
      CoreHealthContext,
    );

  if (!value) {
    throw new Error(
      'useCoreHealth must be used inside CoreHealthProvider',
    );
  }

  return value;
}
