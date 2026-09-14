import React from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import type {
  LanguagePreference,
  ThemePreference,
} from '../../contracts/AppSettings';
import type {
  PermissionService,
} from '../../contracts/PermissionService';
import { useLocale } from '../../core/localization/LocaleProvider';
import { useAppSettings } from '../../core/settings/AppSettingsProvider';
import { useTheme } from '../../design-system/theme/ThemeProvider';
import { spacing } from '../../design-system/tokens/spacing';
import { InlineErrorBanner } from '../../shared/components/InlineErrorBanner';

import { usePermissionController } from '../permissions/hooks/usePermissionController';
import { ResetSettingsButton } from './components/ResetSettingsButton';
import { SettingOptionGroup } from './components/SettingOptionGroup';
import { SettingToggleRow } from './components/SettingToggleRow';
import { SettingsNavigationRow } from './components/SettingsNavigationRow';
import { SettingsPermissionList } from './components/SettingsPermissionList';
import { SettingsScreenHeader } from './components/SettingsScreenHeader';
import { SettingsScreenState } from './components/SettingsScreenState';
import { SettingsSectionTitle } from './components/SettingsSectionTitle';
import { getSettingsErrorTranslationKey } from './getSettingsErrorTranslationKey';

type Props = {
  permissionService: PermissionService;
};

export function SettingsScreen({
  permissionService,
}: Props) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const settings = useAppSettings();
  const permissions = usePermissionController(permissionService);

  const themeOptions: readonly {
    value: ThemePreference;
    label: string;
  }[] = [
    { value: 'system', label: t('themeSystem') },
    { value: 'light', label: t('themeLight') },
    { value: 'dark', label: t('themeDark') },
  ];

  const languageOptions: readonly {
    value: LanguagePreference;
    label: string;
  }[] = [
    { value: 'system', label: t('languageSystem') },
    { value: 'ar', label: 'العربية' },
    { value: 'de', label: 'Deutsch' },
    { value: 'en', label: 'English' },
  ];

  if (settings.loading) {
    return (
      <SafeAreaView
        style={[
          styles.safeArea,
          { backgroundColor: colors.background },
        ]}
      >
        <SettingsScreenState />
      </SafeAreaView>
    );
  }

  const confirmReset = () => {
    Alert.alert(
      t('resetSettingsTitle'),
      t('resetSettingsMessage'),
      [
        {
          text: t('cancel'),
          style: 'cancel',
        },
        {
          text: t('reset'),
          style: 'destructive',
          onPress: () => {
            void settings.reset();
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: colors.background },
      ]}
    >
      <SettingsScreenHeader />

      {settings.error ? (
        <InlineErrorBanner
          message={t(
            getSettingsErrorTranslationKey(
              settings.error,
            ),
          )}
          onRetry={() => {
            void settings.reload();
          }}
          onDismiss={settings.dismissError}
        />
      ) : null}

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <SettingsSectionTitle title={t('settingsAppSection')} />

        <SettingOptionGroup
          label={t('theme')}
          value={settings.settings.theme}
          options={themeOptions}
          onChange={(value) => {
            void settings.update('theme', value);
          }}
        />

        <SettingOptionGroup
          label={t('language')}
          value={settings.settings.language}
          options={languageOptions}
          onChange={(value) => {
            void settings.update('language', value);
          }}
        />

        <SettingToggleRow
          label={t('saveTextDrafts')}
          description={t('saveTextDraftsDescription')}
          value={settings.settings.saveDrafts}
          onChange={(value) => {
            void settings.update('saveDrafts', value);
          }}
        />

        <SettingToggleRow
          label={t('autoPlayVoice')}
          description={t('autoPlayVoiceDescription')}
          value={settings.settings.autoPlayVoice}
          onChange={(value) => {
            void settings.update('autoPlayVoice', value);
          }}
        />

        <SettingToggleRow
          label={t('cellularUploads')}
          description={t('cellularUploadsDescription')}
          value={settings.settings.cellularUploads}
          onChange={(value) => {
            void settings.update('cellularUploads', value);
          }}
        />

        <SettingsSectionTitle title={t('settingsAccessibilitySection')} />

        <SettingToggleRow
          label={t('reducedMotion')}
          value={settings.settings.reducedMotion}
          onChange={(value) => {
            void settings.update('reducedMotion', value);
          }}
        />

        <SettingToggleRow
          label={t('haptics')}
          value={settings.settings.hapticsEnabled}
          onChange={(value) => {
            void settings.update('hapticsEnabled', value);
          }}
        />

        <SettingsSectionTitle title={t('settingsPrivacyDiagnosticsSection')} />

        <SettingToggleRow
          label={t('diagnostics')}
          description={t('diagnosticsDescription')}
          value={settings.settings.diagnosticsEnabled}
          onChange={(value) => {
            void settings.update('diagnosticsEnabled', value);
          }}
        />

        <SettingsNavigationRow
          title={t('coreHealthDiagnostics')}
          description={t('coreHealthDiagnosticsDescription')}
          accessibilityLabel={t('openCoreHealthDiagnostics')}
          onPress={() => router.push('/diagnostics')}
        />

        <SettingsSectionTitle title={t('settingsPermissionsSection')} />

        <SettingsPermissionList
          loading={permissions.loading}
          permissions={permissions.permissions}
          onRequest={(permissionId) => {
            void permissions.request(permissionId);
          }}
        />

        <ResetSettingsButton onPress={confirmReset} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    paddingBottom: spacing.md,
  },
});
