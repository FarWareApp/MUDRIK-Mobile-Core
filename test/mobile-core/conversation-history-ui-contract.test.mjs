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
