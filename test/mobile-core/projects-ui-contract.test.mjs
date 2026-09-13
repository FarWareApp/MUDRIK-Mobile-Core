import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const screen = fs.readFileSync(
  'src/features/projects/ProjectsScreen.tsx',
  'utf8',
);
const header = fs.readFileSync(
  'src/features/projects/components/ProjectScreenHeader.tsx',
  'utf8',
);
const search = fs.readFileSync(
  'src/features/projects/components/ProjectSearchBar.tsx',
  'utf8',
);
const state = fs.readFileSync(
  'src/features/projects/components/ProjectListState.tsx',
  'utf8',
);
const item = fs.readFileSync(
  'src/features/projects/components/ProjectListItem.tsx',
  'utf8',
);
const action = fs.readFileSync(
  'src/features/projects/components/ProjectListActionButton.tsx',
  'utf8',
);
const tabs = fs.readFileSync(
  'src/features/projects/components/ProjectViewTabs.tsx',
  'utf8',
);
const editor = fs.readFileSync(
  'src/features/projects/components/ProjectEditorModal.tsx',
  'utf8',
);
const formatter = fs.readFileSync(
  'src/features/projects/formatters/formatProjectUpdatedAt.ts',
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
  'projects screen delegates visual responsibilities to focused components',
  () => {
    for (const component of [
      'ProjectScreenHeader',
      'ProjectSearchBar',
      'ProjectViewTabs',
      'ProjectListState',
      'ProjectListItem',
      'ProjectEditorModal',
    ]) {
      assert.match(screen, new RegExp(component));
    }

    assert.doesNotMatch(screen, /\bTextInput\b/);
    assert.doesNotMatch(screen, /\bPressable\b/);
  },
);

test(
  'project collection controls are localized and accessible',
  () => {
    assert.match(header, /useLocale/);
    assert.match(search, /useLocale/);
    assert.match(state, /useLocale/);
    assert.match(tabs, /role="tablist"/);
    assert.match(tabs, /role="tab"/);
    assert.match(tabs, /accessibilityState=\{\{ selected \}\}/);
    assert.match(search, /keyboardAppearance=\{mode\}/);
  },
);

test(
  'project list item reuses its action and date responsibilities',
  () => {
    assert.match(item, /ProjectListActionButton/);
    assert.match(item, /formatProjectUpdatedAt/);
    assert.doesNotMatch(item, /toLocaleString\(/);
    assert.match(action, /width:\s*44/);
    assert.match(action, /height:\s*44/);
    assert.match(formatter, /Intl\.DateTimeFormat/);
  },
);

test(
  'project editor respects localization, keyboard appearance and motion preference',
  () => {
    assert.match(editor, /useAccessibility/);
    assert.match(editor, /useLocale/);
    assert.match(editor, /keyboardAppearance=\{mode\}/);
    assert.match(editor, /surfaceInput/);
    assert.match(editor, /writingDirection:\s*'auto'/);
  },
);

test(
  'project UI localization keys exist in all locale tables',
  () => {
    for (const key of [
      'createProject',
      'searchProjects',
      'activeProjects',
      'archivedProjects',
      'loadingProjects',
      'projectHistoryFailed',
      'noProjects',
      'deleteProject',
      'deleteProjectMessage',
      'newProject',
      'openProject',
      'archiveProject',
      'restoreProject',
      'deleteProjectAction',
      'projectName',
      'projectDescription',
      'cancelProjectEditing',
      'saveProject',
      'save',
    ]) {
      assert.equal(
        countTranslationKey(key),
        3,
        `${key} must exist in ar, de and en`,
      );
    }
  },
);
