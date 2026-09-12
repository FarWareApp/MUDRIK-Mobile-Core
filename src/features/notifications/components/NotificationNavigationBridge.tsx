import { useEffect } from 'react';

import { router } from 'expo-router';

import {
  NotificationTarget,
} from '../../../contracts/Notification';
import {
  diagnosticsService,
} from '../../../core/diagnostics/DiagnosticsService';

import {
  useNotifications,
} from '../NotificationProvider';

const TARGETS =
  new Set<NotificationTarget>([
    'home',
    'conversations',
    'projects',
    'project',
    'settings',
    'companion',
    'voice',
  ]);

function validProjectId(
  value: unknown,
): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();

  if (
    normalized.length === 0 ||
    normalized.length > 128
  ) {
    return null;
  }

  return normalized;
}

export function NotificationNavigationBridge() {
  const notifications =
    useNotifications();

  useEffect(() => {
    const response =
      notifications.lastResponse;

    if (!response) {
      return;
    }

    const data =
      response.notification.data;

    const rawTarget =
      data.target;

    const consume = () => {
      void notifications
        .consumeLastResponse()
        .catch((caught) => {
          diagnosticsService.record(
            'notification-navigation',
            caught instanceof Error
              ? `consume-failed:${caught.message}`
              : 'consume-failed:unknown',
            'warning',
          );
        });
    };

    if (
      typeof rawTarget !== 'string'
      ||
      !TARGETS.has(
        rawTarget as NotificationTarget,
      )
    ) {
      diagnosticsService.record(
        'notification-navigation',
        'ignored-invalid-target',
        'warning',
      );

      consume();
      return;
    }

    const target =
      rawTarget as NotificationTarget;

    try {
      if (target === 'home') {
        router.push('/');
      } else if (
        target === 'conversations'
      ) {
        router.push('/conversations');
      } else if (
        target === 'projects'
      ) {
        router.push('/projects');
      } else if (
        target === 'settings'
      ) {
        router.push('/settings');
      } else if (
        target === 'companion'
      ) {
        router.push('/companion');
      } else if (
        target === 'voice'
      ) {
        router.push('/voice');
      } else if (
        target === 'project'
      ) {
        const projectId =
          validProjectId(
            data.projectId,
          );

        if (!projectId) {
          diagnosticsService.record(
            'notification-navigation',
            'ignored-invalid-project-id',
            'warning',
          );

          consume();
          return;
        }

        router.push({
          pathname: '/project/[id]',

          params: {
            id: projectId,
          },
        });
      }

      diagnosticsService.record(
        'notification-navigation',
        `navigated:${target}`,
      );
    } catch (caught) {
      diagnosticsService.record(
        'notification-navigation',
        caught instanceof Error
          ? `navigation-failed:${caught.message}`
          : 'navigation-failed:unknown',
        'error',
      );
    } finally {
      consume();
    }
  }, [
    notifications
      .consumeLastResponse,
    notifications.lastResponse,
  ]);

  return null;
}
