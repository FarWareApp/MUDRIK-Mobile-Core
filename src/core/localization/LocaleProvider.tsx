import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useMemo,
  useState,
} from 'react';
import { I18nManager } from 'react-native';

import {
  AppLocale,
  TranslationKey,
  translations,
} from './translations';

type LocaleContextValue = {
  locale: AppLocale;
  isRTL: boolean;
  setLocale: (locale: AppLocale) => void;
  t: (key: TranslationKey) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: PropsWithChildren) {
  const [locale, setLocale] = useState<AppLocale>(
    I18nManager.isRTL ? 'ar' : 'en',
  );

  const value = useMemo<LocaleContextValue>(() => {
    const isRTL = locale === 'ar';

    return {
      locale,
      isRTL,
      setLocale,
      t: (key) => translations[locale][key],
    };
  }, [locale]);

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const value = useContext(LocaleContext);

  if (!value) {
    throw new Error('useLocale must be used inside LocaleProvider');
  }

  return value;
}
