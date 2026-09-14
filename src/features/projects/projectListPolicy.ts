import type {
  ProjectRecord,
} from '../../contracts/ProjectRepository';
import type {
  ProjectViewMode,
} from './ProjectViewMode';

function normalizeProjectSearchText(
  value: string,
): string {
  return value
    .trim()
    .toLocaleLowerCase();
}

export function hasProjectSearchQuery(
  query: string,
): boolean {
  return normalizeProjectSearchText(query).length > 0;
}

export function sortProjectRecords(
  records: readonly ProjectRecord[],
): ProjectRecord[] {
  return [...records].sort((left, right) => {
    const archiveDelta =
      Number(left.isArchived)
      - Number(right.isArchived);

    if (archiveDelta !== 0) {
      return archiveDelta;
    }

    const updatedDelta =
      right.updatedAt - left.updatedAt;

    if (updatedDelta !== 0) {
      return updatedDelta;
    }

    return left.id.localeCompare(right.id);
  });
}

export function filterProjectRecords(
  records: readonly ProjectRecord[],
  viewMode: ProjectViewMode,
  query: string,
): ProjectRecord[] {
  const normalizedQuery =
    normalizeProjectSearchText(query);

  return records.filter((project) => {
    const modeMatches =
      viewMode === 'archived'
        ? project.isArchived
        : !project.isArchived;

    if (!modeMatches) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return (
      project.name
        .toLocaleLowerCase()
        .includes(normalizedQuery)
      || project.description
        .toLocaleLowerCase()
        .includes(normalizedQuery)
    );
  });
}
