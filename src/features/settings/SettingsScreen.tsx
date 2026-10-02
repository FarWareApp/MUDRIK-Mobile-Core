import React from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';

import type {
  LanguagePreference,
  ThemePreference,
} from '../../contracts/AppSettings';
import type {
  PermissionService,
} from '../../contracts/PermissionService';
import type {
  PermissionSettingsService,
} from '../../contracts/PermissionSettingsService';
import { useLocale } from '../../core/localization/LocaleProvider';
import { useAppSettings } from '../../core/settings/AppSettingsProvider';
import { FlagshipSafeAreaScreen } from '../../design-system/components/FlagshipSafeAreaScreen';
import { spacing } from '../../design-system/tokens/spacing';
import { InlineErrorBanner } from '../../shared/components/InlineErrorBanner';

import { getPermissionErrorTranslationKey } from '../permissions/getPermissionErrorTranslationKey';
import { usePermissionController } from '../permissions/hooks/usePermissionController';
import { useRefreshPermissionsOnForeground } from '../permissions/hooks/useRefreshPermissionsOnForeground';
import { ResetSettingsButton } from './components/ResetSettingsButton';
import { SettingOptionGroup } from './components/SettingOptionGroup';
import { SettingToggleRow } from './components/SettingToggleRow';
import { SettingsNavigationRow } from './components/SettingsNavigationRow';
import { SettingsPermissionList } from './components/SettingsPermissionList';
import { SettingsScreenHeader } from './components/SettingsScreenHeader';
import { SettingsScreenState } from './components/SettingsScreenState';
import { SettingsSectionCard } from './components/SettingsSectionCard';
import { SettingsSystemOverview } from './components/SettingsSystemOverview';
import { SettingsSectionTitle } from './components/SettingsSectionTitle';
import { getSettingsErrorTranslationKey } from './getSettingsErrorTranslationKey';

type Props = {
  permissionService: PermissionService;
  permissionSettingsService: PermissionSettingsService;
};

export function SettingsScreen({
  permissionService,
  permissionSettingsService,
}: Props) {
  const { t } = useLocale();
  const settings = useAppSettings();
  const permissions = usePermissionController(
    permissionService,
    permissionSettingsService,
  );

  useRefreshPermissionsOnForeground(
    permissions.refresh,
  );

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

  const mutableDisabled =
    settings.busy ||
    permissions.requestingId !== null ||
    permissions.openingSettingsId !== null;

  const confirmReset = () => {
    if (mutableDisabled) {
      return;
    }

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
    <FlagshipSafeAreaScreen
      quiet
      style={styles.safeArea}
    >
      <SettingsScreenHeader />

      {settings.loading ? (
        <SettingsScreenState />
      ) : (
        <>
          {settings.error ? (
            <InlineErrorBanner
              message={t(
                getSettingsErrorTranslationKey(
                  settings.error,
                ),
              )}
              onRetry={
                settings.error === 'load'
                  ? () => {
                      void settings.reload();
                    }
                  : undefined
              }
              onDismiss={settings.dismissError}
            />
          ) : null}

          {permissions.errorCode ? (
            <InlineErrorBanner
              message={t(
                getPermissionErrorTranslationKey(
                  permissions.errorCode,
                ),
              )}
              onRetry={
                permissions.errorCode === 'load'
                  ? () => {
                      void permissions.refresh();
                    }
                  : undefined
              }
              onDismiss={permissions.dismissError}
            />
          ) : null}

          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <SettingsSystemOverview
              permissions={permissions.permissions}
              permissionsLoading={permissions.loading}
              diagnosticsEnabled={
                settings.settings.diagnosticsEnabled
              }
            />

            <SettingsSectionTitle
              title={t('settingsCapabilitiesSection')}
            />

            <SettingsSectionCard>
              <SettingsNavigationRow
                title={t('settingsCapabilitiesTitle')}
                description={t('settingsCapabilitiesDescription')}
                accessibilityLabel={t('openCapabilities')}
                onPress={() => router.push('/capabilities')}
              />
            </SettingsSectionCard>

            <SettingsSectionTitle title={t('settingsAppSection')} />

            <SettingsSectionCard>
              <SettingOptionGroup
                label={t('theme')}
                value={settings.settings.theme}
                options={themeOptions}
                disabled={mutableDisabled}
                onChange={(value) => {
                  void settings.update('theme', value);
                }}
              />

              <SettingOptionGroup
                label={t('language')}
                value={settings.settings.language}
                options={languageOptions}
                disabled={mutableDisabled}
                onChange={(value) => {
                  void settings.update('language', value);
                }}
              />
            </SettingsSectionCard>

            <SettingsSectionTitle title={t('settingsExperienceSection')} />

            <SettingsSectionCard>
              <SettingToggleRow
                label={t('saveTextDrafts')}
                description={t('saveTextDraftsDescription')}
                value={settings.settings.saveDrafts}
                disabled={mutableDisabled}
                onChange={(value) => {
                  void settings.update('saveDrafts', value);
                }}
              />

              <SettingToggleRow
                label={t('autoPlayVoice')}
                description={t('autoPlayVoiceDescription')}
                value={settings.settings.autoPlayVoice}
                disabled={mutableDisabled}
                onChange={(value) => {
                  void settings.update('autoPlayVoice', value);
                }}
              />

              <SettingToggleRow
                label={t('cellularUploads')}
                description={t('cellularUploadsDescription')}
                value={settings.settings.cellularUploads}
                disabled={mutableDisabled}
                onChange={(value) => {
                  void settings.update('cellularUploads', value);
                }}
              />
            </SettingsSectionCard>

            <SettingsSectionTitle title={t('settingsAccessibilitySection')} />

            <SettingsSectionCard>
              <SettingToggleRow
                label={t('reducedMotion')}
                value={settings.settings.reducedMotion}
                disabled={mutableDisabled}
                onChange={(value) => {
                  void settings.update('reducedMotion', value);
                }}
              />

              <SettingToggleRow
                label={t('haptics')}
                value={settings.settings.hapticsEnabled}
                disabled={mutableDisabled}
                onChange={(value) => {
                  void settings.update('hapticsEnabled', value);
                }}
              />
            </SettingsSectionCard>

            <SettingsSectionTitle title={t('settingsPrivacyDiagnosticsSection')} />

            <SettingsSectionCard>
              <SettingToggleRow
                label={t('diagnostics')}
                description={t('diagnosticsDescription')}
                value={settings.settings.diagnosticsEnabled}
                disabled={mutableDisabled}
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
            </SettingsSectionCard>

            <SettingsSectionTitle title={t('settingsPermissionsSection')} />

            <SettingsSectionCard>
              <SettingsPermissionList
                loading={permissions.loading}
                disabled={settings.busy}
                requestingId={permissions.requestingId}
                openingSettingsId={permissions.openingSettingsId}
                permissions={permissions.permissions}
                onRequest={(permissionId) => {
                  void permissions.request(permissionId);
                }}
                onOpenSettings={(permissionId) => {
                  void permissions.openSettings(permissionId);
                }}
              />
            </SettingsSectionCard>

            <ResetSettingsButton
              disabled={mutableDisabled}
              onPress={confirmReset}
            />
          </ScrollView>
        </>
      )}
    </FlagshipSafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.huge,
  },
});
