export const settingsTranslations = {
  ar: {
    settingsLoadFailed:
      'تعذر تحميل إعدادات التطبيق.',
    settingsSaveFailed:
      'تعذر حفظ إعداد التطبيق.',
    settingsResetFailed:
      'تعذر إعادة تعيين إعدادات التطبيق.',
  },
  de: {
    settingsLoadFailed:
      'Die App-Einstellungen konnten nicht geladen werden.',
    settingsSaveFailed:
      'Die App-Einstellung konnte nicht gespeichert werden.',
    settingsResetFailed:
      'Die App-Einstellungen konnten nicht zurückgesetzt werden.',
  },
  en: {
    settingsLoadFailed:
      'Unable to load application settings.',
    settingsSaveFailed:
      'Unable to save application setting.',
    settingsResetFailed:
      'Unable to reset application settings.',
  },
} as const;

export type SettingsTranslationKey =
  keyof typeof settingsTranslations.en;
