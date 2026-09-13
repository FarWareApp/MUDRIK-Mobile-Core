import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const detail = fs.readFileSync(
  'src/features/projects/ProjectDetailScreen.tsx',
  'utf8',
);
const header = fs.readFileSync(
  'src/features/projects/components/ProjectDetailHeader.tsx',
  'utf8',
);
const state = fs.readFileSync(
  'src/features/projects/components/ProjectDetailState.tsx',
  'utf8',
);
const sectionHeader = fs.readFileSync(
  'src/features/projects/components/ProjectSectionHeader.tsx',
  'utf8',
);
const attachments = fs.readFileSync(
  'src/features/projects/components/ProjectAttachmentList.tsx',
  'utf8',
);
const conversations = fs.readFileSync(
  'src/features/projects/components/ProjectConversationList.tsx',
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
  'project detail screen delegates header and state presentation',
  () => {
    assert.match(detail, /ProjectDetailHeader/);
    assert.match(detail, /ProjectDetailState/);
    assert.match(detail, /ProjectSectionHeader/);
    assert.match(detail, /InlineErrorBanner/);
    assert.doesNotMatch(detail, /\bPressable\b/);
    assert.doesNotMatch(detail, /ActivityIndicator/);
  },
);

test(
  'project detail controls keep accessible touch targets and disabled state',
  () => {
    assert.match(header, /width:\s*44/);
    assert.match(header, /height:\s*44/);
    assert.match(header, /accessibilityState=\{\{ disabled: busy \}\}/);
    assert.match(sectionHeader, /minHeight:\s*44/);
    assert.match(sectionHeader, /accessibilityState=\{\{ disabled \}\}/);
    assert.match(state, /minHeight:\s*44/);
  },
);

test(
  'project attachment and conversation rows are localized',
  () => {
    assert.match(attachments, /useLocale/);
    assert.match(attachments, /removeProjectFile/);
    assert.match(conversations, /useLocale/);
    assert.match(conversations, /untitledConversation/);
    assert.doesNotMatch(conversations, /'New conversation'/);
  },
);

test(
  'project detail localization keys exist in all locale tables',
  () => {
    for (const key of [
      'loadingProject',
      'projectLoadFailed',
      'projectNotFound',
      'retryLoadingProject',
      'backToProjects',
      'editProject',
      'projectFiles',
      'addProjectFile',
      'add',
      'noProjectFiles',
      'removeProjectFile',
      'projectConversations',
      'noProjectConversations',
      'addToProject',
      'photosAndVideos',
      'camera',
      'files',
    ]) {
      assert.equal(
        countTranslationKey(key),
        3,
        `${key} must exist in ar, de and en`,
      );
    }
  },
);
