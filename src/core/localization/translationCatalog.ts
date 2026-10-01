import {
  AttachmentTranslationKey,
  attachmentTranslations,
} from './attachmentTranslations';
import {
  ChatTranslationKey,
  chatTranslations,
} from './chatTranslations';
import {
  CapabilityTranslationKey,
  capabilityTranslations,
} from './capabilityTranslations';
import {
  CompanionTranslationKey,
  companionTranslations,
} from './companionTranslations';
import {
  ConversationTranslationKey,
  conversationTranslations,
} from './conversationTranslations';
import {
  PermissionTranslationKey,
  permissionTranslations,
} from './permissionTranslations';
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
  | CapabilityTranslationKey
  | CompanionTranslationKey
  | ConversationTranslationKey
  | PermissionTranslationKey
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
    ...capabilityTranslations.ar,
    ...companionTranslations.ar,
    ...conversationTranslations.ar,
    ...permissionTranslations.ar,
    ...projectTranslations.ar,
    ...runtimeTranslations.ar,
    ...settingsTranslations.ar,
    ...voiceTranslations.ar,
  },
  de: {
    ...translations.de,
    ...attachmentTranslations.de,
    ...chatTranslations.de,
    ...capabilityTranslations.de,
    ...companionTranslations.de,
    ...conversationTranslations.de,
    ...permissionTranslations.de,
    ...projectTranslations.de,
    ...runtimeTranslations.de,
    ...settingsTranslations.de,
    ...voiceTranslations.de,
  },
  en: {
    ...translations.en,
    ...attachmentTranslations.en,
    ...chatTranslations.en,
    ...capabilityTranslations.en,
    ...companionTranslations.en,
    ...conversationTranslations.en,
    ...permissionTranslations.en,
    ...projectTranslations.en,
    ...runtimeTranslations.en,
    ...settingsTranslations.en,
    ...voiceTranslations.en,
  },
};
