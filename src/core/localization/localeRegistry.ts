export const SUPPORTED_LOCALES = [
  'ar',
  'de',
  'en',
  'tr',
  'fr',
  'es',
  'it',
  'pt',
  'ru',
] as const;

export type AppLocale =
  (typeof SUPPORTED_LOCALES)[number];

export type LocaleDirection =
  | 'ltr'
  | 'rtl';

export type LocaleMaturity =
  | 'complete'
  | 'beta';

export type LocaleDefinition = {
  nativeLabel: string;
  intlTag: string;
  direction: LocaleDirection;
  maturity: LocaleMaturity;
};

export const localeRegistry:
  Readonly<Record<
    AppLocale,
    LocaleDefinition
  >> = {
    ar: {
      nativeLabel: 'العربية',
      intlTag: 'ar',
      direction: 'rtl',
      maturity: 'complete',
    },
    de: {
      nativeLabel: 'Deutsch',
      intlTag: 'de-DE',
      direction: 'ltr',
      maturity: 'complete',
    },
    en: {
      nativeLabel: 'English',
      intlTag: 'en-US',
      direction: 'ltr',
      maturity: 'complete',
    },
    tr: {
      nativeLabel: 'Türkçe',
      intlTag: 'tr-TR',
      direction: 'ltr',
      maturity: 'beta',
    },
    fr: {
      nativeLabel: 'Français',
      intlTag: 'fr-FR',
      direction: 'ltr',
      maturity: 'beta',
    },
    es: {
      nativeLabel: 'Español',
      intlTag: 'es-ES',
      direction: 'ltr',
      maturity: 'beta',
    },
    it: {
      nativeLabel: 'Italiano',
      intlTag: 'it-IT',
      direction: 'ltr',
      maturity: 'beta',
    },
    pt: {
      nativeLabel: 'Português',
      intlTag: 'pt-PT',
      direction: 'ltr',
      maturity: 'beta',
    },
    ru: {
      nativeLabel: 'Русский',
      intlTag: 'ru-RU',
      direction: 'ltr',
      maturity: 'beta',
    },
  };

export function isAppLocale(
  value: unknown,
): value is AppLocale {
  return (
    typeof value === 'string'
    && (
      SUPPORTED_LOCALES as readonly string[]
    ).includes(value)
  );
}

export function getLocaleDefinition(
  locale: AppLocale,
): LocaleDefinition {
  return localeRegistry[locale];
}

export function isRtlLocale(
  locale: AppLocale,
): boolean {
  return (
    localeRegistry[locale].direction
    === 'rtl'
  );
}
