export function shouldCommitConnectivityRefresh(
  requestId: number,
  latestRequestId: number,
  snapshotRevisionAtStart: number,
  currentSnapshotRevision: number,
): boolean {
  return (
    requestId === latestRequestId &&
    snapshotRevisionAtStart === currentSnapshotRevision
  );
}
