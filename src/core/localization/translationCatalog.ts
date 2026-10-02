import {
  AttachmentTranslationKey,
  attachmentTranslations,
} from './attachmentTranslations';
import {
  betaTranslationOverlays,
} from './betaTranslationOverlays';
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
import type {
  AppLocale,
} from './AppLocale';
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

type TranslationCatalog =
  Record<TranslationKey, string>;

const englishCatalog:
  TranslationCatalog = {
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
  };

const arabicCatalog:
  TranslationCatalog = {
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
  };

const germanCatalog:
  TranslationCatalog = {
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
  };

type BetaLocale = Exclude<
  AppLocale,
  'ar' | 'de' | 'en'
>;

function buildBetaCatalog(
  locale: BetaLocale,
): TranslationCatalog {
  return {
    ...englishCatalog,
    ...betaTranslationOverlays[locale],
  };
}

export const translationCatalog:
  Readonly<Record<
    AppLocale,
    TranslationCatalog
  >> = {
    ar: arabicCatalog,
    de: germanCatalog,
    en: englishCatalog,
    tr: buildBetaCatalog('tr'),
    fr: buildBetaCatalog('fr'),
    es: buildBetaCatalog('es'),
    it: buildBetaCatalog('it'),
    pt: buildBetaCatalog('pt'),
    ru: buildBetaCatalog('ru'),
  };
