import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const screen = fs.readFileSync(
  'src/features/companion/CompanionScreen.tsx',
  'utf8',
);
const screenHeader = fs.readFileSync(
  'src/features/companion/components/CompanionScreenHeader.tsx',
  'utf8',
);
const flagshipIconButton = fs.readFileSync(
  'src/design-system/components/FlagshipIconButton.tsx',
  'utf8',
);
const avatar = fs.readFileSync(
  'src/features/companion/components/CompanionAvatar.tsx',
  'utf8',
);
const avatarMark = fs.readFileSync(
  'src/features/companion/components/CompanionAvatarMark.tsx',
  'utf8',
);
const editor = fs.readFileSync(
  'src/features/companion/components/CompanionProfileEditorModal.tsx',
  'utf8',
);
const editorHeader = fs.readFileSync(
  'src/features/companion/components/CompanionEditorHeader.tsx',
  'utf8',
);
const editorSection = fs.readFileSync(
  'src/features/companion/components/CompanionEditorSection.tsx',
  'utf8',
);
const controls = fs.readFileSync(
  'src/features/companion/components/CompanionSessionControls.tsx',
  'utf8',
);
const flagshipAction = fs.readFileSync(
  'src/design-system/components/FlagshipActionButton.tsx',
  'utf8',
);
const optionGroup = fs.readFileSync(
  'src/features/companion/components/CompanionOptionGroup.tsx',
  'utf8',
);
const stepper = fs.readFileSync(
  'src/features/companion/components/CompanionNumericStepper.tsx',
  'utf8',
);
const stepperIcon = fs.readFileSync(
  'src/features/companion/components/CompanionStepperIcon.tsx',
  'utf8',
);
const toggle = fs.readFileSync(
  'src/features/companion/components/CompanionToggleRow.tsx',
  'utf8',
);
const resetControl = fs.readFileSync(
  'src/features/companion/components/CompanionResetControl.tsx',
  'utf8',
);
const screenState = fs.readFileSync(
  'src/features/companion/components/CompanionScreenState.tsx',
  'utf8',
);
const caption = fs.readFileSync(
  'src/features/companion/components/CompanionCaptionCard.tsx',
  'utf8',
);
const summary = fs.readFileSync(
  'src/features/companion/components/CompanionPreferenceSummary.tsx',
  'utf8',
);
const translations = fs.readFileSync(
  'src/core/localization/translations.ts',
  'utf8',
);
const companionTranslations = fs.readFileSync(
  'src/core/localization/companionTranslations.ts',
  'utf8',
);

function countKey(source, key) {
  const pattern = new RegExp(
    `^\\s*${key}:\\s`,
    'gm',
  );

  return source.match(pattern)?.length ?? 0;
}

test(
  'companion screen is orchestration-only and handles failure without raw alerts',
  () => {
    for (const component of [
      'CompanionScreenHeader',
      'CompanionScreenState',
      'CompanionAvatar',
      'CompanionCaptionCard',
      'CompanionPreferenceSummary',
      'CompanionSessionControls',
      'CompanionProfileEditorModal',
    ]) {
      assert.match(screen, new RegExp(component));
    }

    assert.match(screen, /ScrollView/);
    assert.match(screen, /profile\.failed/);
    assert.match(screen, /profile\.reload/);
    assert.match(screen, /getCompanionProfileErrorTranslationKey/);
    assert.match(screen, /errorMessage=\{profileErrorMessage\}/);
    assert.doesNotMatch(screen, /\bAlert\b/);
    assert.doesNotMatch(screen, /\bPressable\b/);
    assert.doesNotMatch(screen, /ActivityIndicator/);
    assert.doesNotMatch(screen, /Unable to /);
  },
);

test(
  'companion header delegates stable RTL-aware controls to the flagship button primitive',
  () => {
    assert.match(screenHeader, /FlagshipIconButton/);
    assert.match(screenHeader, /CompanionBackIcon/);
    assert.match(screenHeader, /CompanionEditIcon/);
    assert.match(screenHeader, /isRTL/);
    assert.match(screenHeader, /typeScale\.heading/);
    assert.doesNotMatch(screenHeader, /[‹✎]/u);

    assert.match(flagshipIconButton, /size = 44/);
    assert.match(flagshipIconButton, /motion\.press/);
    assert.match(flagshipIconButton, /subtleScale/);
    assert.match(flagshipIconButton, /accessibilityRole="button"/);
  },
);

test(
  'companion avatar is glyph-free, localized and accessibility-aware',
  () => {
    assert.match(avatar, /CompanionAvatarMark/);
    assert.match(avatar, /getCompanionPhaseTranslationKey/);
    assert.match(avatar, /accessibilityLiveRegion="polite"/);
    assert.match(avatar, /typeScale\.title/);
    assert.match(avatar, /typeScale\.caption/);
    assert.match(avatar, /PremiumHeroSurface/);
    assert.match(avatar, /companionStudioEyebrow/);
    assert.match(avatar, /companionPresenceTitle/);
    assert.match(avatar, /phase === 'speaking'/);
    assert.match(avatar, /phase === 'listening'/);
    assert.match(avatar, /phase === 'processing'/);
    assert.doesNotMatch(avatar, /Math\.random/);
    assert.doesNotMatch(avatar, /[♀♂]/u);
    assert.doesNotMatch(avatar, /\{phase\}/);

    assert.doesNotMatch(avatarMark, /\bText\b/);
    assert.match(avatarMark, /presentation === 'female'/);
  },
);

