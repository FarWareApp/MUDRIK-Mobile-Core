import type {
  AppLocale,
} from '../../../core/localization/AppLocale';
import {
  getLocaleDefinition,
} from '../../../core/localization/AppLocale';

export function formatMessageTime(
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
      hour: '2-digit',
      minute: '2-digit',
    },
  ).format(date);
}
