import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const screen = fs.readFileSync(
  'src/features/conversations/ConversationsScreen.tsx',
  'utf8',
);
const controller = fs.readFileSync(
  'src/features/conversations/hooks/useConversationHistoryController.ts',
  'utf8',
);
const list = fs.readFileSync(
  'src/features/conversations/components/ConversationHistoryList.tsx',
  'utf8',
);
const listItem = fs.readFileSync(
  'src/features/conversations/components/ConversationListItem.tsx',
  'utf8',
);
const actionButton = fs.readFileSync(
  'src/features/conversations/components/ConversationListActionButton.tsx',
  'utf8',
);
const header = fs.readFileSync(
  'src/features/conversations/components/ConversationHistoryHeader.tsx',
  'utf8',
);
const searchBar = fs.readFileSync(
  'src/features/conversations/components/ConversationSearchBar.tsx',
  'utf8',
);
const tabs = fs.readFileSync(
  'src/features/conversations/components/ConversationViewTabs.tsx',
  'utf8',
);
const tab = fs.readFileSync(
  'src/features/conversations/components/ConversationViewTab.tsx',
  'utf8',
);
const state = fs.readFileSync(
  'src/features/conversations/components/ConversationHistoryState.tsx',
  'utf8',
);
const backIcon = fs.readFileSync(
  'src/features/conversations/components/ConversationBackIcon.tsx',
  'utf8',
);
const addIcon = fs.readFileSync(
  'src/features/conversations/components/ConversationAddIcon.tsx',
  'utf8',
);
const searchIcon = fs.readFileSync(
  'src/features/conversations/components/ConversationSearchIcon.tsx',
  'utf8',
);
const clearIcon = fs.readFileSync(
  'src/features/conversations/components/ConversationClearIcon.tsx',
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
const viewMode = fs.readFileSync(
  'src/features/conversations/ConversationViewMode.ts',
  'utf8',
);
const errorCode = fs.readFileSync(
  'src/features/conversations/ConversationHistoryErrorCode.ts',
  'utf8',
);
const errorMapper = fs.readFileSync(
  'src/features/conversations/getConversationHistoryErrorTranslationKey.ts',
  'utf8',
);
const featureTranslations = fs.readFileSync(
  'src/core/localization/conversationTranslations.ts',
  'utf8',
);
const translationCatalog = fs.readFileSync(
  'src/core/localization/translationCatalog.ts',
  'utf8',
);
const translations = fs.readFileSync(
  'src/core/localization/translations.ts',
  'utf8',
);

function countTranslationKey(source, key) {
  const pattern = new RegExp(
    `^\\s*${key}:\\s`,
    'gm',
  );

  return source.match(pattern)?.length ?? 0;
}

test(
  'conversation screen stays an orchestrator and delegates list presentation',
  () => {
    for (const component of [
      'ConversationHistoryHeader',
      'ConversationHistoryList',
      'ConversationHistoryState',
      'ConversationSearchBar',
      'ConversationViewTabs',
      'InlineErrorBanner',
    ]) {
      assert.match(screen, new RegExp(component));
    }

    assert.doesNotMatch(screen, /\bFlatList\b/);
    assert.match(
      screen,
      /getConversationHistoryErrorTranslationKey/,
    );
    assert.match(screen, /hasSearchQuery/);
    assert.match(screen, /mode=\{/);
    assert.match(screen, /'no-results'/);
  },
);

test(
  'conversation controller exposes error codes and avoids full reload mutations',
  () => {
    assert.match(controller, /ConversationHistoryErrorCode/);
    assert.match(controller, /mutationInFlightRef/);
    assert.match(controller, /beginMutation/);
    assert.match(controller, /endMutation/);
    assert.match(controller, /sortConversationRecords/);
    assert.match(controller, /filterConversationRecords/);
    assert.match(controller, /setError\('create-failed'\)/);
    assert.match(controller, /setError\('pin-failed'\)/);
    assert.match(controller, /setError\('archive-failed'\)/);
    assert.match(controller, /setError\('delete-failed'\)/);
    assert.match(controller, /setConversations/);

    for (const rawCopy of [
      'Unable to create conversation.',
      'Unable to update pinned state.',
      'Unable to update archived state.',
      'Unable to delete conversation.',
    ]) {
      assert.doesNotMatch(controller, new RegExp(rawCopy.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }

    assert.doesNotMatch(
      controller,
      /setPinned[\s\S]*?await load\(\)/,
    );
    assert.doesNotMatch(
      controller,
      /setArchived[\s\S]*?await load\(\)/,
    );
    assert.doesNotMatch(
      controller,
      /repository\.delete[\s\S]*?await load\(\)/,
    );
  },
);

test(
  'conversation list owns FlatList rendering with stable identity boundaries',
  () => {
    assert.match(list, /\bFlatList\b/);
    assert.match(list, /function getConversationKey/);
    assert.match(list, /useCallback<ListRenderItem<ConversationRecord>>/);
    assert.match(list, /ConversationListItem/);
    assert.match(listItem, /memo\(/);
    assert.match(listItem, /accessibilityState=\{\{ disabled \}\}/);
    assert.match(listItem, /writingDirection:\s*'auto'/);
    assert.match(listItem, /typeScale\.body/);
    assert.match(listItem, /typeScale\.caption/);
    assert.doesNotMatch(listItem, /marginLeft:/);
  },
);

test(
  'conversation action buttons keep accessible targets stable icons and motion tokens',
  () => {
    assert.match(actionButton, /width:\s*44/);
    assert.match(actionButton, /height:\s*44/);
    assert.match(actionButton, /accessibilityState/);
    assert.match(actionButton, /motion\.press\.subtleScale/);
    assert.doesNotMatch(actionButton, /<Text\b/);

    for (const component of [
      'ConversationPinIcon',
      'ConversationArchiveIcon',
      'ConversationRestoreIcon',
      'ConversationDeleteIcon',
    ]) {
      assert.match(listItem, new RegExp(component));
    }

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

    assert.match(restoreIcon, /isRTL/);
    assert.match(restoreIcon, /scaleX:\s*-1/);
  },
);

test(
  'conversation header removes font glyph controls and respects busy and RTL state',
  () => {
    assert.match(header, /ConversationBackIcon/);
    assert.match(header, /ConversationAddIcon/);
    assert.match(header, /accessibilityState=\{\{ disabled: busy \}\}/);
    assert.match(header, /disabled=\{busy\}/);
    assert.match(header, /motion\.press\.scale/);
    assert.match(header, /motion\.press\.subtleScale/);
    assert.doesNotMatch(header, /[‹+]/u);
    assert.match(backIcon, /isRTL/);
    assert.match(backIcon, /scaleX:\s*-1/);

    for (const source of [backIcon, addIcon]) {
      assert.match(
        source,
        /importantForAccessibility="no-hide-descendants"/,
      );
      assert.doesNotMatch(source, /<Text\b/);
    }
  },
);

test(
  'conversation search uses semantic RTL spacing stable primitives and 44 point clear target',
  () => {
    assert.match(searchBar, /ConversationSearchIcon/);
    assert.match(searchBar, /ConversationClearIcon/);
    assert.match(searchBar, /width:\s*44/);
    assert.match(searchBar, /height:\s*44/);
    assert.match(searchBar, /paddingStart:/);
    assert.match(searchBar, /paddingEnd:/);
    assert.match(searchBar, /autoCorrect=\{false\}/);
    assert.match(searchBar, /autoCapitalize="none"/);
    assert.match(searchBar, /underlineColorAndroid="transparent"/);
    assert.match(searchBar, /motion\.press\.subtleScale/);
    assert.doesNotMatch(searchBar, /paddingLeft:/);
    assert.doesNotMatch(searchBar, /paddingRight:/);
    assert.doesNotMatch(searchBar, /[⌕×]/u);

    for (const source of [searchIcon, clearIcon]) {
      assert.match(
        source,
        /importantForAccessibility="no-hide-descendants"/,
      );
      assert.doesNotMatch(source, /<Text\b/);
    }
  },
);

test(
  'conversation tabs split tab presentation and meet the 44 point target contract',
  () => {
    assert.match(tabs, /ConversationViewTab/);
    assert.match(tabs, /ConversationViewMode/);
    assert.doesNotMatch(tabs, /function renderTab/);
    assert.match(tab, /minHeight:\s*44/);
    assert.match(tab, /accessibilityRole="tab"/);
    assert.match(tab, /accessibilityState=\{\{ selected \}\}/);
    assert.match(tab, /motion\.press\.subtleScale/);
    assert.match(viewMode, /'active'/);
    assert.match(viewMode, /'archived'/);
    assert.match(controller, /ConversationViewMode/);
  },
);

test(
  'conversation loading error empty and search states are accessible and explicit',
  () => {
    assert.match(state, /'no-results'/);
    assert.match(state, /accessibilityRole="progressbar"/);
    assert.match(state, /accessibilityLiveRegion="polite"/);
    assert.match(state, /accessibilityLiveRegion="assertive"/);
    assert.match(state, /accessibilityRole="alert"/);
    assert.match(state, /minHeight:\s*44/);
    assert.match(state, /noConversationSearchResults/);
    assert.match(state, /motion\.press\.subtleScale/);
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
  'conversation error codes map to feature scoped translations in every locale',
  () => {
    assert.match(errorCode, /create-failed/);
    assert.match(errorCode, /pin-failed/);
    assert.match(errorCode, /archive-failed/);
    assert.match(errorCode, /delete-failed/);
    assert.match(errorMapper, /ConversationTranslationKey/);

    for (const key of [
      'conversationCreateFailed',
      'conversationPinUpdateFailed',
      'conversationArchiveUpdateFailed',
      'conversationDeleteFailed',
      'noConversationSearchResults',
    ]) {
      assert.equal(
        countTranslationKey(featureTranslations, key),
        3,
        `${key} must exist in ar, de and en`,
      );
    }

    for (const locale of ['ar', 'de', 'en']) {
      assert.match(
        translationCatalog,
        new RegExp(
          `${locale}: \\{[\\s\\S]*?\\.\\.\\.conversationTranslations\\.${locale}`,
        ),
      );
    }
  },
);

test(
  'conversation core labels remain localized in all base locale tables',
  () => {
    for (const key of [
      'searchConversations',
      'activeConversations',
      'archivedConversations',
      'noConversations',
      'loadingConversations',
      'conversationHistoryFailed',
      'deleteConversation',
      'deleteConversationMessage',
      'untitledConversation',
      'openConversation',
      'pinConversation',
      'unpinConversation',
      'archiveConversation',
      'restoreConversation',
      'deleteConversationAction',
      'clearSearch',
    ]) {
      assert.equal(
        countTranslationKey(translations, key),
        3,
        `${key} must exist in ar, de and en`,
      );
    }
  },
);
