import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const listItem = fs.readFileSync(
  'src/features/conversations/components/ConversationListItem.tsx',
  'utf8',
);
const actionButton = fs.readFileSync(
  'src/features/conversations/components/ConversationListActionButton.tsx',
  'utf8',
);
const pinIcon = fs.readFileSync(
  'src/features/conversations/components/ConversationPinIcon.tsx',
  'utf8',
);
const archiveIcon = fs.readFileSync(
  'src/features/conversations/components/ConversationArchiveIcon.tsx',
  'utf8',
);
const restoreIcon = fs.readFileSync(
  'src/features/conversations/components/ConversationRestoreIcon.tsx',
  'utf8',
);
const deleteIcon = fs.readFileSync(
  'src/features/conversations/components/ConversationDeleteIcon.tsx',
  'utf8',
);
const updatedAtFormatter = fs.readFileSync(
  'src/features/conversations/formatters/formatConversationUpdatedAt.ts',
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
  'conversation list item reuses dedicated presentation responsibilities',
  () => {
    assert.match(listItem, /ConversationListActionButton/);
    assert.match(listItem, /formatConversationUpdatedAt/);
    assert.match(listItem, /useLocale/);
    assert.match(listItem, /spacing/);
    assert.match(listItem, /typography/);

    assert.doesNotMatch(listItem, /toLocaleString\(/);
    assert.doesNotMatch(listItem, /'New conversation'/);
    assert.doesNotMatch(listItem, /`Open conversation:/);
  },
);

test(
  'conversation action buttons keep accessible 44 point targets and selected state',
  () => {
    assert.match(actionButton, /width:\s*44/);
    assert.match(actionButton, /height:\s*44/);
    assert.match(actionButton, /accessibilityState/);
    assert.match(actionButton, /selected/);
    assert.match(actionButton, /surfacePressed/);
    assert.match(actionButton, /icon:\s*\(color:\s*string\)\s*=>\s*ReactNode/);
    assert.doesNotMatch(actionButton, /<Text\b/);
  },
);

test(
  'conversation list actions use stable icon primitives instead of font glyphs',
  () => {
    for (const component of [
      'ConversationPinIcon',
      'ConversationArchiveIcon',
      'ConversationRestoreIcon',
      'ConversationDeleteIcon',
    ]) {
      assert.match(listItem, new RegExp(component));
    }

    assert.doesNotMatch(listItem, /[★↩▣×]/u);

    for (const source of [
      pinIcon,
      archiveIcon,
      restoreIcon,
      deleteIcon,
    ]) {
      assert.match(
        source,
        /importantForAccessibility="no-hide-descendants"/,
      );
      assert.doesNotMatch(source, /<Text\b/);
    }
  },
);

test(
  'conversation action geometry stays semantic in RTL',
  () => {
    assert.match(listItem, /const \{ locale, t, isRTL \} = useLocale\(\)/);
    assert.match(listItem, /marginStart:\s*-spacing\.sm/);
    assert.doesNotMatch(listItem, /marginLeft:/);
    assert.match(restoreIcon, /isRTL/);
    assert.match(restoreIcon, /scaleX:\s*-1/);
  },
);

test(
  'conversation timestamps use locale aware deterministic formatting',
  () => {
    assert.match(updatedAtFormatter, /Intl\.DateTimeFormat/);
    assert.match(updatedAtFormatter, /de-DE/);
    assert.match(updatedAtFormatter, /en-US/);
    assert.match(updatedAtFormatter, /Number\.isSafeInteger/);
  },
);

test(
  'conversation list actions have localized labels in all locale tables',
  () => {
    for (const key of [
      'untitledConversation',
      'openConversation',
      'pinConversation',
      'unpinConversation',
      'archiveConversation',
      'restoreConversation',
      'deleteConversationAction',
    ]) {
      assert.equal(
        countTranslationKey(key),
        3,
        `${key} must exist in ar, de and en`,
      );
    }
  },
);
