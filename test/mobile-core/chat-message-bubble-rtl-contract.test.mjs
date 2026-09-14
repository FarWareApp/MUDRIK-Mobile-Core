import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const bubbleSurface = fs.readFileSync(
  'src/features/chat/components/MessageBubbleSurface.tsx',
  'utf8',
);

test(
  'message bubble geometry mirrors semantic start and end corners in RTL',
  () => {
    assert.match(bubbleSurface, /useLocale/);
    assert.match(bubbleSurface, /const \{ isRTL \} = useLocale\(\)/);
    assert.match(bubbleSurface, /userShapeLTR/);
    assert.match(bubbleSurface, /userShapeRTL/);
    assert.match(bubbleSurface, /assistantShapeLTR/);
    assert.match(bubbleSurface, /assistantShapeRTL/);
    assert.match(
      bubbleSurface,
      /userShapeLTR:[\s\S]*borderBottomRightRadius:\s*radius\.sm/,
    );
    assert.match(
      bubbleSurface,
      /userShapeRTL:[\s\S]*borderBottomLeftRadius:\s*radius\.sm/,
    );
    assert.match(
      bubbleSurface,
      /assistantShapeLTR:[\s\S]*borderBottomLeftRadius:\s*radius\.sm/,
    );
    assert.match(
      bubbleSurface,
      /assistantShapeRTL:[\s\S]*borderBottomRightRadius:\s*radius\.sm/,
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
