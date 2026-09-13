import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  formatMessageTime,
} = loadTypeScriptModule(
  'src/features/chat/formatters/formatMessageTime.ts',
);

const {
  isNearMessageListEnd,
  MESSAGE_LIST_END_THRESHOLD_PX,
} = loadTypeScriptModule(
  'src/features/chat/scroll/isNearMessageListEnd.ts',
);

const bubble = fs.readFileSync(
  'src/features/chat/components/MessageBubble.tsx',
  'utf8',
);
const list = fs.readFileSync(
  'src/features/chat/components/MessageList.tsx',
  'utf8',
);
const tray = fs.readFileSync(
  'src/features/attachments/components/AttachmentDraftTray.tsx',
  'utf8',
);
const removeButton = fs.readFileSync(
  'src/features/attachments/components/AttachmentRemoveButton.tsx',
  'utf8',
);

test(
  'message time formatter follows locale conventions and rejects invalid timestamps',
  () => {
    const timestamp = Date.UTC(2026, 8, 13, 20, 5, 0);

    for (const [locale, tag] of [
      ['ar', 'ar'],
      ['de', 'de-DE'],
      ['en', 'en-US'],
    ]) {
      assert.equal(
        formatMessageTime(timestamp, locale),
        new Intl.DateTimeFormat(tag, {
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date(timestamp)),
      );
    }

    assert.equal(formatMessageTime(-1, 'en'), '');
    assert.equal(formatMessageTime(Number.NaN, 'en'), '');
    assert.equal(formatMessageTime(1.5, 'en'), '');
  },
);

test(
  'MessageBubble delegates time presentation instead of formatting time itself',
  () => {
    assert.match(bubble, /MessageTimestamp/);
    assert.doesNotMatch(bubble, /Intl\.DateTimeFormat/);
    assert.doesNotMatch(bubble, /new Date\(/);
  },
);

test(
  'message list proximity policy preserves readers who are away from the end',
  () => {
    assert.equal(
      isNearMessageListEnd(1000, 500, 500),
      true,
    );
    assert.equal(
      isNearMessageListEnd(
        1000,
        500,
        500 - MESSAGE_LIST_END_THRESHOLD_PX,
      ),
      true,
    );
    assert.equal(
      isNearMessageListEnd(
        1000,
        500,
        500 - MESSAGE_LIST_END_THRESHOLD_PX - 1,
      ),
      false,
    );
    assert.equal(
      isNearMessageListEnd(1000, 500, Number.NaN),
      false,
    );
  },
);

test(
  'MessageList gates automatic scroll-to-end behind end-follow state',
  () => {
    assert.match(list, /shouldFollowEndRef/);
    assert.match(list, /isNearMessageListEnd/);
    assert.match(list, /shouldFollowEndRef\.current/);
  },
);

test(
  'attachment tray delegates item presentation and removal control',
  () => {
    assert.match(tray, /AttachmentDraftItem/);
    assert.doesNotMatch(tray, /accessibilityLabel="Remove attachment"/);
    assert.match(removeButton, /t\('removeAttachment'\)/);
    assert.match(removeButton, /width:\s*44/);
    assert.match(removeButton, /height:\s*44/);
  },
);
