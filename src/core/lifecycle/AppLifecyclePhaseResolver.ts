import type {
  AppStateStatus,
} from 'react-native';

import type {
  AppLifecyclePhase,
} from '../../contracts/AppLifecycle';

export function resolveAppLifecyclePhase(
  state: AppStateStatus,
): AppLifecyclePhase {
  if (state === 'active') {
    return 'active';
  }

  if (state === 'inactive') {
    return 'inactive';
  }

  if (state === 'background') {
    return 'background';
  }

  return 'unknown';
}
