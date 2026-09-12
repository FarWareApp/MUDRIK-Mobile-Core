import {
  useCallback,
  useMemo,
  useState,
} from 'react';

import {
  ProjectRecord,
  ProjectRepository,
} from '../../../contracts/ProjectRepository';
import {
  diagnosticsService,
} from '../../../core/diagnostics/DiagnosticsService';

import {
  createProjectId,
} from '../createProjectId';

export type ProjectViewMode =
  | 'active'
  | 'archived';

type Dependencies = {
  repository:
    ProjectRepository;

  onProjectDeleted?:
    () => Promise<void>;
};

function recordProjectListError(
  event: string,
  caught: unknown,
): void {
  diagnosticsService.record(
    'projects',
    caught instanceof Error
      ? `${event}:${caught.message}`
      : `${event}:unknown`,
    'error',
  );
}

export function useProjectsController({
  repository,
  onProjectDeleted,
}: Dependencies) {
  const [projects, setProjects] =
    useState<ProjectRecord[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [query, setQuery] =
    useState('');

  const [viewMode, setViewMode] =
    useState<ProjectViewMode>(
      'active',
    );

  const load =
    useCallback(async () => {
      setLoading(true);

      try {
        setProjects(
          await repository.list(true),
        );

        setError(null);
      } catch (caught) {
        recordProjectListError(
          'load-failed',
          caught,
        );

        setError(
          'Unable to load projects.',
        );
      } finally {
        setLoading(false);
      }
    }, [repository]);

  const create =
    useCallback(
      async (
        name: string,
        description: string,
      ) => {
        if (busy) {
          return null;
        }

        const cleanName =
          name.trim();

        if (!cleanName) {
          setError(
            'Project name cannot be empty.',
          );
          return null;
        }

        const id =
          createProjectId();

        const now =
          Date.now();

        setBusy(true);
        setError(null);

        try {
          await repository.create({
            id,
            name: cleanName,
            description:
              description.trim(),
            createdAt: now,
          });

          await load();

          return id;
        } catch (caught) {
          recordProjectListError(
            'create-failed',
            caught,
          );

          setError(
            'Unable to create project.',
          );
          return null;
        } finally {
          setBusy(false);
        }
      },
      [
        busy,
        load,
        repository,
      ],
    );

  const toggleArchived =
    useCallback(
      async (
        project:
          ProjectRecord,
      ) => {
        if (busy) {
          return;
        }

        setBusy(true);
        setError(null);

        try {
          await repository.setArchived(
            project.id,
            !project.isArchived,
            Date.now(),
          );

          await load();
        } catch (caught) {
          recordProjectListError(
            'archive-failed',
            caught,
          );

          setError(
            'Unable to update project.',
          );
        } finally {
          setBusy(false);
        }
      },
      [
        busy,
        load,
        repository,
      ],
    );

  const deleteProject =
    useCallback(
      async (id: string) => {
        if (busy) {
          return false;
        }

        setBusy(true);
        setError(null);

        try {
          await repository.delete(id);

          try {
            await onProjectDeleted?.();
          } catch (cleanupError) {
            diagnosticsService.record(
              'projects',
              cleanupError instanceof Error
                ? `cleanup-after-delete-failed:${cleanupError.message}`
                : 'cleanup-after-delete-failed:unknown',
              'warning',
            );
          }

          await load();
          return true;
        } catch (caught) {
          recordProjectListError(
            'delete-failed',
            caught,
          );

          setError(
            'Unable to delete project.',
          );
          return false;
        } finally {
          setBusy(false);
        }
      },
      [
        busy,
        load,
        onProjectDeleted,
        repository,
      ],
    );

  const visibleProjects =
    useMemo(() => {
      const normalized =
        query
          .trim()
          .toLocaleLowerCase();

      return projects.filter(
        (project) => {
          const modeMatches =
            viewMode === 'archived'
              ? project.isArchived
              : !project.isArchived;

          if (!modeMatches) {
            return false;
          }

          if (!normalized) {
            return true;
          }

          return (
            project.name
              .toLocaleLowerCase()
              .includes(normalized)
            ||
            project.description
              .toLocaleLowerCase()
              .includes(normalized)
          );
        },
      );
    }, [
      projects,
      query,
      viewMode,
    ]);

  return {
    projects:
      visibleProjects,

    loading,
    busy,
    error,

    query,
    setQuery,

    viewMode,
    setViewMode,

    load,
    create,
    toggleArchived,
    deleteProject,

    dismissError: () =>
      setError(null),
  };
}
