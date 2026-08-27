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
    foundationReady: 'Die Grundlage dieses Bereichs ist bereit.',
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
    foundationReady: 'This section foundation is ready.',
  },
} as const;

export type TranslationKey = keyof typeof translations.en;
