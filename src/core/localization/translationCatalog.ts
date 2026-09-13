import {
  ChatTranslationKey,
  chatTranslations,
} from './chatTranslations';
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
  | VoiceTranslationKey;

export const translationCatalog: Record<
  AppLocale,
  Record<TranslationKey, string>
> = {
  ar: {
    ...translations.ar,
    ...chatTranslations.ar,
    ...voiceTranslations.ar,
  },
  de: {
    ...translations.de,
    ...chatTranslations.de,
    ...voiceTranslations.de,
  },
  en: {
    ...translations.en,
    ...chatTranslations.en,
    ...voiceTranslations.en,
  },
};
