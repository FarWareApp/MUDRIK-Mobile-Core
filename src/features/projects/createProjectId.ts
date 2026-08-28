export function createProjectId():
  string {
  return `project-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}
