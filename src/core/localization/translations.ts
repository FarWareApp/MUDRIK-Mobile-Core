export type AppLocale = 'ar' | 'de' | 'en';

export const translations = {
  ar: {
    chatTitle: 'MUDRIK',
    newConversation: 'محادثة جديدة',
    composerPlaceholder: 'اكتب رسالة...',
    conversations: 'المحادثات',
    projects: 'المشاريع',
    companion: 'الرفيق',
    settings: 'الإعدادات',
    emptyChatTitle: 'كيف يمكنني مساعدتك؟',
    emptyChatBody: 'ابدأ محادثة جديدة.',
    back: 'رجوع',
    foundationReady: 'أساس هذا القسم جاهز.',
    restoringConversation: 'جارٍ استعادة المحادثة…',
    restoreConversationFailed:
      'تعذر استعادة المحادثة المحلية.',
    retry: 'إعادة المحاولة',

    searchConversations: 'البحث في المحادثات',
    activeConversations: 'الحالية',
    archivedConversations: 'المؤرشفة',
    noConversations: 'لا توجد محادثات.',
    loadingConversations: 'جارٍ تحميل المحادثات…',
    conversationHistoryFailed:
      'تعذر تحميل سجل المحادثات.',
    deleteConversation: 'حذف المحادثة',
    deleteConversationMessage:
      'هل تريد حذف هذه المحادثة نهائيًا؟',
    cancel: 'إلغاء',
    delete: 'حذف',
  },

  de: {
    chatTitle: 'MUDRIK',
    newConversation: 'Neue Unterhaltung',
    composerPlaceholder: 'Nachricht schreiben...',
    conversations: 'Unterhaltungen',
    projects: 'Projekte',
    companion: 'Begleiter',
    settings: 'Einstellungen',
    emptyChatTitle: 'Wie kann ich helfen?',
    emptyChatBody: 'Starte eine neue Unterhaltung.',
    back: 'Zurück',
    foundationReady:
      'Die Grundlage dieses Bereichs ist bereit.',
    restoringConversation:
      'Unterhaltung wird wiederhergestellt…',
    restoreConversationFailed:
      'Die lokale Unterhaltung konnte nicht wiederhergestellt werden.',
    retry: 'Erneut versuchen',

    searchConversations: 'Unterhaltungen durchsuchen',
    activeConversations: 'Aktiv',
    archivedConversations: 'Archiviert',
    noConversations: 'Keine Unterhaltungen vorhanden.',
    loadingConversations:
      'Unterhaltungen werden geladen…',
    conversationHistoryFailed:
      'Unterhaltungsverlauf konnte nicht geladen werden.',
    deleteConversation: 'Unterhaltung löschen',
    deleteConversationMessage:
      'Diese Unterhaltung endgültig löschen?',
    cancel: 'Abbrechen',
    delete: 'Löschen',
  },

  en: {
    chatTitle: 'MUDRIK',
    newConversation: 'New conversation',
    composerPlaceholder: 'Write a message...',
    conversations: 'Conversations',
    projects: 'Projects',
    companion: 'Companion',
    settings: 'Settings',
    emptyChatTitle: 'How can I help?',
    emptyChatBody: 'Start a new conversation.',
    back: 'Back',
    foundationReady:
      'This section foundation is ready.',
    restoringConversation:
      'Restoring conversation…',
    restoreConversationFailed:
      'The local conversation could not be restored.',
    retry: 'Retry',

    searchConversations: 'Search conversations',
    activeConversations: 'Active',
    archivedConversations: 'Archived',
    noConversations: 'No conversations.',
    loadingConversations:
      'Loading conversations…',
    conversationHistoryFailed:
      'Conversation history could not be loaded.',
    deleteConversation: 'Delete conversation',
    deleteConversationMessage:
      'Delete this conversation permanently?',
    cancel: 'Cancel',
    delete: 'Delete',
  },
} as const;

export type TranslationKey =
  keyof typeof translations.en;
