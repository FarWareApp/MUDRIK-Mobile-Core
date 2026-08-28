import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
} from 'react';

import {
  getLocales,
} from 'expo-localization';

import {
  LanguagePreference,
} from '../../contracts/AppSettings';

import {
  useAppSettings,
} from '../settings/AppSettingsProvider';

import {
  AppLocale,
  TranslationKey,
  translations,
} from './translations';

type LocaleContextValue = {
  locale: AppLocale;

  preference:
    LanguagePreference;

  isRTL: boolean;

  setLocale:
    (locale: AppLocale) => void;

  useSystemLocale:
    () => void;

  t:
    (
      key: TranslationKey,
    ) => string;
};

const LocaleContext =
  createContext<
    LocaleContextValue | null
  >(null);

function resolveSystemLocale():
  AppLocale {
  const language =
    getLocales()[0]
      ?.languageCode
      ?.toLowerCase();

  if (language === 'ar') {
    return 'ar';
  }

  if (language === 'de') {
    return 'de';
  }

  return 'en';
}

export function LocaleProvider({
  children,
}: PropsWithChildren) {
  const {
    settings,
    update,
  } = useAppSettings();

  const locale:
    AppLocale =
    settings.language ===
    'system'
      ? resolveSystemLocale()
      : settings.language;

  const setLocale =
    useCallback(
      (next: AppLocale) => {
        void update(
          'language',
          next,
        );
      },
      [update],
    );

  const useSystemLocale =
    useCallback(() => {
      void update(
        'language',
        'system',
      );
    }, [update]);

  const value =
    useMemo<
      LocaleContextValue
    >(
      () => ({
        locale,

        preference:
          settings.language,

        isRTL:
          locale === 'ar',

        setLocale,
        useSystemLocale,

        t: (
          key:
            TranslationKey,
        ) =>
          translations[
            locale
          ][key],
      }),
      [
        locale,
        setLocale,
        settings.language,
        useSystemLocale,
      ],
    );

  return (
    <LocaleContext.Provider
      value={value}
    >
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale():
  LocaleContextValue {
  const value =
    useContext(
      LocaleContext,
    );

  if (!value) {
    throw new Error(
      'useLocale must be used inside LocaleProvider',
    );
  }

  return value;
}
