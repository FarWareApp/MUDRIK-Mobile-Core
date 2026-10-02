import { getLocales } from 'expo-localization';

import type {
  AppLocale,
} from './AppLocale';
import {
  isAppLocale,
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

    return isAppLocale(languageCode)
      ? languageCode
      : 'en';
  } catch {
    return 'en';
  }
}
