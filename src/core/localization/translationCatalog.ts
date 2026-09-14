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
  | ChatTranslationKey
  | SettingsTranslationKey
  | VoiceTranslationKey;

export const translationCatalog: Record<
  AppLocale,
  Record<TranslationKey, string>
> = {
  ar: {
    ...translations.ar,
    ...chatTranslations.ar,
    ...settingsTranslations.ar,
    ...voiceTranslations.ar,
  },
  de: {
    ...translations.de,
    ...chatTranslations.de,
    ...settingsTranslations.de,
    ...voiceTranslations.de,
  },
  en: {
    ...translations.en,
    ...chatTranslations.en,
    ...settingsTranslations.en,
    ...voiceTranslations.en,
  },
};
