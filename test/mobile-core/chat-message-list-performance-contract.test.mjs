import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const list = fs.readFileSync(
  'src/features/chat/components/MessageList.tsx',
  'utf8',
);
const bubble = fs.readFileSync(
  'src/features/chat/components/MessageBubble.tsx',
  'utf8',
);
const dateSeparator = fs.readFileSync(
  'src/features/chat/components/MessageDateSeparator.tsx',
  'utf8',
);

test(
  'message list memoizes derived rows and keeps FlatList callbacks stable',
  () => {
    assert.match(list, /useMemo/);
    assert.match(
      list,
      /useMemo\([\s\S]*?buildMessageListItems\(messages\)[\s\S]*?\[messages\]/,
    );
    assert.match(list, /useCallback/);
    assert.match(
      list,
      /keyExtractor=\{getMessageListItemKey\}/,
    );
    assert.match(
      list,
      /renderItem=\{renderMessageListItem\}/,
    );
    assert.match(
      list,
      /onContentSizeChange=\{handleContentSizeChange\}/,
    );
    assert.doesNotMatch(
      list,
      /keyExtractor=\{\(item\)/,
    );
  },
);

test(
  'message rows avoid rerendering unchanged presentation work',
  () => {
    assert.match(bubble, /\bmemo\(/);
    assert.match(dateSeparator, /\bmemo\(/);
  },
);

test(
  'message list keeps reduced-motion-aware end following behavior',
  () => {
    assert.match(list, /shouldFollowEndRef/);
    assert.match(list, /isNearMessageListEnd/);
    assert.match(
      list,
      /animated:\s*!reducedMotion/,
    );
  },
);
