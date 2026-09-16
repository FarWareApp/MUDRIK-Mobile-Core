import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useMemo,
} from 'react';

import {
  useAppSettings,
} from '../settings/AppSettingsProvider';
import type {
  AppLocale,
} from './AppLocale';
import {
  translate,
  TranslationKey,
} from './strings';
import {
  useResolvedAppLocale,
} from './useResolvedAppLocale';

export type {
  AppLocale,
} from './AppLocale';

type LocaleContextValue = {
  locale:
    AppLocale;

  isRTL:
    boolean;

  t: (
    key: TranslationKey,
  ) => string;

  setLocale:
    (
      locale:
        AppLocale,
    ) => void;

  useSystemLocale:
    () => void;
};

const LocaleContext =
  createContext<
    LocaleContextValue
    | null
  >(null);

export function LocaleProvider({
  children,
}: PropsWithChildren) {
  const {
    settings,
    update,
  } =
    useAppSettings();

  const locale =
    useResolvedAppLocale(
      settings.language,
    );

  const value =
    useMemo<
      LocaleContextValue
    >(
      () => ({
        locale,

        isRTL:
          locale
          === 'ar',

        t:
          (
            key,
          ) =>
            translate(
              locale,
              key,
            ),

        setLocale:
          (
            nextLocale,
          ) => {
            void update({
              language:
                nextLocale,
            });
          },

        useSystemLocale:
          () => {
            void update({
              language:
                'system',
            });
          },
      }),
      [
        locale,
        update,
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
