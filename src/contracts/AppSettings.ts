export type ThemePreference =
  | 'system'
  | 'light'
  | 'dark';

export type LanguagePreference =
  | 'system'
  | 'ar'
  | 'de'
  | 'en';

export type AppSettings = {
  theme: ThemePreference;
  language: LanguagePreference;

  reducedMotion: boolean;
  hapticsEnabled: boolean;

  saveDrafts: boolean;
  autoPlayVoice: boolean;
  cellularUploads: boolean;

  diagnosticsEnabled: boolean;
};

export const DEFAULT_APP_SETTINGS:
  AppSettings = {
    theme: 'system',
    language: 'system',

    reducedMotion: false,
    hapticsEnabled: true,

    saveDrafts: true,
    autoPlayVoice: false,
    cellularUploads: true,

    diagnosticsEnabled: true,
  };
