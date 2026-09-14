import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  areMessagesInSameVisualGroup,
  MESSAGE_VISUAL_GROUP_WINDOW_MS,
} = loadTypeScriptModule(
  'src/features/chat/list/areMessagesInSameVisualGroup.ts',
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
const bubbleSurface = fs.readFileSync(
  'src/features/chat/components/MessageBubbleSurface.tsx',
  'utf8',
);
const list = fs.readFileSync(
  'src/features/chat/components/MessageList.tsx',
  'utf8',
);
const chatTypes = fs.readFileSync(
  'src/features/chat/types.ts',
  'utf8',
);

function localTime(
  year,
  month,
  day,
  hour = 12,
  minute = 0,
) {
  return new Date(
    year,
    month - 1,
    day,
    hour,
    minute,
    0,
    0,
  ).getTime();
}

function message(
  id,
  role,
  createdAt,
) {
  return {
    id,
    role,
    text: id,
    createdAt,
  };
}

test(
  'visual grouping is conservative across role, time, order, and calendar-day boundaries',
  () => {
    const start = message(
      'u1',
      'user',
      localTime(2026, 9, 14, 10, 0),
    );
    const boundary = message(
      'u2',
      'user',
      start.createdAt + MESSAGE_VISUAL_GROUP_WINDOW_MS,
    );
    const outsideWindow = message(
      'u3',
      'user',
      start.createdAt + MESSAGE_VISUAL_GROUP_WINDOW_MS + 1,
    );
    const assistant = message(
      'a1',
      'assistant',
      start.createdAt + 60_000,
    );
    const reversed = message(
      'u4',
      'user',
      start.createdAt - 1,
    );
    const beforeMidnight = message(
      'u5',
      'user',
      localTime(2026, 9, 14, 23, 59),
    );
    const afterMidnight = message(
      'u6',
      'user',
      localTime(2026, 9, 15, 0, 1),
    );

    assert.equal(
      areMessagesInSameVisualGroup(start, boundary),
      true,
    );
    assert.equal(
      areMessagesInSameVisualGroup(start, outsideWindow),
      false,
    );
    assert.equal(
      areMessagesInSameVisualGroup(start, assistant),
      false,
    );
    assert.equal(
      areMessagesInSameVisualGroup(start, reversed),
      false,
    );
    assert.equal(
      areMessagesInSameVisualGroup(
        beforeMidnight,
        afterMidnight,
      ),
      false,
    );
  },
);

test(
  'list builder annotates visual group position without mutating the chat message model',
  () => {
    const base = localTime(2026, 9, 14, 10, 0);
    const messages = [
      message('u1', 'user', base),
      message('u2', 'user', base + 60_000),
      message('u3', 'user', base + 120_000),
      message('a1', 'assistant', base + 180_000),
      message('a2', 'assistant', base + 240_000),
      message('u4', 'user', base + 15 * 60_000),
    ];

    const positions = buildMessageListItems(messages)
      .filter((item) => item.kind === 'message')
      .map((item) => item.groupPosition);

    assert.deepEqual(
      positions,
      ['first', 'middle', 'last', 'first', 'last', 'single'],
    );
    assert.doesNotMatch(chatTypes, /groupPosition/);
  },
);

test(
  'message presentation consumes group metadata for spacing, shape, and timestamp hierarchy',
  () => {
    assert.match(list, /groupPosition=\{item\.groupPosition\}/);
    assert.match(bubble, /shouldShowTimestamp/);
    assert.match(bubble, /groupPosition === 'single'/);
    assert.match(bubble, /groupPosition === 'last'/);
    assert.match(bubbleSurface, /firstSpacing/);
    assert.match(bubbleSurface, /middleSpacing/);
    assert.match(bubbleSurface, /lastSpacing/);
    assert.match(bubbleSurface, /userConnectionRTL/);
    assert.match(bubbleSurface, /assistantConnectionRTL/);
  },
);
