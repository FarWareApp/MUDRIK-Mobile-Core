import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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

import { NotificationErrorCode } from './NotificationErrorCode';
import {
  configureNotificationPresentation,
} from './services/configureNotificationPresentation';

type NotificationContextValue = {
  lastReceived: NotificationEvent | null;
  lastResponse: NotificationResponseEvent | null;
  initialized: boolean;
  consumingResponse: boolean;
  error: NotificationErrorCode | null;
  consumeLastResponse: () => Promise<void>;
};

const NotificationContext =
  createContext<NotificationContextValue | null>(null);

type Props = PropsWithChildren<{
  service: NotificationService;
}>;

export function NotificationProvider({
  service,
  children,
}: Props) {
  const [lastReceived, setLastReceived] =
    useState<NotificationEvent | null>(null);
  const [lastResponse, setLastResponse] =
    useState<NotificationResponseEvent | null>(null);
  const [initialized, setInitialized] =
    useState(false);
  const [consumingResponse, setConsumingResponse] =
    useState(false);
  const [error, setError] =
    useState<NotificationErrorCode | null>(null);

  const mountedRef = useRef(true);
  const consumeLockRef = useRef(false);
  const lastResponseRef =
    useRef<NotificationResponseEvent | null>(null);

  const storeLastResponse = useCallback(
    (response: NotificationResponseEvent | null) => {
      lastResponseRef.current = response;
      setLastResponse(response);
    },
    [],
  );

  useEffect(() => {
    let active = true;
    mountedRef.current = true;
    setInitialized(false);
    setError(null);

    void configureNotificationPresentation()
      .catch(() => {
        diagnosticsService.record(
          'notification',
          'presentation-handler-unavailable',
          'warning',
        );
      });

    const unsubscribeReceived =
      service.subscribeReceived((event) => {
        diagnosticsService.record(
          'notification',
          'received',
        );
        setLastReceived(event);
      });

    const unsubscribeResponses =
      service.subscribeResponses((event) => {
        diagnosticsService.record(
          'notification',
          'response-received',
        );
        storeLastResponse(event);
      });

    void (async () => {
      try {
        await service.initialize();
        const response =
          await service.getLastResponse();

        if (!active) {
          return;
        }

        if (response) {
          storeLastResponse(response);
        }

        setInitialized(true);
        setError(null);
      } catch {
        if (!active) {
          return;
        }

        diagnosticsService.record(
          'notification',
          'initialization-failed',
          'warning',
        );
        setInitialized(true);
        setError('initialize');
      }
    })();

    return () => {
      active = false;
      mountedRef.current = false;
      unsubscribeReceived();
      unsubscribeResponses();
    };
  }, [service, storeLastResponse]);

  const consumeLastResponse = useCallback(async () => {
    const response = lastResponseRef.current;

    if (!response || consumeLockRef.current) {
      return;
    }

    consumeLockRef.current = true;
    setConsumingResponse(true);

    try {
      await service.clearLastResponse();

      if (!mountedRef.current) {
        return;
      }

      setLastResponse((current) => {
        if (current !== response) {
          return current;
        }

        if (lastResponseRef.current === response) {
          lastResponseRef.current = null;
        }

        return null;
      });
      setError(null);
    } catch (caught) {
      if (mountedRef.current) {
        setError('consume');
        diagnosticsService.record(
          'notification',
          'response-consume-failed',
          'warning',
        );
      }

      throw caught;
    } finally {
      consumeLockRef.current = false;

      if (mountedRef.current) {
        setConsumingResponse(false);
      }
    }
  }, [service]);

  const value = useMemo<NotificationContextValue>(
    () => ({
      lastReceived,
      lastResponse,
      initialized,
      consumingResponse,
      error,
      consumeLastResponse,
    }),
    [
      consumeLastResponse,
      consumingResponse,
      error,
      initialized,
      lastReceived,
      lastResponse,
    ],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const value = useContext(NotificationContext);

  if (!value) {
    throw new Error(
      'useNotifications must be used inside NotificationProvider',
    );
  }

  return value;
}
