import React from 'react';

import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  router,
} from 'expo-router';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  PermissionService,
} from '../../contracts/PermissionService';

import {
  useTheme,
} from '../../design-system/theme/ThemeProvider';

import {
  useAppSettings,
} from '../../core/settings/AppSettingsProvider';

import {
  LanguagePreference,
  ThemePreference,
} from '../../contracts/AppSettings';

import {
  usePermissionController,
} from '../permissions/hooks/usePermissionController';

import {
  PermissionRow,
} from './components/PermissionRow';

import {
  SettingToggleRow,
} from './components/SettingToggleRow';

import {
  SettingOptionGroup,
} from './components/SettingOptionGroup';

type Props = {
  permissionService:
    PermissionService;
};

export function SettingsScreen({
  permissionService,
}: Props) {
  const { colors } = useTheme();

  const settings =
    useAppSettings();

  const permissions =
    usePermissionController(
      permissionService,
    );

  if (settings.loading) {
    return (
      <SafeAreaView
        style={[
          styles.safeArea,
          {
            backgroundColor:
              colors.background,
          },
        ]}
      >
        <View style={styles.center}>
          <ActivityIndicator
            color={colors.accent}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor:
            colors.background,
        },
      ]}
    >
      <View style={styles.header}>
        <Pressable
          onPress={() =>
            router.back()
          }
          style={[
            styles.back,
            {
              backgroundColor:
                colors.surfaceElevated,
            },
          ]}
        >
          <Text
            style={{
              color:
                colors.textPrimary,
              fontSize: 24,
            }}
          >
            ‹
          </Text>
        </Pressable>

        <Text
          style={[
            styles.title,
            {
              color:
                colors.textPrimary,
            },
          ]}
        >
          Settings
        </Text>

        <View style={styles.spacer} />
      </View>

      <ScrollView>
        <SectionTitle
          title="App"
        />

        <SettingOptionGroup
          label="Theme"
          value={
            settings.settings.theme
          }
          options={[
            {
              value: 'system',
              label: 'System',
            },
            {
              value: 'light',
              label: 'Light',
            },
            {
              value: 'dark',
              label: 'Dark',
            },
          ]}
          onChange={(value) => {
            void settings.update(
              'theme',
              value as ThemePreference,
            );
          }}
        />

        <SettingOptionGroup
          label="Language"
          value={
            settings.settings.language
          }
          options={[
            {
              value: 'system',
              label: 'System',
            },
            {
              value: 'ar',
              label: 'العربية',
            },
            {
              value: 'de',
              label: 'Deutsch',
            },
            {
              value: 'en',
              label: 'English',
            },
          ]}
          onChange={(value) => {
            void settings.update(
              'language',
              value as LanguagePreference,
            );
          }}
        />

        <SettingToggleRow
          label="Save drafts"
          description="Keep unfinished text and attachments locally."
          value={
            settings.settings.saveDrafts
          }
          onChange={(value) => {
            void settings.update(
              'saveDrafts',
              value,
            );
          }}
        />

        <SettingToggleRow
          label="Auto-play voice"
          description="Automatically play voice responses when available."
          value={
            settings.settings
              .autoPlayVoice
          }
          onChange={(value) => {
            void settings.update(
              'autoPlayVoice',
              value,
            );
          }}
        />

        <SettingToggleRow
          label="Cellular uploads"
          description="Allow media uploads while using mobile data."
          value={
            settings.settings
              .cellularUploads
          }
          onChange={(value) => {
            void settings.update(
              'cellularUploads',
              value,
            );
          }}
        />

        <SectionTitle
          title="Accessibility"
        />

        <SettingToggleRow
          label="Reduced motion"
          value={
            settings.settings
              .reducedMotion
          }
          onChange={(value) => {
            void settings.update(
              'reducedMotion',
              value,
            );
          }}
        />

        <SettingToggleRow
          label="Haptics"
          value={
            settings.settings
              .hapticsEnabled
          }
          onChange={(value) => {
            void settings.update(
              'hapticsEnabled',
              value,
            );
          }}
        />

        <SectionTitle
          title="Privacy & diagnostics"
        />

        <SettingToggleRow
          label="Diagnostics"
          description="Keep local diagnostic information for troubleshooting."
          value={
            settings.settings
              .diagnosticsEnabled
          }
          onChange={(value) => {
            void settings.update(
              'diagnosticsEnabled',
              value,
            );
          }}
        />

        <SectionTitle
          title="Permissions"
        />

        {permissions.loading ? (
          <ActivityIndicator
            style={styles.loader}
            color={colors.accent}
          />
        ) : (
          permissions.permissions.map(
            (permission) => (
              <PermissionRow
                key={permission.id}
                permission={
                  permission
                }
                onRequest={() => {
                  void permissions
                    .request(
                      permission.id,
                    );
                }}
              />
            ),
          )
        )}

        <Pressable
          onPress={() => {
            void settings.reset();
          }}
          style={[
            styles.reset,
            {
              borderColor:
                colors.border,
            },
          ]}
        >
          <Text
            style={{
              color:
                colors.textPrimary,
            }}
          >
            Reset settings
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionTitle({
  title,
}: {
  title: string;
}) {
  const { colors } = useTheme();

  return (
    <Text
      style={[
        styles.sectionTitle,
        {
          color:
            colors.textSecondary,
        },
      ]}
    >
      {title}
    </Text>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  header: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },

  back: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
  },

  spacer: {
    width: 42,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionTitle: {
    marginTop: 24,
    marginBottom: 7,
    paddingHorizontal: 18,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },

  loader: {
    margin: 24,
  },

  reset: {
    alignSelf: 'center',
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 22,
    justifyContent: 'center',
    paddingHorizontal: 22,
    marginTop: 30,
    marginBottom: 36,
  },
});
