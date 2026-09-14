import type {
  AppSettingsErrorCode,
} from '../../core/settings/AppSettingsProvider';
import type {
  SettingsTranslationKey,
} from '../../core/localization/settingsTranslations';

export function getSettingsErrorTranslationKey(
  error: AppSettingsErrorCode,
): SettingsTranslationKey {
  switch (error) {
    case 'load':
      return 'settingsLoadFailed';
    case 'save':
      return 'settingsSaveFailed';
    case 'reset':
      return 'settingsResetFailed';
  }
}
