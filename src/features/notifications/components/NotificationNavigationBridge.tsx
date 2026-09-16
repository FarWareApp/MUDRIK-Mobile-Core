import { useEffect } from 'react';

import { router } from 'expo-router';

import {
  diagnosticsService,
} from '../../../core/diagnostics/DiagnosticsService';

import {
  useNotifications,
} from '../NotificationProvider';
import {
  resolveNotificationRoute,
} from '../resolveNotificationRoute';

export function NotificationNavigationBridge() {
  const {
    lastResponse,
    consumeLastResponse,
  } = useNotifications();

  useEffect(() => {
    const response = lastResponse;

    if (!response) {
      return;
    }

    const consume = () => {
      void consumeLastResponse()
        .catch(() => {
          diagnosticsService.record(
            'notification-navigation',
            'consume-failed',
            'warning',
          );
        });
    };

    const route =
      resolveNotificationRoute(
        response.notification.data,
      );

    if (!route) {
      diagnosticsService.record(
        'notification-navigation',
        'ignored-invalid-route',
        'warning',
      );
      consume();
      return;
    }

    try {
      if (route.kind === 'path') {
        router.push(route.path);
      } else {
        router.push({
          pathname: '/project/[id]',
          params: {
            id: route.projectId,
          },
        });
      }
    } catch {
      diagnosticsService.record(
        'notification-navigation',
        'navigation-failed',
        'error',
      );
      return;
    }

    diagnosticsService.record(
      'notification-navigation',
      `navigated:${route.target}`,
    );
    consume();
  }, [
    consumeLastResponse,
    lastResponse,
  ]);

  return null;
}
