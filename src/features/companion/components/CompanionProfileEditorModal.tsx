import React, {
  useEffect,
  useState,
} from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
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
import { useAccessibility } from '../../../core/accessibility/AccessibilityProvider';
import { useLocale } from '../../../core/localization/LocaleProvider';
import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { radius } from '../../../design-system/tokens/radius';
import { spacing } from '../../../design-system/tokens/spacing';
import { typeScale } from '../../../design-system/tokens/typography';
import { InlineErrorBanner } from '../../../shared/components/InlineErrorBanner';

import { CompanionEditorHeader } from './CompanionEditorHeader';
import { CompanionNumericStepper } from './CompanionNumericStepper';
import { CompanionOptionGroup } from './CompanionOptionGroup';
import { CompanionResetControl } from './CompanionResetControl';
import { CompanionToggleRow } from './CompanionToggleRow';

type Props = {
  visible: boolean;
  profile: CompanionProfile;
  saving: boolean;
  errorMessage?: string | null;
  onCancel: () => void;
  onSave: (profile: CompanionProfile) => void;
  onReset: () => void;
};

export function CompanionProfileEditorModal({
  visible,
  profile,
  saving,
  errorMessage = null,
  onCancel,
  onSave,
  onReset,
}: Props) {
  const { colors, mode } = useTheme();
  const { reducedMotion } = useAccessibility();
  const { t } = useLocale();
  const [draft, setDraft] = useState(profile);

  useEffect(() => {
    if (visible) {
      setDraft(profile);
    }
  }, [profile, visible]);

  const presentationOptions: readonly (
    readonly [CompanionPresentation, string]
  )[] = [
    ['male', t('companionPresentationMale')],
    ['female', t('companionPresentationFemale')],
  ];

  const voiceOptions: readonly (
    readonly [CompanionVoicePreference, string]
  )[] = [
    ['auto', t('companionVoiceAuto')],
    ['male', t('companionVoiceMale')],
    ['female', t('companionVoiceFemale')],
  ];

  const interactionOptions: readonly (
    readonly [CompanionInteractionStyle, string]
  )[] = [
    ['balanced', t('companionStyleBalanced')],
    ['warm', t('companionStyleWarm')],
    ['calm', t('companionStyleCalm')],
    ['direct', t('companionStyleDirect')],
  ];

  const personalityOptions: readonly (
    readonly [CompanionPersonalityPreset, string]
  )[] = [
    ['balanced', t('companionPersonalityBalanced')],
    ['professional', t('companionPersonalityProfessional')],
    ['calm', t('companionPersonalityCalm')],
    ['friendly', t('companionPersonalityFriendly')],
    ['minimal', t('companionPersonalityMinimal')],
    ['coach', t('companionPersonalityCoach')],
    ['study_partner', t('companionPersonalityStudy')],
    ['creative_partner', t('companionPersonalityCreative')],
  ];

  const presenceOptions: readonly (
    readonly [CompanionPresenceLevel, string]
  )[] = [
    ['silent', t('companionPresenceSilent')],
    ['normal', t('companionPresenceNormal')],
    ['helpful', t('companionPresenceHelpful')],
    ['active', t('companionPresenceActive')],
  ];

  return (
    <Modal
      visible={visible}
      animationType={reducedMotion ? 'none' : 'slide'}
      onRequestClose={saving ? () => undefined : onCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[
          styles.screen,
          { backgroundColor: colors.background },
        ]}
      >
        <CompanionEditorHeader
          saving={saving}
          onCancel={onCancel}
          onSave={() => onSave(draft)}
        />

        {errorMessage ? (
          <InlineErrorBanner
            message={errorMessage}
          />
        ) : null}

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <CompanionToggleRow
            title={t('companionEnabled')}
            description={t('companionEnabledDescription')}
            value={draft.enabled}
            disabled={saving}
            onChange={(enabled) =>
              setDraft((current) => ({
                ...current,
                enabled,
              }))
            }
          />

          <TextInput
            accessibilityLabel={t('companionName')}
            accessibilityState={{ disabled: saving }}
            value={draft.displayName}
            onChangeText={(displayName) =>
              setDraft((current) => ({
                ...current,
                displayName,
              }))
            }
            editable={!saving}
            keyboardAppearance={mode}
            placeholder={t('companionName')}
            placeholderTextColor={colors.textSecondary}
            maxLength={60}
            returnKeyType="done"
            style={[
              styles.input,
              {
                color: colors.textPrimary,
                borderColor: colors.border,
                backgroundColor: colors.surfaceInput,
              },
            ]}
          />

          <CompanionOptionGroup
            title={t('companionPresentation')}
            value={draft.presentation}
            options={presentationOptions}
            disabled={saving}
            onChange={(presentation) =>
              setDraft((current) => ({
                ...current,
                presentation,
              }))
            }
          />

          <CompanionOptionGroup
            title={t('companionVoicePreference')}
            value={draft.voicePreference}
            options={voiceOptions}
            disabled={saving}
            onChange={(voicePreference) =>
              setDraft((current) => ({
                ...current,
                voicePreference,
              }))
            }
          />

          <CompanionOptionGroup
            title={t('companionInteractionStyle')}
            value={draft.interactionStyle}
            options={interactionOptions}
            disabled={saving}
            onChange={(interactionStyle) =>
              setDraft((current) => ({
                ...current,
                interactionStyle,
              }))
            }
          />

          <CompanionOptionGroup
            title={t('companionPersonalityPreset')}
            value={draft.personalityPreset}
            options={personalityOptions}
            disabled={saving}
            onChange={(personalityPreset) =>
              setDraft((current) => ({
                ...current,
                personalityPreset,
              }))
            }
          />

          <CompanionOptionGroup
            title={t('companionPresenceLevel')}
            value={draft.presenceLevel}
            options={presenceOptions}
            disabled={saving}
            onChange={(presenceLevel) =>
              setDraft((current) => ({
                ...current,
                presenceLevel,
              }))
            }
          />

          <View style={styles.group}>
            <Text
              style={[
                styles.groupTitle,
                { color: colors.textSecondary },
              ]}
            >
              {t('companionPersonalityDimensions')}
            </Text>

            <CompanionNumericStepper
              label={t('companionDimensionWarmth')}
              value={draft.warmth}
              minimum={0}
              maximum={100}
              step={5}
              displayValue={`${draft.warmth}`}
              disabled={saving}
              onChange={(warmth) =>
                setDraft((current) => ({
                  ...current,
                  warmth,
                }))
              }
            />

            <CompanionNumericStepper
              label={t('companionDimensionDirectness')}
              value={draft.directness}
              minimum={0}
              maximum={100}
              step={5}
              displayValue={`${draft.directness}`}
              disabled={saving}
              onChange={(directness) =>
                setDraft((current) => ({
                  ...current,
                  directness,
                }))
              }
            />

            <CompanionNumericStepper
              label={t('companionDimensionHumor')}
              value={draft.humor}
              minimum={0}
              maximum={100}
              step={5}
              displayValue={`${draft.humor}`}
              disabled={saving}
              onChange={(humor) =>
                setDraft((current) => ({
                  ...current,
                  humor,
                }))
              }
            />

            <CompanionNumericStepper
              label={t('companionDimensionInitiative')}
              value={draft.initiative}
              minimum={0}
              maximum={100}
              step={5}
              displayValue={`${draft.initiative}`}
              disabled={saving}
              onChange={(initiative) =>
                setDraft((current) => ({
                  ...current,
                  initiative,
                }))
              }
            />

            <CompanionNumericStepper
              label={t('companionDimensionVerbosity')}
              value={draft.verbosity}
              minimum={0}
              maximum={100}
              step={5}
              displayValue={`${draft.verbosity}`}
              disabled={saving}
              onChange={(verbosity) =>
                setDraft((current) => ({
                  ...current,
                  verbosity,
                }))
              }
            />
          </View>

          <View style={styles.group}>
            <CompanionNumericStepper
              label={t('companionSpeakingRate')}
              value={draft.speakingRate}
              minimum={0.5}
              maximum={2}
              step={0.1}
              displayValue={`${draft.speakingRate.toFixed(1)}×`}
              disabled={saving}
              onChange={(next) =>
                setDraft((current) => ({
                  ...current,
                  speakingRate: Number(next.toFixed(1)),
                }))
              }
            />
          </View>

          <View style={styles.group}>
            <CompanionToggleRow
              title={t('companionCaptions')}
              description={t('companionCaptionsDescription')}
              value={draft.showCaptions}
              disabled={saving}
              onChange={(showCaptions) =>
                setDraft((current) => ({
                  ...current,
                  showCaptions,
                }))
              }
            />
          </View>

          <CompanionResetControl
            active={visible}
            disabled={saving}
            onReset={onReset}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.huge,
  },
  input: {
    ...typeScale.input,
    minHeight: 48,
    marginTop: spacing.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    textAlign: 'auto',
    writingDirection: 'auto',
  },
  group: {
    marginTop: spacing.xl,
  },
  groupTitle: {
    ...typeScale.caption,
    marginBottom: spacing.sm,
    fontWeight: '700',
    writingDirection: 'auto',
  },
});
