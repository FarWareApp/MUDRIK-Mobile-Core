export const chatTranslations = {
  ar: {
    quickActions: 'الإجراءات السريعة',
    closeQuickActions: 'إغلاق الإجراءات السريعة',
    addAttachment: 'إضافة مرفق',
    chooseAttachmentSource: 'اختر مصدر المرفق',
    addingAttachment: 'جارٍ إضافة المرفق…',
  },

  de: {
    quickActions: 'Schnellaktionen',
    closeQuickActions: 'Schnellaktionen schließen',
    addAttachment: 'Anhang hinzufügen',
    chooseAttachmentSource: 'Quelle für den Anhang auswählen',
    addingAttachment: 'Anhang wird hinzugefügt…',
  },

  en: {
    quickActions: 'Quick actions',
    closeQuickActions: 'Close quick actions',
    addAttachment: 'Add attachment',
    chooseAttachmentSource: 'Choose an attachment source',
    addingAttachment: 'Adding attachment…',
  },
} as const;

export type ChatTranslationKey =
  keyof typeof chatTranslations.en;
