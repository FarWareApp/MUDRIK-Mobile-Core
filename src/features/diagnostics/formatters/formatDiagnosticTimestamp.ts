import type {
  AppLocale,
} from '../../../core/localization/AppLocale';
import {
  getLocaleDefinition,
} from '../../../core/localization/AppLocale';

export function formatDiagnosticTimestamp(
  timestamp: number,
  locale: AppLocale,
): string {
  if (
    !Number.isSafeInteger(timestamp)
    || timestamp < 0
  ) {
    return '';
  }

  return new Intl.DateTimeFormat(
    getLocaleDefinition(locale).intlTag,
    {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    },
  ).format(new Date(timestamp));
}
