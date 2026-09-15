import {
  AttachmentTranslationKey,
  attachmentTranslations,
} from './attachmentTranslations';
import {
  ChatTranslationKey,
  chatTranslations,
} from './chatTranslations';
import {
  CompanionTranslationKey,
  companionTranslations,
} from './companionTranslations';
import {
  ConversationTranslationKey,
  conversationTranslations,
} from './conversationTranslations';
import {
  ProjectTranslationKey,
  projectTranslations,
} from './projectTranslations';
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
  | CompanionTranslationKey
  | ConversationTranslationKey
  | ProjectTranslationKey
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
    ...companionTranslations.ar,
    ...conversationTranslations.ar,
    ...projectTranslations.ar,
    ...runtimeTranslations.ar,
    ...settingsTranslations.ar,
    ...voiceTranslations.ar,
  },
  de: {
    ...translations.de,
    ...attachmentTranslations.de,
    ...chatTranslations.de,
    ...companionTranslations.de,
    ...conversationTranslations.de,
    ...projectTranslations.de,
    ...runtimeTranslations.de,
    ...settingsTranslations.de,
    ...voiceTranslations.de,
  },
  en: {
    ...translations.en,
    ...attachmentTranslations.en,
    ...chatTranslations.en,
    ...companionTranslations.en,
    ...conversationTranslations.en,
    ...projectTranslations.en,
    ...runtimeTranslations.en,
    ...settingsTranslations.en,
    ...voiceTranslations.en,
  },
};
