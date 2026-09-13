import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const screen = fs.readFileSync(
  'src/features/settings/SettingsScreen.tsx',
  'utf8',
);
const optionGroup = fs.readFileSync(
  'src/features/settings/components/SettingOptionGroup.tsx',
  'utf8',
);
const permissionRow = fs.readFileSync(
  'src/features/settings/components/PermissionRow.tsx',
  'utf8',
);
const toggleRow = fs.readFileSync(
  'src/features/settings/components/SettingToggleRow.tsx',
  'utf8',
);
const errorBanner = fs.readFileSync(
  'src/shared/components/InlineErrorBanner.tsx',
  'utf8',
);
const translations = fs.readFileSync(
  'src/core/localization/translations.ts',
  'utf8',
);

function countTranslationKey(key) {
  const pattern = new RegExp(
    `^\\s*${key}:\\s`,
    'gm',
  );

  return translations.match(pattern)?.length ?? 0;
}

test(
  'settings screen delegates focused presentation responsibilities',
  () => {
    for (const component of [
      'SettingsScreenHeader',
      'SettingsScreenState',
      'SettingsSectionTitle',
      'SettingsNavigationRow',
      'SettingsPermissionList',
      'ResetSettingsButton',
    ]) {
      assert.match(screen, new RegExp(component));
    }

    assert.match(screen, /InlineErrorBanner/);
    assert.doesNotMatch(screen, /\bPressable\b/);
    assert.doesNotMatch(screen, /ActivityIndicator/);
    assert.doesNotMatch(screen, /function SectionTitle/);
  },
);

test(
  'settings option and permission actions meet accessible target contract',
  () => {
    assert.match(optionGroup, /minHeight:\s*44/);
    assert.match(optionGroup, /accessibilityState=\{\{ selected, disabled \}\}/);
    assert.match(permissionRow, /minHeight:\s*44/);
    assert.match(permissionRow, /useLocale/);
    assert.match(toggleRow, /accessibilityLabel=\{label\}/);
    assert.match(errorBanner, /useLocale/);
  },
);

test(
  'settings UI localization keys exist in all locale tables',
  () => {
    for (const key of [
      'dismissError',
      'loadingSettings',
      'settingsAppSection',
      'theme',
      'themeSystem',
      'themeLight',
      'themeDark',
      'language',
      'languageSystem',
      'saveTextDrafts',
      'saveTextDraftsDescription',
      'autoPlayVoice',
      'autoPlayVoiceDescription',
      'cellularUploads',
      'cellularUploadsDescription',
      'settingsAccessibilitySection',
      'reducedMotion',
      'haptics',
      'settingsPrivacyDiagnosticsSection',
      'diagnostics',
      'diagnosticsDescription',
      'coreHealthDiagnostics',
      'coreHealthDiagnosticsDescription',
      'openCoreHealthDiagnostics',
      'settingsPermissionsSection',
      'permissionMicrophone',
      'permissionCamera',
      'permissionMediaLibrary',
      'permissionNotifications',
      'permissionStatusUnknown',
      'permissionStatusGranted',
      'permissionStatusDenied',
      'allowPermission',
      'resetSettings',
      'resetSettingsTitle',
      'resetSettingsMessage',
      'reset',
    ]) {
      assert.equal(
        countTranslationKey(key),
        3,
        `${key} must exist in ar, de and en`,
      );
    }
  },
);
