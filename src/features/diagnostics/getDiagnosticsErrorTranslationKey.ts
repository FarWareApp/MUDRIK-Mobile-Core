import type { TranslationKey } from '../../core/localization/translations';
import type { DiagnosticsErrorCode } from './DiagnosticsErrorCode';

export function getDiagnosticsErrorTranslationKey(
  errorCode: DiagnosticsErrorCode | null,
): TranslationKey | null {
  if (errorCode === 'load') {
    return 'diagnosticsLoadFailed';
  }

  if (errorCode === 'clear') {
    return 'diagnosticsClearFailed';
  }

  if (errorCode === 'maintenance') {
    return 'storageMaintenanceFailed';
  }

  return null;
}
