import type { AppLocale } from '../localization/translations';

type EmergencyErrorCopy = {
  title: string;
  body: string;
  referenceLabel: string;
  retry: string;
  retryAccessibility: string;
};

export const emergencyErrorTranslations = {
  ar: {
    title: 'حدث خطأ في واجهة MUDRIK',
    body: 'يمكن إعادة تشغيل واجهة التطبيق بأمان.',
    referenceLabel: 'المرجع',
    retry: 'إعادة المحاولة',
    retryAccessibility: 'إعادة تشغيل واجهة التطبيق',
  },
  de: {
    title: 'In der MUDRIK-Oberfläche ist ein Fehler aufgetreten',
    body: 'Die App-Oberfläche kann sicher neu gestartet werden.',
    referenceLabel: 'Referenz',
    retry: 'Erneut versuchen',
    retryAccessibility: 'App-Oberfläche neu starten',
  },
  en: {
    title: 'MUDRIK encountered an interface error',
    body: 'The application interface can be restarted safely.',
    referenceLabel: 'Reference',
    retry: 'Retry',
    retryAccessibility: 'Restart application interface',
  },
} as const satisfies Record<AppLocale, EmergencyErrorCopy>;
