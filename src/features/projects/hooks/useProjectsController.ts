import {
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';

import type {
  ProjectRecord,
  ProjectRepository,
} from '../../../contracts/ProjectRepository';
import {
  diagnosticsService,
} from '../../../core/diagnostics/DiagnosticsService';
import type {
  ProjectListErrorCode,
} from '../ProjectListErrorCode';
import type {
  ProjectViewMode,
} from '../ProjectViewMode';
import {
  createProjectId,
} from '../createProjectId';
import {
  filterProjectRecords,
  hasProjectSearchQuery,
  sortProjectRecords,
} from '../projectListPolicy';

type Dependencies = {
  repository: ProjectRepository;
  onProjectDeleted?: () => Promise<void>;
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

  const [loadFailed, setLoadFailed] =
    useState(false);

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState<ProjectListErrorCode | null>(null);

  const [query, setQuery] =
    useState('');

  const [viewMode, setViewMode] =
    useState<ProjectViewMode>('active');

  const mutationInFlightRef =
    useRef(false);

  const beginMutation =
    useCallback((): boolean => {
      if (mutationInFlightRef.current) {
        return false;
      }

      mutationInFlightRef.current = true;
      setBusy(true);
      setError(null);
      return true;
    }, []);

  const endMutation =
    useCallback(() => {
      mutationInFlightRef.current = false;
      setBusy(false);
    }, []);

  const load =
    useCallback(async () => {
      setLoading(true);
      setLoadFailed(false);
      setError(null);

      try {
        const records =
          await repository.list(true);

        setProjects(
          sortProjectRecords(records),
        );
      } catch (caught) {
        recordProjectListError(
          'load-failed',
          caught,
        );

        setLoadFailed(true);
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
        const cleanName = name.trim();

        if (!cleanName) {
          setError('name-required');
          return null;
        }

        if (!beginMutation()) {
          return null;
        }

        const id = createProjectId();
        const now = Date.now();
        const cleanDescription =
          description.trim();

        try {
          await repository.create({
            id,
            name: cleanName,
            description: cleanDescription,
            createdAt: now,
          });

          setProjects((current) =>
            sortProjectRecords([
              ...current,
              {
                id,
                name: cleanName,
                description: cleanDescription,
                createdAt: now,
                updatedAt: now,
                isArchived: false,
              },
            ]),
          );

          return id;
        } catch (caught) {
          recordProjectListError(
            'create-failed',
            caught,
          );

          setError('create-failed');
          return null;
        } finally {
          endMutation();
        }
      },
      [
        beginMutation,
        endMutation,
        repository,
      ],
    );

  const toggleArchived =
    useCallback(
      async (project: ProjectRecord) => {
        if (!beginMutation()) {
          return;
        }

        const nextArchived =
          !project.isArchived;
        const updatedAt = Date.now();

        try {
          await repository.setArchived(
            project.id,
            nextArchived,
            updatedAt,
          );

          setProjects((current) =>
            sortProjectRecords(
              current.map((item) =>
                item.id === project.id
                  ? {
                      ...item,
                      isArchived: nextArchived,
                      updatedAt,
                    }
                  : item,
              ),
            ),
          );
        } catch (caught) {
          recordProjectListError(
            'archive-failed',
            caught,
          );

          setError('archive-failed');
        } finally {
          endMutation();
        }
      },
      [
        beginMutation,
        endMutation,
        repository,
      ],
    );

  const deleteProject =
    useCallback(
      async (id: string) => {
        if (!beginMutation()) {
          return false;
        }

        try {
          await repository.delete(id);

          setProjects((current) =>
            current.filter(
              (project) => project.id !== id,
            ),
          );

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

          return true;
        } catch (caught) {
          recordProjectListError(
            'delete-failed',
            caught,
          );

          setError('delete-failed');
          return false;
        } finally {
          endMutation();
        }
      },
      [
        beginMutation,
        endMutation,
        onProjectDeleted,
        repository,
      ],
    );

  const visibleProjects =
    useMemo(
      () =>
        filterProjectRecords(
          projects,
          viewMode,
          query,
        ),
      [
        projects,
        query,
        viewMode,
      ],
    );

  const hasSearchQuery =
    useMemo(
      () => hasProjectSearchQuery(query),
      [query],
    );

  const dismissError =
    useCallback(() => {
      setError(null);
      setLoadFailed(false);
    }, []);

  return {
    projects: visibleProjects,
    loading,
    failed: loadFailed,
    busy,
    error,
    query,
    setQuery,
    hasSearchQuery,
    viewMode,
    setViewMode,
    load,
    create,
    toggleArchived,
    deleteProject,
    dismissError,
  };
}
