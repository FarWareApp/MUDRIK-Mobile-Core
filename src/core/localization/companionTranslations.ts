export const companionTranslations = {
  ar: {
    companionLoadFailed:
      'تعذر تحميل إعدادات الرفيق.',
    companionNameRequired:
      'يجب إدخال اسم للرفيق.',
    companionSaveFailed:
      'تعذر حفظ إعدادات الرفيق.',
    companionResetFailed:
      'تعذر إعادة ضبط إعدادات الرفيق.',
    companionSessionFailed:
      'حدث خطأ في جلسة الرفيق.',
    retryLoadingCompanion:
      'إعادة محاولة تحميل الرفيق',
    companionPhaseIdle:
      'جاهز',
    companionPhaseListening:
      'يستمع',
    companionPhaseProcessing:
      'يعالج',
    companionPhaseSpeaking:
      'يتحدث',
    companionPhasePaused:
      'متوقف مؤقتًا',
    companionPhaseInterrupted:
      'تمت المقاطعة',
    companionPhaseError:
      'حدث خطأ',
  },
  de: {
    companionLoadFailed:
      'Die Begleiter-Einstellungen konnten nicht geladen werden.',
    companionNameRequired:
      'Der Name des Begleiters darf nicht leer sein.',
    companionSaveFailed:
      'Die Begleiter-Einstellungen konnten nicht gespeichert werden.',
    companionResetFailed:
      'Die Begleiter-Einstellungen konnten nicht zurückgesetzt werden.',
    companionSessionFailed:
      'In der Begleiter-Sitzung ist ein Fehler aufgetreten.',
    retryLoadingCompanion:
      'Begleiter erneut laden',
    companionPhaseIdle:
      'Bereit',
    companionPhaseListening:
      'Hört zu',
    companionPhaseProcessing:
      'Verarbeitet',
    companionPhaseSpeaking:
      'Spricht',
    companionPhasePaused:
      'Pausiert',
    companionPhaseInterrupted:
      'Unterbrochen',
    companionPhaseError:
      'Fehler',
  },
  en: {
    companionLoadFailed:
      'Unable to load companion settings.',
    companionNameRequired:
      'Companion name cannot be empty.',
    companionSaveFailed:
      'Unable to save companion settings.',
    companionResetFailed:
      'Unable to reset companion settings.',
    companionSessionFailed:
      'The companion session encountered an error.',
    retryLoadingCompanion:
      'Retry loading companion',
    companionPhaseIdle:
      'Ready',
    companionPhaseListening:
      'Listening',
    companionPhaseProcessing:
      'Processing',
    companionPhaseSpeaking:
      'Speaking',
    companionPhasePaused:
      'Paused',
    companionPhaseInterrupted:
      'Interrupted',
    companionPhaseError:
      'Error',
  },
} as const;

export type CompanionTranslationKey =
  keyof typeof companionTranslations.en;
