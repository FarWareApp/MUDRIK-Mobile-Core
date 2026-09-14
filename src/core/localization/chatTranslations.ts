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
    messageSendFailed: 'تعذر إكمال إرسال الرسالة.',
    messageSaveFailed: 'تعذر حفظ الرسالة محليًا.',
    messageLength: 'طول الرسالة',
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
    messageSendFailed: 'Die Nachricht konnte nicht vollständig gesendet werden.',
    messageSaveFailed: 'Die Nachricht konnte nicht lokal gespeichert werden.',
    messageLength: 'Nachrichtenlänge',
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
    messageSendFailed: 'Unable to complete the message.',
    messageSaveFailed: 'Unable to save the message locally.',
    messageLength: 'Message length',
  },
} as const;

export type ChatTranslationKey =
  keyof typeof chatTranslations.en;
