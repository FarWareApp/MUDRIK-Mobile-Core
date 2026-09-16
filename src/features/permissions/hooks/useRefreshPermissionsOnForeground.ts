import {
  useEffect,
} from 'react';

import {
  useLifecycle,
} from '../../../core/lifecycle/LifecycleProvider';

export function useRefreshPermissionsOnForeground(
  refresh: () => Promise<void>,
): void {
  const {
    phase,
    lastChangedAt,
  } = useLifecycle();

  useEffect(() => {
    if (
      phase !== 'active' ||
      lastChangedAt === 0
    ) {
      return;
    }

    void refresh();
  }, [
    phase,
    lastChangedAt,
    refresh,
  ]);
}
