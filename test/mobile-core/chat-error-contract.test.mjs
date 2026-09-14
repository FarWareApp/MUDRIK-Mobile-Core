import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const chatController = fs.readFileSync(
  'src/features/chat/hooks/useConversationController.ts',
  'utf8',
);
const attachmentController = fs.readFileSync(
  'src/features/attachments/hooks/useAttachmentDraftController.ts',
  'utf8',
);
const chatScreen = fs.readFileSync(
  'src/features/chat/ChatScreen.tsx',
  'utf8',
);
const chatErrorBanner = fs.readFileSync(
  'src/features/chat/components/ChatErrorBanner.tsx',
  'utf8',
);
const chatTranslations = fs.readFileSync(
  'src/core/localization/chatTranslations.ts',
  'utf8',
);
const attachmentTranslations = fs.readFileSync(
  'src/core/localization/attachmentTranslations.ts',
  'utf8',
);
const translationCatalog = fs.readFileSync(
  'src/core/localization/translationCatalog.ts',
  'utf8',
);
const chatMapper = fs.readFileSync(
  'src/features/chat/getChatSendErrorTranslationKey.ts',
  'utf8',
);
const attachmentMapper = fs.readFileSync(
  'src/features/attachments/getAttachmentDraftErrorTranslationKey.ts',
  'utf8',
);
const sharedBanner = fs.readFileSync(
  'src/shared/components/InlineErrorBanner.tsx',
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
  'chat send logic stores stable error codes instead of localized UI copy',
  () => {
    assert.match(chatController, /code:\s*ChatSendErrorCode/);
    assert.match(chatController, /code:\s*'transport-failed'/);
    assert.match(chatController, /code:\s*'local-persist-failed'/);
    assert.doesNotMatch(
      chatController,
      /Unable to complete the message\./,
    );
    assert.doesNotMatch(
      chatController,
      /Unable to save the message locally\./,
    );
  },
);

test(
  'attachment draft logic exposes only typed error codes',
  () => {
    assert.match(
      attachmentController,
      /useState<AttachmentDraftErrorCode \| null>/,
    );

    for (const code of [
      'restore-failed',
      'import-failed',
      'media-picker-failed',
      'camera-failed',
      'document-picker-failed',
      'remove-failed',
    ]) {
      assert.match(
        attachmentController,
        new RegExp(`setError\\('${code}'\\)`),
      );
    }

    for (const copy of [
      'Unable to restore attachments.',
      'Unable to add attachment.',
      'Unable to open photos.',
      'Camera permission or capture failed.',
      'Unable to open files.',
      'Unable to remove attachment.',
    ]) {
      assert.doesNotMatch(
        attachmentController,
        new RegExp(
          copy.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        ),
      );
    }
  },
);

test(
  'chat presentation localizes error codes and shares the common banner',
  () => {
    assert.match(chatScreen, /useLocale/);
    assert.match(chatScreen, /InlineErrorBanner/);
    assert.match(
      chatScreen,
      /getChatSendErrorTranslationKey/,
    );
    assert.match(
      chatScreen,
      /getAttachmentDraftErrorTranslationKey/,
    );
    assert.doesNotMatch(chatScreen, /error\.message/);
    assert.doesNotMatch(chatScreen, /<ChatErrorBanner/);

    assert.match(
      chatErrorBanner,
      /InlineErrorBanner as ChatErrorBanner/,
    );
    assert.doesNotMatch(chatErrorBanner, /Retry/);
    assert.doesNotMatch(chatErrorBanner, /Dismiss error/);

    assert.match(sharedBanner, /t\('retry'\)/);
    assert.match(sharedBanner, /t\('dismissError'\)/);
  },
);

test(
  'chat and attachment error mappers are exhaustive typed translation boundaries',
  () => {
    assert.match(chatMapper, /ChatSendErrorCode/);
    assert.match(chatMapper, /ChatTranslationKey/);
    assert.match(
      attachmentMapper,
      /AttachmentDraftErrorCode/,
    );
    assert.match(
      attachmentMapper,
      /AttachmentTranslationKey/,
    );
  },
);

test(
  'chat and attachment error copy exists in Arabic German and English',
  () => {
    for (const key of [
      'messageSendFailed',
      'messageSaveFailed',
    ]) {
      assert.equal(
        countTranslationKey(
          chatTranslations,
          key,
        ),
        3,
        `${key} must exist in ar, de and en`,
      );
    }

    for (const key of [
      'attachmentRestoreFailed',
      'attachmentAddFailed',
      'attachmentPhotosOpenFailed',
      'attachmentCameraFailed',
      'attachmentFilesOpenFailed',
      'attachmentRemoveFailed',
    ]) {
      assert.equal(
        countTranslationKey(
          attachmentTranslations,
          key,
        ),
        3,
        `${key} must exist in ar, de and en`,
      );
    }

    for (const locale of ['ar', 'de', 'en']) {
      assert.match(
        translationCatalog,
        new RegExp(
          `${locale}: \\{[\\s\\S]*?\\.\\.\\.attachmentTranslations\\.${locale}`,
        ),
      );
    }
  },
);
