import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const chatScreen = fs.readFileSync(
  'src/features/chat/ChatScreen.tsx',
  'utf8',
);
const chatHeader = fs.readFileSync(
  'src/features/chat/components/ChatHeader.tsx',
  'utf8',
);
const quickBackdrop = fs.readFileSync(
  'src/features/chat/components/QuickActionBackdrop.tsx',
  'utf8',
);
const quickButton = fs.readFileSync(
  'src/features/chat/components/QuickActionButton.tsx',
  'utf8',
);
const quickItem = fs.readFileSync(
  'src/features/chat/components/QuickActionMenuItem.tsx',
  'utf8',
);
const quickMenu = fs.readFileSync(
  'src/features/chat/components/QuickActionMenu.tsx',
  'utf8',
);
const attachmentSheet = fs.readFileSync(
  'src/features/attachments/components/AttachmentSourceSheet.tsx',
  'utf8',
);
const attachmentAction = fs.readFileSync(
  'src/features/attachments/components/AttachmentSourceAction.tsx',
  'utf8',
);
const attachmentTray = fs.readFileSync(
  'src/features/attachments/components/AttachmentDraftTray.tsx',
  'utf8',
);
const chatTranslations = fs.readFileSync(
  'src/core/localization/chatTranslations.ts',
  'utf8',
);
const translationCatalog = fs.readFileSync(
  'src/core/localization/translationCatalog.ts',
  'utf8',
);

test(
  'chat screen orchestrates dedicated overlay and attachment-source components',
  () => {
    assert.doesNotMatch(chatScreen, /\bAlert\b/);
    assert.match(chatScreen, /QuickActionBackdrop/);
    assert.match(chatScreen, /AttachmentSourceSheet/);
    assert.match(chatScreen, /openAttachmentSources/);
  },
);

test(
  'chat header keeps a large localized new-conversation target with pressed feedback',
  () => {
    assert.match(chatHeader, /width:\s*46/);
    assert.match(chatHeader, /height:\s*46/);
    assert.match(chatHeader, /surfacePressed/);
    assert.match(chatHeader, /t\('newConversation'\)/);
  },
);

test(
  'quick actions support reduced motion, RTL placement and explicit dismissal',
  () => {
    assert.match(quickBackdrop, /useAccessibility/);
    assert.match(quickBackdrop, /FadeIn/);
    assert.match(quickBackdrop, /closeQuickActions/);
    assert.match(quickItem, /FadeInDown/);
    assert.match(quickItem, /reducedMotion/);
    assert.match(quickMenu, /containerRTL/);
    assert.match(quickButton, /quickActions/);
    assert.match(quickButton, /closeQuickActions/);
    assert.match(quickButton, /buttonRTL/);
  },
);

test(
  'attachment source sheet is native, safe-area aware and reduced-motion aware',
  () => {
    assert.match(attachmentSheet, /\bModal\b/);
    assert.match(attachmentSheet, /useSafeAreaInsets/);
    assert.match(attachmentSheet, /reducedMotion/);
    assert.match(attachmentSheet, /chooseAttachmentSource/);
    assert.match(attachmentAction, /minHeight:\s*56/);
    assert.match(attachmentAction, /actionRTL/);
  },
);

test(
  'attachment draft busy state uses an accessible activity indicator',
  () => {
    assert.match(attachmentTray, /ActivityIndicator/);
    assert.match(attachmentTray, /accessibilityRole="progressbar"/);
    assert.match(attachmentTray, /addingAttachment/);
  },
);

test(
  'chat-only localization keys live in the feature catalog and merge globally',
  () => {
    for (const key of [
      'quickActions',
      'closeQuickActions',
      'addAttachment',
      'chooseAttachmentSource',
      'addingAttachment',
    ]) {
      const pattern = new RegExp(
        `^\\s*${key}:\\s`,
        'gm',
      );

      assert.equal(
        chatTranslations.match(pattern)?.length ?? 0,
        3,
      );
    }

    assert.match(
      translationCatalog,
      /chatTranslations/,
    );
  },
);
