import React, {
  useEffect,
  useState,
} from 'react';

import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  CompanionInteractionStyle,
  CompanionPresentation,
  CompanionProfile,
  CompanionVoicePreference,
} from '../../../contracts/Companion';

import {
  useTheme,
} from '../../../design-system/theme/ThemeProvider';

type Props = {
  visible: boolean;

  profile:
    CompanionProfile;

  saving: boolean;

  onCancel: () => void;

  onSave: (
    profile:
      CompanionProfile,
  ) => void;
};

export function CompanionProfileEditorModal({
  visible,
  profile,
  saving,
  onCancel,
  onSave,
}: Props) {
  const { colors } =
    useTheme();

  const [draft, setDraft] =
    useState(profile);

  useEffect(() => {
    if (visible) {
      setDraft(profile);
    }
  }, [
    profile,
    visible,
  ]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={
        onCancel
      }
    >
      <View
        style={[
          styles.screen,
          {
            backgroundColor:
              colors.background,
          },
        ]}
      >
        <View style={styles.header}>
          <Pressable
            onPress={onCancel}
          >
            <Text
              style={{
                color:
                  colors.textSecondary,
              }}
            >
              Cancel
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
            Companion
          </Text>

          <Pressable
            disabled={saving}
            onPress={() =>
              onSave(draft)
            }
          >
            <Text
              style={{
                color:
                  colors.accent,
                fontWeight: '700',
              }}
            >
              Save
            </Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={
            styles.content
          }
        >
          <TextInput
            value={
              draft.displayName
            }
            onChangeText={(
              displayName,
            ) =>
              setDraft(
                (current) => ({
                  ...current,
                  displayName,
                }),
              )
            }
            placeholder="Name"
            placeholderTextColor={
              colors.textSecondary
            }
            maxLength={60}
            style={[
              styles.input,
              {
                color:
                  colors.textPrimary,
                borderColor:
                  colors.border,
              },
            ]}
          />

          <OptionGroup
            title="Presentation"
            value={
              draft.presentation
            }
            options={[
              ['male', 'Male'],
              [
                'female',
                'Female',
              ],
            ]}
            onChange={(
              presentation,
            ) =>
              setDraft(
                (current) => ({
                  ...current,
                  presentation:
                    presentation as
                      CompanionPresentation,
                }),
              )
            }
          />

          <OptionGroup
            title="Voice preference"
            value={
              draft.voicePreference
            }
            options={[
              ['auto', 'Auto'],
              ['male', 'Male'],
              [
                'female',
                'Female',
              ],
            ]}
            onChange={(
              voicePreference,
            ) =>
              setDraft(
                (current) => ({
                  ...current,
                  voicePreference:
                    voicePreference as
                      CompanionVoicePreference,
                }),
              )
            }
          />

          <OptionGroup
            title="Interaction style"
            value={
              draft.interactionStyle
            }
            options={[
              [
                'balanced',
                'Balanced',
              ],
              ['warm', 'Warm'],
              ['calm', 'Calm'],
              ['direct', 'Direct'],
            ]}
            onChange={(
              interactionStyle,
            ) =>
              setDraft(
                (current) => ({
                  ...current,
                  interactionStyle:
                    interactionStyle as
                      CompanionInteractionStyle,
                }),
              )
            }
          />

          <View
            style={[
              styles.switchRow,
              {
                borderColor:
                  colors.border,
              },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color:
                    colors.textPrimary,
                  fontWeight: '600',
                }}
              >
                Captions
              </Text>

              <Text
                style={{
                  color:
                    colors.textSecondary,
                  marginTop: 3,
                  fontSize: 12,
                }}
              >
                Show conversation captions.
              </Text>
            </View>

            <Switch
              value={
                draft.showCaptions
              }
              onValueChange={(
                showCaptions,
              ) =>
                setDraft(
                  (current) => ({
                    ...current,
                    showCaptions,
                  }),
                )
              }
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

type OptionGroupProps = {
  title: string;
  value: string;

  options:
    readonly (
      readonly [
        string,
        string,
      ]
    )[];

  onChange:
    (value: string) => void;
};

function OptionGroup({
  title,
  value,
  options,
  onChange,
}: OptionGroupProps) {
  const { colors } =
    useTheme();

  return (
    <View style={styles.group}>
      <Text
        style={[
          styles.groupTitle,
          {
            color:
              colors.textSecondary,
          },
        ]}
      >
        {title}
      </Text>

      <View
        style={styles.options}
      >
        {options.map(
          ([key, label]) => {
            const selected =
              value === key;

            return (
              <Pressable
                key={key}
                onPress={() =>
                  onChange(key)
                }
                style={[
                  styles.option,
                  {
                    backgroundColor:
                      selected
                        ? colors.accent
                        : colors.surfaceElevated,
                  },
                ]}
              >
                <Text
                  style={{
                    color:
                      selected
                        ? colors.accentText
                        : colors.textPrimary,
                    fontWeight:
                      selected
                        ? '700'
                        : '500',
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            );
          },
        )}
      </View>
    </View>
  );
}

const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
    },

    header: {
      minHeight: 64,
      paddingHorizontal: 18,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
    },

    title: {
      fontSize: 18,
      fontWeight: '700',
    },

    content: {
      padding: 18,
      paddingBottom: 50,
    },

    input: {
      minHeight: 48,
      borderWidth: 1,
      borderRadius: 14,
      paddingHorizontal: 14,
      fontSize: 15,
    },

    group: {
      marginTop: 24,
    },

    groupTitle: {
      marginBottom: 9,
      fontSize: 12,
      fontWeight: '700',
      textTransform:
        'uppercase',
    },

    options: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },

    option: {
      minHeight: 42,
      borderRadius: 21,
      justifyContent:
        'center',
      paddingHorizontal: 17,
    },

    switchRow: {
      minHeight: 70,
      marginTop: 26,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
    },
  });
