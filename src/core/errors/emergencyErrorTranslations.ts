import type {
  AppLocale,
} from '../localization/AppLocale';

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
  tr: {
    title: 'MUDRIK arayüzünde bir hata oluştu',
    body: 'Uygulama arayüzü güvenli bir şekilde yeniden başlatılabilir.',
    referenceLabel: 'Referans',
    retry: 'Tekrar dene',
    retryAccessibility: 'Uygulama arayüzünü yeniden başlat',
  },
  fr: {
    title: 'Une erreur est survenue dans l’interface MUDRIK',
    body: 'L’interface de l’application peut être redémarrée en toute sécurité.',
    referenceLabel: 'Référence',
    retry: 'Réessayer',
    retryAccessibility: 'Redémarrer l’interface de l’application',
  },
  es: {
    title: 'Se produjo un error en la interfaz de MUDRIK',
    body: 'La interfaz de la aplicación puede reiniciarse de forma segura.',
    referenceLabel: 'Referencia',
    retry: 'Reintentar',
    retryAccessibility: 'Reiniciar la interfaz de la aplicación',
  },
  it: {
    title: 'Si è verificato un errore nell’interfaccia MUDRIK',
    body: 'L’interfaccia dell’app può essere riavviata in modo sicuro.',
    referenceLabel: 'Riferimento',
    retry: 'Riprova',
    retryAccessibility: 'Riavvia l’interfaccia dell’app',
  },
  pt: {
    title: 'Ocorreu um erro na interface do MUDRIK',
    body: 'A interface da aplicação pode ser reiniciada com segurança.',
    referenceLabel: 'Referência',
    retry: 'Tentar novamente',
    retryAccessibility: 'Reiniciar a interface da aplicação',
  },
  ru: {
    title: 'В интерфейсе MUDRIK произошла ошибка',
    body: 'Интерфейс приложения можно безопасно перезапустить.',
    referenceLabel: 'Ссылка',
    retry: 'Повторить',
    retryAccessibility: 'Перезапустить интерфейс приложения',
  },
  nl: {
    title: 'Er is een fout opgetreden in de MUDRIK-interface',
    body: 'De app-interface kan veilig opnieuw worden gestart.',
    referenceLabel: 'Referentie',
    retry: 'Opnieuw proberen',
    retryAccessibility: 'App-interface opnieuw starten',
  },
  pl: {
    title: 'W interfejsie MUDRIK wystąpił błąd',
    body: 'Interfejs aplikacji można bezpiecznie uruchomić ponownie.',
    referenceLabel: 'Identyfikator',
    retry: 'Spróbuj ponownie',
    retryAccessibility: 'Uruchom ponownie interfejs aplikacji',
  },
  uk: {
    title: 'В інтерфейсі MUDRIK сталася помилка',
    body: 'Інтерфейс застосунку можна безпечно перезапустити.',
    referenceLabel: 'Ідентифікатор',
    retry: 'Спробувати ще раз',
    retryAccessibility: 'Перезапустити інтерфейс застосунку',
  },
} as const satisfies Record<
  AppLocale,
  EmergencyErrorCopy
>;
