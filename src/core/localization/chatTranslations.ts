export const chatTranslations = {
  ar: {
    quickActions: 'الإجراءات السريعة',
    closeQuickActions: 'إغلاق الإجراءات السريعة',
    addAttachment: 'إضافة مرفق',
    chooseAttachmentSource: 'اختر مصدر المرفق',
    addingAttachment: 'جارٍ إضافة المرفق…',
    responseInProgress: 'جارٍ تجهيز الرد',
    attachmentUnavailable: 'المرفق غير متاح',
    unavailableOnThisDevice: 'غير متاح على هذا الجهاز',
  },

  de: {
    quickActions: 'Schnellaktionen',
    closeQuickActions: 'Schnellaktionen schließen',
    addAttachment: 'Anhang hinzufügen',
    chooseAttachmentSource: 'Quelle für den Anhang auswählen',
    addingAttachment: 'Anhang wird hinzugefügt…',
    responseInProgress: 'Antwort wird vorbereitet',
    attachmentUnavailable: 'Anhang nicht verfügbar',
    unavailableOnThisDevice: 'Auf diesem Gerät nicht verfügbar',
  },

  en: {
    quickActions: 'Quick actions',
    closeQuickActions: 'Close quick actions',
    addAttachment: 'Add attachment',
    chooseAttachmentSource: 'Choose an attachment source',
    addingAttachment: 'Adding attachment…',
    responseInProgress: 'Response in progress',
    attachmentUnavailable: 'Attachment unavailable',
    unavailableOnThisDevice: 'Unavailable on this device',
  },
} as const;

export type ChatTranslationKey =
  keyof typeof chatTranslations.en;
