export const conversationTranslations = {
  ar: {
    conversationCreateFailed:
      'تعذر إنشاء المحادثة.',
    conversationPinUpdateFailed:
      'تعذر تحديث حالة تثبيت المحادثة.',
    conversationArchiveUpdateFailed:
      'تعذر تحديث حالة أرشفة المحادثة.',
    conversationDeleteFailed:
      'تعذر حذف المحادثة.',
    noConversationSearchResults:
      'لا توجد محادثات تطابق البحث.',
  },
  de: {
    conversationCreateFailed:
      'Die Unterhaltung konnte nicht erstellt werden.',
    conversationPinUpdateFailed:
      'Der Anheftstatus der Unterhaltung konnte nicht aktualisiert werden.',
    conversationArchiveUpdateFailed:
      'Der Archivstatus der Unterhaltung konnte nicht aktualisiert werden.',
    conversationDeleteFailed:
      'Die Unterhaltung konnte nicht gelöscht werden.',
    noConversationSearchResults:
      'Keine Unterhaltungen entsprechen der Suche.',
  },
  en: {
    conversationCreateFailed:
      'Unable to create conversation.',
    conversationPinUpdateFailed:
      'Unable to update the conversation pin state.',
    conversationArchiveUpdateFailed:
      'Unable to update the conversation archive state.',
    conversationDeleteFailed:
      'Unable to delete conversation.',
    noConversationSearchResults:
      'No conversations match the search.',
  },
} as const;

export type ConversationTranslationKey =
  keyof typeof conversationTranslations.en;
