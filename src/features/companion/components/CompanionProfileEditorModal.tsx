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

import type {
  CompanionInteractionStyle,
  CompanionPersonalityPreset,
  CompanionPresenceLevel,
  CompanionPresentation,
  CompanionProfile,
  CompanionVoicePreference,
} from '../../../contracts/Companion';

import {
  useTheme,
} from '../../../design-system/theme/ThemeProvider';

type Props = {
  visible: boolean;
  profile: CompanionProfile;
  saving: boolean;
  onCancel: () => void;
  onSave: (
    profile: CompanionProfile,
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
      onRequestClose={onCancel}
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
                opacity:
                  saving
                    ? 0.5
                    : 1,
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
          keyboardShouldPersistTaps="handled"
        >
          <ToggleRow
            title="Companion enabled"
            description="Turn the companion presentation layer on or off."
            value={draft.enabled}
            onChange={(enabled) =>
              setDraft(
                (current) => ({
                  ...current,
                  enabled,
                }),
              )
            }
          />

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
              ['female', 'Female'],
            ]}
            onChange={(presentation) =>
              setDraft(
                (current) => ({
                  ...current,
                  presentation:
                    presentation as CompanionPresentation,
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
              ['female', 'Female'],
            ]}
            onChange={(voicePreference) =>
              setDraft(
                (current) => ({
                  ...current,
                  voicePreference:
                    voicePreference as CompanionVoicePreference,
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
              ['balanced', 'Balanced'],
              ['warm', 'Warm'],
              ['calm', 'Calm'],
              ['direct', 'Direct'],
            ]}
            onChange={(interactionStyle) =>
              setDraft(
                (current) => ({
                  ...current,
                  interactionStyle:
                    interactionStyle as CompanionInteractionStyle,
                }),
              )
            }
          />

          <OptionGroup
            title="Personality preset"
            value={
              draft.personalityPreset
            }
            options={[
              ['balanced', 'Balanced'],
              ['professional', 'Professional'],
              ['calm', 'Calm'],
              ['friendly', 'Friendly'],
              ['minimal', 'Minimal'],
              ['coach', 'Coach'],
              ['study_partner', 'Study'],
              ['creative_partner', 'Creative'],
            ]}
            onChange={(personalityPreset) =>
              setDraft(
                (current) => ({
                  ...current,
                  personalityPreset:
                    personalityPreset as CompanionPersonalityPreset,
                }),
              )
            }
          />

          <OptionGroup
            title="Presence level"
            value={
              draft.presenceLevel
            }
            options={[
              ['silent', 'Silent'],
              ['normal', 'Normal'],
              ['helpful', 'Helpful'],
              ['active', 'Active'],
            ]}
            onChange={(presenceLevel) =>
              setDraft(
                (current) => ({
                  ...current,
                  presenceLevel:
                    presenceLevel as CompanionPresenceLevel,
                }),
              )
            }
          />

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
              Personality dimensions
            </Text>

            <DimensionStepper
              label="Warmth"
              value={draft.warmth}
              onChange={(warmth) =>
                setDraft(
                  (current) => ({
                    ...current,
                    warmth,
                  }),
                )
              }
            />

            <DimensionStepper
              label="Directness"
              value={draft.directness}
              onChange={(directness) =>
                setDraft(
                  (current) => ({
                    ...current,
                    directness,
                  }),
                )
              }
            />

            <DimensionStepper
              label="Humor"
              value={draft.humor}
              onChange={(humor) =>
                setDraft(
                  (current) => ({
                    ...current,
                    humor,
                  }),
                )
              }
            />

            <DimensionStepper
              label="Initiative"
              value={draft.initiative}
              onChange={(initiative) =>
                setDraft(
                  (current) => ({
                    ...current,
                    initiative,
                  }),
                )
              }
            />

            <DimensionStepper
              label="Verbosity"
              value={draft.verbosity}
              onChange={(verbosity) =>
                setDraft(
                  (current) => ({
                    ...current,
                    verbosity,
                  }),
                )
              }
            />
          </View>

          <RateStepper
            value={draft.speakingRate}
            onChange={(speakingRate) =>
              setDraft(
                (current) => ({
                  ...current,
                  speakingRate,
                }),
              )
            }
          />

          <ToggleRow
            title="Captions"
            description="Show conversation captions."
            value={draft.showCaptions}
            onChange={(showCaptions) =>
              setDraft(
                (current) => ({
                  ...current,
                  showCaptions,
                }),
              )
            }
          />
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
      readonly [string, string]
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

      <View style={styles.options}>
        {options.map(
          ([key, label]) => {
            const selected =
              value === key;

            return (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityState={{
                  selected,
                }}
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

type ToggleRowProps = {
  title: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
};

function ToggleRow({
  title,
  description,
  value,
  onChange,
}: ToggleRowProps) {
  const { colors } =
    useTheme();

  return (
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
          {title}
        </Text>

        <Text
          style={{
            color:
              colors.textSecondary,
            marginTop: 3,
            fontSize: 12,
          }}
        >
          {description}
        </Text>
      </View>

      <Switch
        value={value}
        onValueChange={onChange}
      />
    </View>
  );
}

type DimensionStepperProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
};

function DimensionStepper({
  label,
  value,
  onChange,
}: DimensionStepperProps) {
  return (
    <NumericStepper
      label={label}
      value={value}
      minimum={0}
      maximum={100}
      step={5}
      displayValue={`${value}`}
      onChange={onChange}
    />
  );
}

type RateStepperProps = {
  value: number;
  onChange: (value: number) => void;
};

function RateStepper({
  value,
  onChange,
}: RateStepperProps) {
  return (
    <View style={styles.group}>
      <NumericStepper
        label="Speaking rate"
        value={value}
        minimum={0.5}
        maximum={2}
        step={0.1}
        displayValue={`${value.toFixed(1)}×`}
        onChange={(next) =>
          onChange(
            Number(next.toFixed(1)),
          )
        }
      />
    </View>
  );
}

type NumericStepperProps = {
  label: string;
  value: number;
  minimum: number;
  maximum: number;
  step: number;
  displayValue: string;
  onChange: (value: number) => void;
};

function NumericStepper({
  label,
  value,
  minimum,
  maximum,
  step,
  displayValue,
  onChange,
}: NumericStepperProps) {
  const { colors } =
    useTheme();

  const decrease =
    Math.max(
      minimum,
      value - step,
    );

  const increase =
    Math.min(
      maximum,
      value + step,
    );

  return (
    <View
      style={[
        styles.stepperRow,
        {
          borderColor:
            colors.border,
        },
      ]}
    >
      <Text
        style={[
          styles.stepperLabel,
          {
            color:
              colors.textPrimary,
          },
        ]}
      >
        {label}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Decrease ${label}`}
        disabled={value <= minimum}
        onPress={() =>
          onChange(decrease)
        }
        style={[
          styles.stepperButton,
          {
            backgroundColor:
              colors.surfaceElevated,
            opacity:
              value <= minimum
                ? 0.4
                : 1,
          },
        ]}
      >
        <Text
          style={{
            color:
              colors.textPrimary,
            fontSize: 18,
          }}
        >
          −
        </Text>
      </Pressable>

      <Text
        style={[
          styles.stepperValue,
          {
            color:
              colors.textSecondary,
          },
        ]}
      >
        {displayValue}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Increase ${label}`}
        disabled={value >= maximum}
        onPress={() =>
          onChange(increase)
        }
        style={[
          styles.stepperButton,
          {
            backgroundColor:
              colors.surfaceElevated,
            opacity:
              value >= maximum
                ? 0.4
                : 1,
          },
        ]}
      >
        <Text
          style={{
            color:
              colors.textPrimary,
            fontSize: 18,
          }}
        >
          +
        </Text>
      </Pressable>
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
      marginTop: 20,
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
      marginTop: 18,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
    },

    stepperRow: {
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: 1,
    },

    stepperLabel: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
    },

    stepperButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
    },

    stepperValue: {
      minWidth: 54,
      textAlign: 'center',
      fontVariant: [
        'tabular-nums',
      ],
    },
  });
