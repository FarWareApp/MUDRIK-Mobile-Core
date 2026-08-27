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
  },
} as const;

export type TranslationKey =
  keyof typeof translations.en;
