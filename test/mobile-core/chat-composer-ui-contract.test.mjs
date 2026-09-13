import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const composer = fs.readFileSync(
  'src/features/chat/components/MessageComposer.tsx',
  'utf8',
);
const attachmentButton = fs.readFileSync(
  'src/features/chat/components/composer/ComposerAttachmentButton.tsx',
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
  'attachment affordance is an explicit paperclip with a bounded count badge',
  () => {
    assert.match(attachmentButton, /📎/u);
    assert.doesNotMatch(attachmentButton, /＋/u);
    assert.match(attachmentButton, /attachmentCount > 99/);
    assert.match(attachmentButton, /99\+/);
  },
);

test(
  'composer action targets stay at least 44 by 44',
  () => {
    assert.match(actionButton, /width:\s*44/);
    assert.match(actionButton, /height:\s*44/);
  },
);

test(
  'composer text input keeps multiline, automatic direction and the 12000 character cap',
  () => {
    assert.match(textInput, /multiline/);
    assert.match(textInput, /maxLength=\{12000\}/);
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
