import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  NotificationEvent,
  NotificationResponseEvent,
} from '../../contracts/Notification';

import {
  NotificationService,
} from '../../contracts/NotificationService';

import {
  diagnosticsService,
} from '../../core/diagnostics/DiagnosticsService';

import {
  configureNotificationPresentation,
} from './services/configureNotificationPresentation';

type NotificationContextValue = {
  lastReceived:
    NotificationEvent | null;

  lastResponse:
    NotificationResponseEvent
    | null;

  initialized: boolean;

  error:
    string | null;

  consumeLastResponse:
    () => Promise<void>;
};

const NotificationContext =
  createContext<
    NotificationContextValue
    | null
  >(null);

type Props =
  PropsWithChildren<{
    service:
      NotificationService;
  }>;

export function NotificationProvider({
  service,
  children,
}: Props) {
  const [
    lastReceived,
    setLastReceived,
  ] =
    useState<NotificationEvent | null>(
      null,
    );

  const [
    lastResponse,
    setLastResponse,
  ] = useState<
    NotificationResponseEvent
    | null
  >(null);

  const [
    initialized,
    setInitialized,
  ] = useState(false);

  const [error, setError] =
    useState<string | null>(
      null,
    );

  useEffect(() => {
    let mounted = true;

    void configureNotificationPresentation()
      .catch(() => {
        diagnosticsService.record(
          'notification',
          'presentation-handler-unavailable',
          'warning',
        );
      });

    const unsubscribeReceived =
      service.subscribeReceived(
        (event) => {
          diagnosticsService.record(
            'notification',
            `received:${event.id}`,
          );

          setLastReceived(
            event,
          );
        },
      );

    const unsubscribeResponses =
      service.subscribeResponses(
        (event) => {
          diagnosticsService.record(
            'notification',
            `response:${event.notification.id}`,
          );

          setLastResponse(
            event,
          );
        },
      );

    void (async () => {
      try {
        await service.initialize();

        const response =
          await service
            .getLastResponse();

        if (!mounted) {
          return;
        }

        if (response) {
          setLastResponse(
            response,
          );
        }

        setInitialized(true);
        setError(null);
      } catch {
        if (!mounted) {
          return;
        }

        setInitialized(true);

        setError(
          'Unable to initialize notifications.',
        );
      }
    })();

    return () => {
      mounted = false;

      unsubscribeReceived();
      unsubscribeResponses();
    };
  }, [service]);

  const consumeLastResponse =
    useCallback(async () => {
      setLastResponse(null);

      await service
        .clearLastResponse();
    }, [service]);

  const value =
    useMemo<
      NotificationContextValue
    >(
      () => ({
        lastReceived,
        lastResponse,

        initialized,
        error,

        consumeLastResponse,
      }),
      [
        consumeLastResponse,
        error,
        initialized,
        lastReceived,
        lastResponse,
      ],
    );

  return (
    <NotificationContext.Provider
      value={value}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications():
  NotificationContextValue {
  const value =
    useContext(
      NotificationContext,
    );

  if (!value) {
    throw new Error(
      'useNotifications must be used inside NotificationProvider',
    );
  }

  return value;
}
