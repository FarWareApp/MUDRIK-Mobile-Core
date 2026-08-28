import { useEffect } from 'react';

import { router } from 'expo-router';

import {
  NotificationTarget,
} from '../../../contracts/Notification';

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

    if (
      typeof rawTarget !== 'string'
      ||
      !TARGETS.has(
        rawTarget as NotificationTarget,
      )
    ) {
      void notifications
        .consumeLastResponse();

      return;
    }

    const target =
      rawTarget as NotificationTarget;

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
        data.projectId;

      if (
        typeof projectId === 'string'
        &&
        projectId.length > 0
      ) {
        router.push({
          pathname: '/project/[id]',

          params: {
            id: projectId,
          },
        });
      }
    }

    void notifications
      .consumeLastResponse();
  }, [
    notifications
      .consumeLastResponse,
    notifications.lastResponse,
  ]);

  return null;
}
