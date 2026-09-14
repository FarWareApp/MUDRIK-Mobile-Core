import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const bubbleSurface = fs.readFileSync(
  'src/features/chat/components/MessageBubbleSurface.tsx',
  'utf8',
);

test(
  'message bubble tail geometry mirrors semantic start and end corners in RTL',
  () => {
    assert.match(bubbleSurface, /useLocale/);
    assert.match(bubbleSurface, /const \{ isRTL \} = useLocale\(\)/);
    assert.match(
      bubbleSurface,
      /userTailLTR:[\s\S]*?borderBottomRightRadius:\s*radius\.sm/,
    );
    assert.match(
      bubbleSurface,
      /userTailRTL:[\s\S]*?borderBottomLeftRadius:\s*radius\.sm/,
    );
    assert.match(
      bubbleSurface,
      /assistantTailLTR:[\s\S]*?borderBottomLeftRadius:\s*radius\.sm/,
    );
    assert.match(
      bubbleSurface,
      /assistantTailRTL:[\s\S]*?borderBottomRightRadius:\s*radius\.sm/,
    );
  },
);

test(
  'group connection geometry mirrors semantic corners in RTL',
  () => {
    assert.match(
      bubbleSurface,
      /userConnectionLTR:[\s\S]*?borderTopRightRadius:\s*radius\.sm/,
    );
    assert.match(
      bubbleSurface,
      /userConnectionRTL:[\s\S]*?borderTopLeftRadius:\s*radius\.sm/,
    );
    assert.match(
      bubbleSurface,
      /assistantConnectionLTR:[\s\S]*?borderTopLeftRadius:\s*radius\.sm/,
    );
    assert.match(
      bubbleSurface,
      /assistantConnectionRTL:[\s\S]*?borderTopRightRadius:\s*radius\.sm/,
    );
  },
);

test(
  'bubble placement remains semantic instead of hardcoding physical sides',
  () => {
    assert.match(
      bubbleSurface,
      /alignSelf:\s*isUser[\s\S]*\? 'flex-end'[\s\S]*: 'flex-start'/,
    );
  },
);
