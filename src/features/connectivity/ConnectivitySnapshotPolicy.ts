import type {
  ConnectivitySnapshot,
} from '../../contracts/Connectivity';

export function connectivitySnapshotSignature(
  snapshot: ConnectivitySnapshot,
): string {
  return [
    snapshot.kind,
    snapshot.isConnected
      ? 'connected'
      : 'disconnected',
    snapshot.isInternetReachable === null
      ? 'reachability-unknown'
      : snapshot.isInternetReachable
        ? 'reachable'
        : 'unreachable',
    snapshot.isExpensive === null
      ? 'cost-unknown'
      : snapshot.isExpensive
        ? 'expensive'
        : 'normal-cost',
  ].join(':');
}

export function shouldApplyConnectivitySnapshot(
  latestChangedAt: number,
  incomingChangedAt: number,
): boolean {
  return incomingChangedAt >= latestChangedAt;
}
