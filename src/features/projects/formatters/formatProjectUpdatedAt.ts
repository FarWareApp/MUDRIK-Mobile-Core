import { AppLocale } from '../../../core/localization/translations';

const localeTags: Record<AppLocale, string> = {
  ar: 'ar',
  de: 'de-DE',
  en: 'en-US',
};

export function formatProjectUpdatedAt(
  updatedAt: number,
  locale: AppLocale,
): string {
  if (
    !Number.isSafeInteger(updatedAt) ||
    updatedAt < 0
  ) {
    return '';
  }

  return new Intl.DateTimeFormat(
    localeTags[locale],
    {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    },
  ).format(new Date(updatedAt));
}
