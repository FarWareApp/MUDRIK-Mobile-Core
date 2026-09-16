import {
  useEffect,
  useState,
} from 'react';
import {
  AppState,
  Platform,
} from 'react-native';

import type {
  LanguagePreference,
} from '../../contracts/AppSettings';
import type {
  AppLocale,
} from './AppLocale';
import {
  resolveSystemLocale,
} from './resolveSystemLocale';

export function useResolvedAppLocale(
  preference: LanguagePreference,
): AppLocale {
  const [
    systemLocale,
    setSystemLocale,
  ] = useState<AppLocale>(
    () => resolveSystemLocale(),
  );

  useEffect(() => {
    if (preference !== 'system') {
      return;
    }

    const refresh = () => {
      setSystemLocale(
        resolveSystemLocale(),
      );
    };

    refresh();

    if (Platform.OS !== 'android') {
      return;
    }

    const subscription =
      AppState.addEventListener(
        'change',
        (state) => {
          if (state === 'active') {
            refresh();
          }
        },
      );

    return () => {
      subscription.remove();
    };
  }, [preference]);

  return preference === 'system'
    ? systemLocale
    : preference;
}
