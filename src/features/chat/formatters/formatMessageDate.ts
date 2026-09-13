import type {
  AppLocale,
} from '../../../core/localization/translations';

const LOCALE_TAGS: Readonly<Record<AppLocale, string>> = {
  ar: 'ar',
  de: 'de-DE',
  en: 'en-US',
};

export function formatMessageDate(
  timestamp: number,
  locale: AppLocale,
): string {
  if (
    !Number.isSafeInteger(timestamp)
    || timestamp < 0
  ) {
    return '';
  }

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat(
    LOCALE_TAGS[locale],
    {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    },
  ).format(date);
}
