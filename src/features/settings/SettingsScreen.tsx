import React from 'react';

import {
  ActivityIndicator,
  Alert,
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
          <Text
            style={[
              styles.loadingText,
              {
                color:
                  colors.textSecondary,
              },
            ]}
          >
            Loading settings…
          </Text>
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
          accessibilityRole="button"
          accessibilityLabel="Back"
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
          accessibilityRole="header"
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

      {settings.error && (
        <View
          accessibilityRole="alert"
          style={[
            styles.errorBanner,
            {
              backgroundColor:
                colors.surface,
              borderColor:
                colors.error,
            },
          ]}
        >
          <Text
            style={[
              styles.errorText,
              {
                color: colors.textPrimary,
              },
            ]}
          >
            {settings.error}
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reload settings"
            onPress={() => {
              void settings.reload();
            }}
            style={styles.errorAction}
          >
            <Text
              style={{
                color: colors.accent,
                fontWeight: '700',
              }}
            >
              Retry
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss settings error"
            onPress={
              settings.dismissError
            }
            style={styles.errorAction}
          >
            <Text
              style={{
                color:
                  colors.textSecondary,
                fontSize: 18,
              }}
            >
              ×
            </Text>
          </Pressable>
        </View>
      )}

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
          label="Save text drafts"
          description="Keep unfinished message text between app sessions. Turning this off removes persisted text drafts."
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
          description="Used by the voice-response pipeline when voice responses are available."
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
          description="Controls production media uploads over mobile data when a server transport is connected."
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

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open core health and diagnostics"
          onPress={() => {
            router.push(
              '/diagnostics',
            );
          }}
          style={[
            styles.navigationRow,
            {
              borderBottomColor:
                colors.border,
            },
          ]}
        >
          <View style={styles.navigationText}>
            <Text
              style={[
                styles.navigationTitle,
                {
                  color:
                    colors.textPrimary,
                },
              ]}
            >
              Core health & diagnostics
            </Text>
            <Text
              style={[
                styles.navigationDescription,
                {
                  color:
                    colors.textSecondary,
                },
              ]}
            >
              Review core status, local logs and safe storage maintenance.
            </Text>
          </View>

          <Text
            style={{
              color:
                colors.textSecondary,
              fontSize: 22,
            }}
          >
            ›
          </Text>
        </Pressable>

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
          accessibilityRole="button"
          accessibilityLabel="Reset application settings"
          onPress={() => {
            Alert.alert(
              'Reset settings?',
              'This restores application preferences to their defaults. Conversations, projects and files are not deleted.',
              [
                {
                  text: 'Cancel',
                  style: 'cancel',
                },
                {
                  text: 'Reset',
                  style: 'destructive',
                  onPress: () => {
                    void settings.reset();
                  },
                },
              ],
            );
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
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },

  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    width: 44,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: 10,
    fontSize: 13,
  },

  errorBanner: {
    marginHorizontal: 14,
    marginBottom: 6,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },

  errorText: {
    flex: 1,
    fontSize: 12,
  },

  errorAction: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
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

  navigationRow: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  navigationText: {
    flex: 1,
    paddingRight: 12,
  },

  navigationTitle: {
    fontSize: 15,
    fontWeight: '600',
  },

  navigationDescription: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
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