test(
  'companion editor freezes every mutable control while persistence is in flight',
  () => {
    assert.match(editor, /useAccessibility/);
    assert.match(editor, /keyboardAppearance=\{mode\}/);
    assert.match(editor, /writingDirection:\s*'auto'/);
    assert.match(editor, /textAlign:\s*'auto'/);
    assert.match(editor, /reducedMotion \? 'none' : 'slide'/);
    assert.match(editor, /Platform\.OS === 'ios' \? 'padding' : 'height'/);
    assert.match(editor, /onRequestClose=\{saving \? \(\) => undefined : onCancel\}/);
    assert.match(editor, /errorMessage \?/);
    assert.match(editor, /InlineErrorBanner/);
    assert.match(editor, /typeScale\.input/);

    const disabledBindings =
      editor.match(/disabled=\{saving\}/g)?.length ?? 0;
    assert.ok(
      disabledBindings >= 8,
      'option groups, steppers and toggles must be locked while saving',
    );

    assert.match(editorHeader, /accessibilityState=\{\{ disabled: saving \}\}/);
    assert.match(editorHeader, /busy:\s*saving/);
    assert.match(editorHeader, /ActivityIndicator/);
    assert.match(editor, /CompanionResetControl/);
    assert.match(editor, /CompanionEditorSection/);
    assert.match(screen, /onReset=\{\(\) =>/);
  },
);

test(
  'companion profile editor is organized as a persistent profile studio without dropping advanced controls',
  () => {
    assert.ok(
      (editor.match(/<CompanionEditorSection/g) ?? []).length >= 4,
    );
    for (const key of [
      'companionEditorIdentityTitle',
      'companionEditorBehaviorTitle',
      'companionEditorPersonalityTitle',
      'companionEditorVoiceTitle',
    ]) {
      assert.match(editor, new RegExp(key));
    }

    for (const field of [
      'draft.enabled',
      'draft.displayName',
      'draft.presentation',
      'draft.voicePreference',
      'draft.interactionStyle',
      'draft.personalityPreset',
      'draft.presenceLevel',
      'draft.warmth',
      'draft.directness',
      'draft.humor',
      'draft.initiative',
      'draft.verbosity',
      'draft.speakingRate',
      'draft.showCaptions',
    ]) {
      assert.match(
        editor,
        new RegExp(field.replace('.', '\\.')),
      );
    }

    assert.match(editorSection, /InsetSurfaceCard/);
    assert.match(editorSection, /accessibilityRole="header"/);
    assert.match(editorSection, /maxWidth:\s*560/);
  },
);

test(
  'companion reset requires explicit confirmation and remains disabled during persistence',
  () => {
    assert.match(resetControl, /useState\(false\)/);
    assert.match(resetControl, /setConfirming\(true\)/);
    assert.match(resetControl, /confirmCompanionReset/);
    assert.match(resetControl, /cancelCompanionReset/);
    assert.match(resetControl, /disabled=\{disabled\}/);
    assert.match(resetControl, /accessibilityRole="button"/);
    assert.match(resetControl, /minHeight:\s*44/);
    assert.match(resetControl, /!active \|\| disabled/);
    assert.match(resetControl, /onReset\(\);/);
  },
);

test(
  'companion controls use semantic roles, stable primitives and minimum touch targets',
  () => {
    assert.match(controls, /FlagshipActionButton/);
    assert.match(flagshipAction, /useAccessibility/);
    assert.match(
      flagshipAction,
      /motion\.press[\s\S]*?\.subtleScale/,
    );
    assert.match(flagshipAction, /minHeight:\s*52/);
    assert.match(flagshipAction, /accessibilityRole="button"/);
    assert.match(controls, /const canPause/);
    assert.match(controls, /phase === 'listening'/);
    assert.match(controls, /phase === 'speaking'/);
    assert.doesNotMatch(controls, /PropsWithChildren/);

    assert.match(optionGroup, /accessibilityRole="radiogroup"/);
    assert.match(optionGroup, /accessibilityRole="radio"/);
    assert.match(optionGroup, /disabled=\{disabled\}/);
    assert.match(optionGroup, /minHeight:\s*44/);
    assert.match(optionGroup, /writingDirection:\s*'auto'/);

    assert.match(stepper, /CompanionStepperIcon/);
    assert.match(stepper, /disabled=\{decreaseDisabled\}/);
    assert.match(stepper, /disabled=\{increaseDisabled\}/);
    assert.match(stepper, /width:\s*44/);
    assert.match(stepper, /height:\s*44/);
    assert.doesNotMatch(stepper, />\s*[+−]\s*</u);
    assert.doesNotMatch(stepperIcon, /\bText\b/);

    assert.match(toggle, /paddingEnd:\s*spacing\.md/);
    assert.doesNotMatch(toggle, /paddingRight/);
  },
);

test(
  'companion state, caption and preference summary support long localized content',
  () => {
    assert.match(screenState, /mode:\s*'loading' \| 'error'/);
    assert.match(screenState, /accessibilityRole="progressbar"/);
    assert.match(screenState, /accessibilityLiveRegion/);
    assert.match(screenState, /minHeight:\s*44/);

    assert.match(caption, /typeScale\.secondary/);
    assert.match(caption, /writingDirection:\s*'auto'/);
    assert.match(summary, /InsetSurfaceCard/);
    assert.match(summary, /companionSessionProfileTitle/);
    assert.match(summary, /companionInteractionStyle/);
    assert.match(summary, /companionPresenceLevel/);
    assert.match(summary, /companionVoicePreference/);
    assert.match(summary, /flexWrap:\s*'wrap'/);
    assert.match(summary, /typeScale\.caption/);
    assert.match(summary, /writingDirection:\s*'auto'/);
    assert.doesNotMatch(summary, /Math\.random/);
    assert.doesNotMatch(summary, / · /);
  },
);

test(
  'legacy companion UI localization keys still exist in all locale tables',
  () => {
    for (const key of [
      'editCompanion',
      'loadingCompanion',
      'companionSessionReady',
      'companionDisabledCaption',
      'companionEnabled',
      'companionEnabledDescription',
      'companionName',
      'companionPresentation',
      'companionPresentationMale',
      'companionPresentationFemale',
      'companionVoicePreference',
      'companionVoiceAuto',
      'companionVoiceMale',
      'companionVoiceFemale',
      'companionInteractionStyle',
      'companionStyleBalanced',
      'companionStyleWarm',
      'companionStyleCalm',
      'companionStyleDirect',
      'companionPersonalityPreset',
      'companionPersonalityBalanced',
      'companionPersonalityProfessional',
      'companionPersonalityCalm',
      'companionPersonalityFriendly',
      'companionPersonalityMinimal',
      'companionPersonalityCoach',
      'companionPersonalityStudy',
      'companionPersonalityCreative',
      'companionPresenceLevel',
      'companionPresenceSilent',
      'companionPresenceNormal',
      'companionPresenceHelpful',
      'companionPresenceActive',
      'companionPersonalityDimensions',
      'companionDimensionWarmth',
      'companionDimensionDirectness',
      'companionDimensionHumor',
      'companionDimensionInitiative',
      'companionDimensionVerbosity',
      'companionSpeakingRate',
      'companionCaptions',
      'companionCaptionsDescription',
      'cancelCompanionEditing',
      'saveCompanion',
      'decrease',
      'increase',
      'startCompanionSession',
      'resumeCompanionSession',
      'endCompanionSession',
      'continueCompanionSession',
      'pauseCompanionSession',
      'interruptCompanionSession',
    ]) {
      assert.equal(
        countKey(translations, key),
        3,
        `${key} must exist in ar, de and en`,
      );
    }
  },
);

test(
  'new companion state and error localization keys exist in all locale tables',
  () => {
    for (const key of [
      'companionLoadFailed',
      'companionNameRequired',
      'companionSaveFailed',
      'companionResetFailed',
      'companionResetTitle',
      'companionResetDescription',
      'resetCompanion',
      'confirmCompanionReset',
      'cancelCompanionReset',
      'companionSessionFailed',
      'retryLoadingCompanion',
      'companionStudioEyebrow',
      'companionEditorIdentityTitle',
      'companionEditorIdentityDescription',
      'companionEditorBehaviorTitle',
      'companionEditorBehaviorDescription',
      'companionEditorPersonalityTitle',
      'companionEditorPersonalityDescription',
      'companionEditorVoiceTitle',
      'companionEditorVoiceDescription',
      'companionPresenceTitle',
      'companionPresenceActiveCaption',
      'companionPresenceIdleCaption',
      'companionPresenceCapability',
      'companionSessionProfileTitle',
      'companionSessionProfileDescription',
      'companionPhaseIdle',
      'companionPhaseListening',
      'companionPhaseProcessing',
      'companionPhaseSpeaking',
      'companionPhasePaused',
      'companionPhaseInterrupted',
      'companionPhaseError',
    ]) {
      assert.equal(
        countKey(companionTranslations, key),
        3,
        `${key} must exist in modular ar, de and en tables`,
      );
    }
  },
);


test(
  'companion editor preserves the user draft when a persistence attempt fails',
  () => {
    assert.match(
      editor,
      /if \(visible\) \{\s*setDraft\(profile\);\s*\}/s,
    );
    assert.match(
      editor,
      /\}, \[profile, visible\]\);/,
    );
    assert.doesNotMatch(
      editor,
      /\[profile, saving, visible\]/,
    );
    assert.doesNotMatch(
      editor,
      /visible && !saving/,
    );
  },
);
