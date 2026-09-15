export const permissionTranslations = {
  ar: {
    permissionsLoadFailed:
      'تعذر قراءة حالة أذونات الجهاز.',
    permissionRequestFailed:
      'تعذر طلب الإذن من الجهاز.',
    loadingPermissions:
      'جارٍ قراءة أذونات الجهاز…',
  },
  de: {
    permissionsLoadFailed:
      'Die Geräteberechtigungen konnten nicht gelesen werden.',
    permissionRequestFailed:
      'Die Geräteberechtigung konnte nicht angefordert werden.',
    loadingPermissions:
      'Geräteberechtigungen werden geladen…',
  },
  en: {
    permissionsLoadFailed:
      'Unable to read device permissions.',
    permissionRequestFailed:
      'Unable to request device permission.',
    loadingPermissions:
      'Loading device permissions…',
  },
} as const;

export type PermissionTranslationKey =
  keyof typeof permissionTranslations.en;
