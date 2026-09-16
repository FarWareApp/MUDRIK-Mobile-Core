import { getLocales } from 'expo-localization';

import type {
  AppLocale,
} from './AppLocale';

export function resolveSystemLocale():
  AppLocale {
  try {
    const first =
      getLocales()[0];

    const languageCode =
      first
        ?.languageCode
        ?.toLowerCase();

    if (
      languageCode
      === 'ar'
    ) {
      return 'ar';
    }

    if (
      languageCode
      === 'de'
    ) {
      return 'de';
    }

    return 'en';
  } catch {
    return 'en';
  }
}
