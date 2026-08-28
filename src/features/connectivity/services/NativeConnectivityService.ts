import NetInfo, {
  NetInfoState,
} from '@react-native-community/netinfo';

import {
  ConnectivityKind,
  ConnectivitySnapshot,
} from '../../../contracts/Connectivity';

import {
  ConnectivityService,
} from '../../../contracts/ConnectivityService';

type ConnectionDetails = {
  isConnectionExpensive?:
    boolean;
};

function mapKind(
  state: NetInfoState,
): ConnectivityKind {
  switch (state.type) {
    case 'wifi':
      return 'wifi';

    case 'cellular':
      return 'cellular';

    case 'ethernet':
      return 'ethernet';

    case 'none':
      return 'none';

    default:
      return 'unknown';
  }
}

function mapState(
  state: NetInfoState,
): ConnectivitySnapshot {
  const details =
    state.details as
      | ConnectionDetails
      | null;

  return {
    isConnected:
      state.isConnected === true,

    isInternetReachable:
      state.isInternetReachable,

    kind:
      mapKind(state),

    isExpensive:
      typeof details
        ?.isConnectionExpensive ===
        'boolean'
        ? details
            .isConnectionExpensive
        : null,

    changedAt:
      Date.now(),
  };
}

export class NativeConnectivityService
  implements ConnectivityService
{
  async getCurrent():
    Promise<ConnectivitySnapshot> {
    return mapState(
      await NetInfo.fetch(),
    );
  }

  subscribe(
    listener: (
      snapshot:
        ConnectivitySnapshot,
    ) => void,
  ): () => void {
    return NetInfo.addEventListener(
      (state) => {
        listener(
          mapState(state),
        );
      },
    );
  }
}
