import { getLocales } from 'expo-localization';

import type { AppLocale } from './translations';

export function resolveSystemLocale(): AppLocale {
  try {
    const language =
      getLocales()[0]?.languageCode?.toLowerCase();

    if (language === 'ar') {
      return 'ar';
    }

    if (language === 'de') {
      return 'de';
    }
  } catch {
    return 'en';
  }

  return 'en';
}
