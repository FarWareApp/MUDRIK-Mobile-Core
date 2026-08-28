import {
  ConnectivitySnapshot,
} from '../../contracts/Connectivity';

export type RuntimeMode =
  | 'online'
  | 'offline';

export function resolveRuntimeMode(
  connectivity:
    ConnectivitySnapshot,
): RuntimeMode {
  if (
    !connectivity.isConnected
    ||
    connectivity
      .isInternetReachable ===
      false
  ) {
    return 'offline';
  }

  return 'online';
}
