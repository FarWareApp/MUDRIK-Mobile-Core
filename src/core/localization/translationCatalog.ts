import {
  AttachmentTranslationKey,
  attachmentTranslations,
} from './attachmentTranslations';
import {
  ChatTranslationKey,
  chatTranslations,
} from './chatTranslations';
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
    ...settingsTranslations.ar,
    ...voiceTranslations.ar,
  },
  de: {
    ...translations.de,
    ...attachmentTranslations.de,
    ...chatTranslations.de,
    ...settingsTranslations.de,
    ...voiceTranslations.de,
  },
  en: {
    ...translations.en,
    ...attachmentTranslations.en,
    ...chatTranslations.en,
    ...settingsTranslations.en,
    ...voiceTranslations.en,
  },
};
