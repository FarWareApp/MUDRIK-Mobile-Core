import { useEffect } from 'react';

import { router } from 'expo-router';

import {
  NotificationTarget,
} from '../../../contracts/Notification';
import {
  diagnosticsService,
} from '../../../core/diagnostics/DiagnosticsService';
import {
  normalizeProjectId,
} from '../../projects/ProjectId';

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

export function NotificationNavigationBridge() {
  const {
    lastResponse,
    consumeLastResponse,
  } = useNotifications();

  useEffect(() => {
    const response =
      lastResponse;

    if (!response) {
      return;
    }

    const data =
      response.notification.data;

    const rawTarget =
      data.target;

    const consume = () => {
      void consumeLastResponse()
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
          normalizeProjectId(
            data.projectId,
          );

        if (!projectId) {
          diagnosticsService.record(
            'notification-navigation',
            'ignored-invalid-project-id',
            'warning',
          );

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
    consumeLastResponse,
    lastResponse,
  ]);

  return null;
}
