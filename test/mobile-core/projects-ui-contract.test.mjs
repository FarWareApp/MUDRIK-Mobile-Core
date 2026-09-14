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
const list = fs.readFileSync(
  'src/features/projects/components/ProjectList.tsx',
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
const backIcon = fs.readFileSync(
  'src/features/projects/components/ProjectBackIcon.tsx',
  'utf8',
);
const addIcon = fs.readFileSync(
  'src/features/projects/components/ProjectAddIcon.tsx',
  'utf8',
);
const searchIcon = fs.readFileSync(
  'src/features/projects/components/ProjectSearchIcon.tsx',
  'utf8',
);
const clearIcon = fs.readFileSync(
  'src/features/projects/components/ProjectClearIcon.tsx',
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
const projectTranslations = fs.readFileSync(
  'src/core/localization/projectTranslations.ts',
  'utf8',
);
const translationCatalog = fs.readFileSync(
  'src/core/localization/translationCatalog.ts',
  'utf8',
);

function countProjectTranslationKey(key) {
  const pattern = new RegExp(
    `^\\s*${key}:\\s`,
    'gm',
  );

  return projectTranslations.match(pattern)?.length ?? 0;
}

test(
  'projects screen delegates list and editing presentation to focused components',
  () => {
    for (const component of [
      'ProjectScreenHeader',
      'ProjectSearchBar',
      'ProjectViewTabs',
      'ProjectListState',
      'ProjectList',
      'ProjectEditorModal',
    ]) {
      assert.match(screen, new RegExp(component));
    }

    assert.doesNotMatch(screen, /\bFlatList\b/);
    assert.doesNotMatch(screen, /\bTextInput\b/);
    assert.doesNotMatch(screen, /\bPressable\b/);
  },
);

test(
  'project collection header and search avoid font glyph controls',
  () => {
    assert.match(header, /ProjectBackIcon/);
    assert.match(header, /ProjectAddIcon/);
    assert.match(header, /motion\.press/);
    assert.match(header, /isRTL/);
    assert.doesNotMatch(header, /[‹+]/u);

    assert.match(search, /ProjectSearchIcon/);
    assert.match(search, /ProjectClearIcon/);
    assert.match(search, /paddingStart/);
    assert.match(search, /paddingEnd/);
    assert.match(search, /width:\s*44/);
    assert.match(search, /height:\s*44/);
    assert.doesNotMatch(search, /[⌕×]/u);

    for (const icon of [
      backIcon,
      addIcon,
      searchIcon,
      clearIcon,
    ]) {
      assert.doesNotMatch(icon, /<Text\b/);
      assert.match(
        icon,
        /importantForAccessibility="no-hide-descendants"/,
      );
    }
  },
);

test(
  'project tabs and loading states meet accessibility contracts',
  () => {
    assert.match(tabs, /accessibilityRole="tablist"/);
    assert.match(tabs, /accessibilityRole="tab"/);
    assert.match(tabs, /accessibilityState=\{\{ selected \}\}/);
    assert.match(tabs, /minHeight:\s*44/);
    assert.match(state, /accessibilityRole="progressbar"/);
    assert.match(state, /accessibilityLiveRegion/);
    assert.match(state, /noProjectSearchResults/);
  },
);

test(
  'project list uses stable FlatList rendering and memoized rows',
  () => {
    assert.match(list, /function getProjectKey/);
    assert.match(list, /useCallback<ListRenderItem<ProjectRecord>>/);
    assert.match(item, /memo\(/);
    assert.match(item, /useCallback/);
    assert.match(item, /accessibilityState=\{\{ disabled \}\}/);
    assert.match(item, /marginStart:\s*-spacing\.sm/);
    assert.doesNotMatch(item, /marginLeft:/);
    assert.match(action, /width:\s*44/);
    assert.match(action, /height:\s*44/);
    assert.match(action, /motion\.press\.subtleScale/);
    assert.match(formatter, /Intl\.DateTimeFormat/);
  },
);

test(
  'project editor locks form state during persistence and reports errors in the modal',
  () => {
    assert.match(editor, /busy\?: boolean/);
    assert.match(editor, /errorMessage\?: string \| null/);
    assert.match(editor, /editable=\{!busy\}/);
    assert.match(editor, /accessibilityRole="progressbar"/);
    assert.match(editor, /accessibilityRole="alert"/);
    assert.match(editor, /Platform\.OS === 'ios'/);
    assert.match(editor, /:\s*'height'/);
    assert.match(editor, /useAccessibility/);
    assert.match(editor, /motion\.press/);
  },
);

test(
  'project-specific errors and empty-search copy exist in all locales',
  () => {
    for (const key of [
      'projectNameRequired',
      'projectCreateFailed',
      'projectArchiveUpdateFailed',
      'projectDeleteFailed',
      'noProjectSearchResults',
      'projectSaveDetailsFailed',
      'projectAddFileFailed',
      'projectOpenMediaFailed',
      'projectOpenFilesFailed',
      'projectCameraFailed',
      'projectRemoveFileFailed',
      'projectConversationUpdateFailed',
      'projectArchivedConversationLabel',
    ]) {
      assert.equal(
        countProjectTranslationKey(key),
        3,
        `${key} must exist in ar, de and en`,
      );
    }

    assert.match(translationCatalog, /projectTranslations/);
    assert.match(translationCatalog, /ProjectTranslationKey/);
  },
);
