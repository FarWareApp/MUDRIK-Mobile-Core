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

export function useProjectsController({
  repository,
  onProjectDeleted,
}: Dependencies) {
  const [projects, setProjects] =
    useState<ProjectRecord[]>([]);

  const [loading, setLoading] =
    useState(true);

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
      } catch {
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
        const cleanName =
          name.trim();

        if (!cleanName) {
          return null;
        }

        const id =
          createProjectId();

        const now =
          Date.now();

        await repository.create({
          id,
          name: cleanName,
          description:
            description.trim(),
          createdAt: now,
        });

        await load();

        return id;
      },
      [
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
        await repository.setArchived(
          project.id,
          !project.isArchived,
          Date.now(),
        );

        await load();
      },
      [
        load,
        repository,
      ],
    );

  const deleteProject =
    useCallback(
      async (id: string) => {
        await repository.delete(id);

        await onProjectDeleted?.();

        await load();
      },
      [
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
