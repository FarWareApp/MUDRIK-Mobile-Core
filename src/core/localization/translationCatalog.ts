import {
  AttachmentTranslationKey,
  attachmentTranslations,
} from './attachmentTranslations';
import {
  ChatTranslationKey,
  chatTranslations,
} from './chatTranslations';
import {
  ConversationTranslationKey,
  conversationTranslations,
} from './conversationTranslations';
import {
  RuntimeTranslationKey,
  runtimeTranslations,
} from './runtimeTranslations';
import {
  SettingsTranslationKey,
  settingsTranslations,
} from './settingsTranslations';
import {
  AppLocale,
  TranslationKey as BaseTranslationKey,
  translations,
} from './translations';
import {
  VoiceTranslationKey,
  voiceTranslations,
} from './voiceTranslations';

export type TranslationKey =
  | BaseTranslationKey
  | AttachmentTranslationKey
  | ChatTranslationKey
  | ConversationTranslationKey
  | RuntimeTranslationKey
  | SettingsTranslationKey
  | VoiceTranslationKey;

export const translationCatalog: Record<
  AppLocale,
  Record<TranslationKey, string>
> = {
  ar: {
    ...translations.ar,
    ...attachmentTranslations.ar,
    ...chatTranslations.ar,
    ...conversationTranslations.ar,
    ...runtimeTranslations.ar,
    ...settingsTranslations.ar,
    ...voiceTranslations.ar,
  },
  de: {
    ...translations.de,
    ...attachmentTranslations.de,
    ...chatTranslations.de,
    ...conversationTranslations.de,
    ...runtimeTranslations.de,
    ...settingsTranslations.de,
    ...voiceTranslations.de,
  },
  en: {
    ...translations.en,
    ...attachmentTranslations.en,
    ...chatTranslations.en,
    ...conversationTranslations.en,
    ...runtimeTranslations.en,
    ...settingsTranslations.en,
    ...voiceTranslations.en,
  },
};
