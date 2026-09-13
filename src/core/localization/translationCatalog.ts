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
  | VoiceTranslationKey;

export const translationCatalog: Record<
  AppLocale,
  Record<TranslationKey, string>
> = {
  ar: {
    ...translations.ar,
    ...voiceTranslations.ar,
  },
  de: {
    ...translations.de,
    ...voiceTranslations.de,
  },
  en: {
    ...translations.en,
    ...voiceTranslations.en,
  },
};
