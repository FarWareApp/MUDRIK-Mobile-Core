export const permissionTranslations = {
  ar: {
    permissionsLoadFailed:
      'تعذر قراءة حالة أذونات الجهاز.',
    permissionRequestFailed:
      'تعذر طلب الإذن من الجهاز.',
    permissionSettingsOpenFailed:
      'تعذر فتح إعدادات التطبيق.',
    loadingPermissions:
      'جارٍ قراءة أذونات الجهاز…',
    openPermissionSettings:
      'فتح الإعدادات',
    openingPermissionSettings:
      'جارٍ فتح الإعدادات…',
  },
  de: {
    permissionsLoadFailed:
      'Die Geräteberechtigungen konnten nicht gelesen werden.',
    permissionRequestFailed:
      'Die Geräteberechtigung konnte nicht angefordert werden.',
    permissionSettingsOpenFailed:
      'Die App-Einstellungen konnten nicht geöffnet werden.',
    loadingPermissions:
      'Geräteberechtigungen werden geladen…',
    openPermissionSettings:
      'Einstellungen öffnen',
    openingPermissionSettings:
      'Einstellungen werden geöffnet…',
  },
  en: {
    permissionsLoadFailed:
      'Unable to read device permissions.',
    permissionRequestFailed:
      'Unable to request device permission.',
    permissionSettingsOpenFailed:
      'Unable to open application settings.',
    loadingPermissions:
      'Loading device permissions…',
    openPermissionSettings:
      'Open settings',
    openingPermissionSettings:
      'Opening settings…',
  },
} as const;

export type PermissionTranslationKey =
  keyof typeof permissionTranslations.en;
