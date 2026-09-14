import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const composer = fs.readFileSync(
  'src/features/chat/components/MessageComposer.tsx',
  'utf8',
);
const composerSurface = fs.readFileSync(
  'src/features/chat/components/composer/ComposerSurface.tsx',
  'utf8',
);
const attachmentButton = fs.readFileSync(
  'src/features/chat/components/composer/ComposerAttachmentButton.tsx',
  'utf8',
);
const paperclipIcon = fs.readFileSync(
  'src/features/chat/components/composer/ComposerPaperclipIcon.tsx',
  'utf8',
);
const actionButton = fs.readFileSync(
  'src/features/chat/components/composer/ComposerActionButton.tsx',
  'utf8',
);
const sendButton = fs.readFileSync(
  'src/features/chat/components/composer/ComposerSendButton.tsx',
  'utf8',
);
const sendArrowIcon = fs.readFileSync(
  'src/features/chat/components/composer/ComposerSendArrowIcon.tsx',
  'utf8',
);
const textInput = fs.readFileSync(
  'src/features/chat/components/composer/ComposerTextInput.tsx',
  'utf8',
);
const adaptiveGlassSurface = fs.readFileSync(
  'src/design-system/components/AdaptiveGlassSurface.tsx',
  'utf8',
);
const typography = fs.readFileSync(
  'src/design-system/tokens/typography.ts',
  'utf8',
);
const translations = fs.readFileSync(
  'src/core/localization/translations.ts',
  'utf8',
);
const colorTokens = fs.readFileSync(
  'src/design-system/tokens/colors.ts',
  'utf8',
);

test(
  'MessageComposer remains composition-only instead of absorbing visual primitives',
  () => {
    assert.doesNotMatch(composer, /\bPressable\b/);
    assert.doesNotMatch(composer, /\bTextInput\b/);
    assert.doesNotMatch(composer, /StyleSheet/);
    assert.doesNotMatch(composer, /useTheme/);

    assert.match(composer, /ComposerAttachmentButton/);
    assert.match(composer, /ComposerTextInput/);
    assert.match(composer, /ComposerVoiceButton/);
    assert.match(composer, /ComposerSendButton/);
    assert.match(composer, /ComposerSurface/);
  },
);

test(
  'composer surface uses adaptive glass with explicit stable fallback colors',
  () => {
    assert.match(composerSurface, /AdaptiveGlassSurface/);
    assert.match(composerSurface, /surfaceInput/);
    assert.match(composerSurface, /fallbackColor=\{surfaceColor\}/);
    assert.match(composerSurface, /tintColor=\{surfaceColor\}/);
    assert.match(composerSurface, /focusedSurface/);
    assert.match(composerSurface, /shadowColor/);
    assert.match(composerSurface, /elevation:/);
    assert.doesNotMatch(textInput, /borderWidth:/);
    assert.doesNotMatch(textInput, /backgroundColor:/);

    assert.match(
      adaptiveGlassSurface,
      /fallbackColor \?\? colors\.surface/,
    );
    assert.match(
      adaptiveGlassSurface,
      /tintColor \?\? colors\.surface/,
    );

    for (const token of [
      'surfaceInput',
      'surfacePressed',
      'accentSoft',
      'shadow',
    ]) {
      assert.match(
        colorTokens,
        new RegExp(`${token}:`),
      );
    }
  },
);

test(
  'attachment affordance uses a platform-stable paperclip and mirrors its badge in RTL',
  () => {
    assert.match(
      attachmentButton,
      /ComposerPaperclipIcon/,
    );
    assert.doesNotMatch(
      attachmentButton,
      /📎/u,
    );
    assert.match(paperclipIcon, /rotate:/);
    assert.match(paperclipIcon, /borderWidth:\s*2/);
    assert.match(attachmentButton, /attachmentCount > 99/);
    assert.match(attachmentButton, /99\+/);
    assert.match(attachmentButton, /isRTL/);
    assert.match(attachmentButton, /badgeRTL/);
    assert.match(attachmentButton, /badgeLTR/);
  },
);

test(
  'send affordance uses a platform-stable visual primitive instead of a font glyph',
  () => {
    assert.match(sendButton, /ComposerSendArrowIcon/);
    assert.doesNotMatch(sendButton, /<Text\b/);
    assert.doesNotMatch(sendButton, /↑/u);
    assert.match(
      sendArrowIcon,
      /importantForAccessibility="no-hide-descendants"/,
    );
    assert.match(sendArrowIcon, /styles\.shaft/);
    assert.match(sendArrowIcon, /styles\.leftWing/);
    assert.match(sendArrowIcon, /styles\.rightWing/);
    assert.match(sendArrowIcon, /rotate:\s*'-45deg'/);
    assert.match(sendArrowIcon, /rotate:\s*'45deg'/);
  },
);

test(
  'composer action targets stay at least 44 by 44 and use motion tokens',
  () => {
    assert.match(actionButton, /width:\s*44/);
    assert.match(actionButton, /height:\s*44/);
    assert.match(actionButton, /surfacePressed/);
    assert.match(actionButton, /motion\.press\.scale/);
    assert.match(actionButton, /shadowOpacity/);
    assert.doesNotMatch(actionButton, /\?\s*0\.95/);
  },
);

test(
  'composer text input keeps multiline cap while resolving typed text direction',
  () => {
    assert.match(textInput, /multiline/);
    assert.match(textInput, /maxLength=\{12000\}/);
    assert.match(textInput, /keyboardAppearance=\{mode\}/);
    assert.match(textInput, /resolveTextDirection/);
    assert.match(textInput, /writingDirection:\s*direction/);
    assert.match(textInput, /cursorColor=\{colors\.accent\}/);
    assert.match(textInput, /underlineColorAndroid="transparent"/);
    assert.match(textInput, /\.\.\.typeScale\.input/);
    assert.match(textInput, /textAlignVertical:\s*'top'/);

    assert.match(
      typography,
      /input:\s*\{[\s\S]*?fontSize:\s*typography\.body,[\s\S]*?lineHeight:\s*24/,
    );
  },
);

test(
  'composer action accessibility labels are localized',
  () => {
    for (const key of [
      'attachments',
      'voice',
      'send',
      'stop',
      'removeAttachment',
    ]) {
      assert.match(
        translations,
        new RegExp(`${key}:`),
      );
    }
  },
);
