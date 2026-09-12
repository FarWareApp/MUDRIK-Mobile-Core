import {
  normalizeProjectId,
} from '../projects/ProjectId';

export type ResolvedNotificationRoute =
  | {
      kind: 'path';
      target:
        | 'home'
        | 'conversations'
        | 'projects'
        | 'settings'
        | 'companion'
        | 'voice';
      path:
        | '/'
        | '/conversations'
        | '/projects'
        | '/settings'
        | '/companion'
        | '/voice';
    }
  | {
      kind: 'project';
      target: 'project';
      projectId: string;
    };

const PATHS = {
  home: '/',
  conversations: '/conversations',
  projects: '/projects',
  settings: '/settings',
  companion: '/companion',
  voice: '/voice',
} as const;

export function resolveNotificationRoute(
  data: unknown,
): ResolvedNotificationRoute | null {
  if (
    typeof data !== 'object' ||
    data === null ||
    Array.isArray(data)
  ) {
    return null;
  }

  const record =
    data as Record<string, unknown>;

  const target = record.target;

  if (typeof target !== 'string') {
    return null;
  }

  if (target === 'project') {
    const projectId =
      normalizeProjectId(
        record.projectId,
      );

    return projectId
      ? {
          kind: 'project',
          target,
          projectId,
        }
      : null;
  }

  if (
    target === 'home' ||
    target === 'conversations' ||
    target === 'projects' ||
    target === 'settings' ||
    target === 'companion' ||
    target === 'voice'
  ) {
    return {
      kind: 'path',
      target,
      path: PATHS[target],
    };
  }

  return null;
}
