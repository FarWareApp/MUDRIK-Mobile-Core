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
const textInput = fs.readFileSync(
  'src/features/chat/components/composer/ComposerTextInput.tsx',
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
  'composer surface owns a restrained single-shell input treatment',
  () => {
    assert.match(composerSurface, /surfaceInput/);
    assert.match(composerSurface, /focusedSurface/);
    assert.match(composerSurface, /shadowColor/);
    assert.match(composerSurface, /elevation:/);
    assert.doesNotMatch(textInput, /borderWidth:/);
    assert.doesNotMatch(textInput, /backgroundColor:/);

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
  'attachment affordance uses a platform-stable paperclip primitive with a bounded count badge',
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
  },
);

test(
  'composer action targets stay at least 44 by 44 with pressed-state polish',
  () => {
    assert.match(actionButton, /width:\s*44/);
    assert.match(actionButton, /height:\s*44/);
    assert.match(actionButton, /surfacePressed/);
    assert.match(actionButton, /transform:/);
    assert.match(actionButton, /shadowOpacity/);
  },
);

test(
  'composer text input keeps multiline, automatic direction and the 12000 character cap',
  () => {
    assert.match(textInput, /multiline/);
    assert.match(textInput, /maxLength=\{12000\}/);
    assert.match(textInput, /keyboardAppearance=\{mode\}/);
    assert.match(textInput, /textAlignVertical:\s*'top'/);
    assert.match(textInput, /writingDirection:\s*'auto'/);
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
