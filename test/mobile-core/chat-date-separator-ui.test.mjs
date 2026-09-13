import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  getLocalMessageDateKey,
} = loadTypeScriptModule(
  'src/features/chat/formatters/getLocalMessageDateKey.ts',
);
const {
  buildMessageListItems,
} = loadTypeScriptModule(
  'src/features/chat/list/buildMessageListItems.ts',
);

const bubble = fs.readFileSync(
  'src/features/chat/components/MessageBubble.tsx',
  'utf8',
);
const list = fs.readFileSync(
  'src/features/chat/components/MessageList.tsx',
  'utf8',
);
const separator = fs.readFileSync(
  'src/features/chat/components/MessageDateSeparator.tsx',
  'utf8',
);

function localTime(
  year,
  month,
  day,
  hour = 12,
) {
  return new Date(
    year,
    month - 1,
    day,
    hour,
    0,
    0,
    0,
  ).getTime();
}

function message(id, createdAt) {
  return {
    id,
    role: 'user',
    text: id,
    createdAt,
  };
}

test(
  'local date key is stable for the device calendar day and rejects malformed time',
  () => {
    assert.equal(
      getLocalMessageDateKey(
        localTime(2026, 9, 13),
      ),
      '2026-09-13',
    );
    assert.equal(getLocalMessageDateKey(-1), null);
    assert.equal(getLocalMessageDateKey(1.2), null);
  },
);

test(
  'list builder preserves message order and inserts one separator per contiguous calendar day',
  () => {
    const first = message(
      'msg_a',
      localTime(2026, 9, 12, 8),
    );
    const second = message(
      'msg_b',
      localTime(2026, 9, 12, 18),
    );
    const third = message(
      'msg_c',
      localTime(2026, 9, 13, 9),
    );

    const items = buildMessageListItems([
      first,
      second,
      third,
    ]);

    assert.deepEqual(
      items.map((item) => item.kind),
      ['date', 'message', 'message', 'date', 'message'],
    );
    assert.deepEqual(
      items
        .filter((item) => item.kind === 'message')
        .map((item) => item.message.id),
      ['msg_a', 'msg_b', 'msg_c'],
    );
  },
);

test(
  'MessageBubble stays composition-only after visual hardening',
  () => {
    assert.match(bubble, /MessageBubbleSurface/);
    assert.match(bubble, /MessageText/);
    assert.match(bubble, /MessageTimestamp/);
    assert.doesNotMatch(bubble, /StyleSheet/);
    assert.doesNotMatch(bubble, /useTheme/);
    assert.doesNotMatch(bubble, /resolveTextDirection/);
  },
);

test(
  'MessageList renders deterministic localized date separators outside bubbles',
  () => {
    assert.match(list, /buildMessageListItems/);
    assert.match(list, /MessageDateSeparator/);
    assert.doesNotMatch(list, /Date\.now\(/);
    assert.match(separator, /formatMessageDate/);
    assert.doesNotMatch(separator, /getMessageDateBucket/);
  },
);
