import type {
  AppLocale,
} from '../../../core/localization/AppLocale';
import {
  getLocaleDefinition,
} from '../../../core/localization/AppLocale';

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
    getLocaleDefinition(locale).intlTag,
    {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    },
  ).format(date);
}
