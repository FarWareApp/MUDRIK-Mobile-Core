export const runtimeTranslations = {
  ar: {
    offlineStatus: 'غير متصل',
    offlineLocalFeaturesAvailable: 'ميزات التطبيق المحلية ما تزال متاحة.',
  },
  de: {
    offlineStatus: 'Offline',
    offlineLocalFeaturesAvailable: 'Lokale App-Funktionen bleiben verfügbar.',
  },
  en: {
    offlineStatus: 'Offline',
    offlineLocalFeaturesAvailable: 'Local app features remain available.',
  },
} as const;

export type RuntimeTranslationKey =
  keyof typeof runtimeTranslations.en;
