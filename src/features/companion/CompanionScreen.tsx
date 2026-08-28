import React, {
  useState,
} from 'react';

import {
  ActivityIndicator,
  Pressable,
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
  CompanionRepository,
} from '../../contracts/CompanionRepository';

import {
  useTheme,
} from '../../design-system/theme/ThemeProvider';

import {
  CompanionAvatar,
} from './components/CompanionAvatar';

import {
  CompanionProfileEditorModal,
} from './components/CompanionProfileEditorModal';

import {
  CompanionSessionControls,
} from './components/CompanionSessionControls';

import {
  useCompanionProfileController,
} from './hooks/useCompanionProfileController';

import {
  useCompanionSessionController,
} from './hooks/useCompanionSessionController';

type Props = {
  repository:
    CompanionRepository;
};

export function CompanionScreen({
  repository,
}: Props) {
  const { colors } =
    useTheme();

  const [editing, setEditing] =
    useState(false);

  const profile =
    useCompanionProfileController(
      repository,
    );

  const session =
    useCompanionSessionController();

  if (profile.loading) {
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
            styles.circle,
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
            styles.headerTitle,
            {
              color:
                colors.textPrimary,
            },
          ]}
        >
          Companion
        </Text>

        <Pressable
          onPress={() =>
            setEditing(true)
          }
          style={[
            styles.circle,
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
            }}
          >
            ✎
          </Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        <CompanionAvatar
          name={
            profile.profile
              .displayName
          }
          presentation={
            profile.profile
              .presentation
          }
          phase={
            session.phase
          }
        />

        {profile.profile
          .showCaptions && (
          <View
            style={[
              styles.caption,
              {
                backgroundColor:
                  colors.surfaceElevated,
              },
            ]}
          >
            <Text
              style={{
                color:
                  colors.textSecondary,
                textAlign:
                  'center',
              }}
            >
              Companion session is ready.
              Intelligence and speech providers
              will connect later.
            </Text>
          </View>
        )}

        <View
          style={styles.controls}
        >
          <CompanionSessionControls
            phase={
              session.phase
            }
            onStart={
              session.start
            }
            onStop={
              session.stop
            }
            onPause={
              session.pause
            }
            onResume={
              session.resume
            }
            onInterrupt={
              session.interrupt
            }
            onRecover={
              session.recover
            }
          />
        </View>

        <Text
          style={[
            styles.preference,
            {
              color:
                colors.textSecondary,
            },
          ]}
        >
          {profile.profile
            .interactionStyle}
          {' · '}
          {profile.profile
            .voicePreference}
          {' voice'}
        </Text>
      </View>

      <CompanionProfileEditorModal
        visible={editing}
        profile={
          profile.profile
        }
        saving={
          profile.saving
        }
        onCancel={() =>
          setEditing(false)
        }
        onSave={(next) => {
          void (async () => {
            await profile.save(
              next,
            );

            setEditing(false);
          })();
        }}
      />
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,
    },

    header: {
      minHeight: 62,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
    },

    circle: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent:
        'center',
    },

    headerTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: 18,
      fontWeight: '700',
    },

    body: {
      flex: 1,
      alignItems: 'center',
      justifyContent:
        'center',
      paddingHorizontal: 24,
      paddingBottom: 50,
    },

    caption: {
      maxWidth: 360,
      marginTop: 28,
      borderRadius: 18,
      paddingHorizontal: 18,
      paddingVertical: 14,
    },

    controls: {
      marginTop: 28,
    },

    preference: {
      marginTop: 20,
      fontSize: 12,
      textTransform:
        'capitalize',
    },

    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent:
        'center',
    },
  });
