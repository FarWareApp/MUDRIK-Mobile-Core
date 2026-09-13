import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const screen = fs.readFileSync(
  'src/features/companion/CompanionScreen.tsx',
  'utf8',
);
const editor = fs.readFileSync(
  'src/features/companion/components/CompanionProfileEditorModal.tsx',
  'utf8',
);
const controls = fs.readFileSync(
  'src/features/companion/components/CompanionSessionControls.tsx',
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
  'companion screen delegates presentation responsibilities',
  () => {
    for (const component of [
      'CompanionScreenHeader',
      'CompanionScreenState',
      'CompanionCaptionCard',
      'CompanionPreferenceSummary',
      'CompanionSessionControls',
      'CompanionProfileEditorModal',
    ]) {
      assert.match(screen, new RegExp(component));
    }

    assert.match(screen, /InlineErrorBanner/);
    assert.doesNotMatch(screen, /\bPressable\b/);
    assert.doesNotMatch(screen, /ActivityIndicator/);
    assert.doesNotMatch(screen, /Companion session is ready/);
  },
);

test(
  'companion profile editor orchestrates focused controls',
  () => {
    assert.match(editor, /CompanionEditorHeader/);
    assert.match(editor, /CompanionOptionGroup/);
    assert.match(editor, /CompanionToggleRow/);
    assert.match(editor, /CompanionNumericStepper/);
    assert.match(editor, /useAccessibility/);
    assert.match(editor, /useLocale/);
    assert.match(editor, /keyboardAppearance=\{mode\}/);
    assert.match(editor, /writingDirection:\s*'auto'/);
    assert.match(editor, /reducedMotion \? 'none' : 'slide'/);

    assert.doesNotMatch(editor, /function OptionGroup/);
    assert.doesNotMatch(editor, /function ToggleRow/);
    assert.doesNotMatch(editor, /function NumericStepper/);
  },
);

test(
  'companion controls are localized with accessible touch targets',
  () => {
    assert.match(controls, /useLocale/);
    assert.match(controls, /accessibilityLabel=\{label\}/);
    assert.match(controls, /minHeight:\s*44/);
    assert.doesNotMatch(controls, /label="Start session"/);
    assert.doesNotMatch(controls, /label="Pause"/);

    assert.match(optionGroup, /minHeight:\s*44/);
    assert.match(optionGroup, /accessibilityState=\{\{ selected \}\}/);
    assert.match(stepper, /width:\s*44/);
    assert.match(stepper, /height:\s*44/);
  },
);

test(
  'companion UI localization keys exist in all locale tables',
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
        countTranslationKey(key),
        3,
        `${key} must exist in ar, de and en`,
      );
    }
  },
);
