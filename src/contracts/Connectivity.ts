export type ConnectivityKind =
  | 'none'
  | 'wifi'
  | 'cellular'
  | 'ethernet'
  | 'unknown';

export type ConnectivitySnapshot = {
  isConnected: boolean;

  isInternetReachable:
    boolean | null;

  kind: ConnectivityKind;

  isExpensive:
    boolean | null;

  changedAt: number;
};

export const INITIAL_CONNECTIVITY:
  ConnectivitySnapshot = {
    isConnected: false,
    isInternetReachable: null,
    kind: 'unknown',
    isExpensive: null,
    changedAt: 0,
  };
