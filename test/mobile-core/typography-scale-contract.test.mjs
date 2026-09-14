import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const typography = fs.readFileSync(
  'src/design-system/tokens/typography.ts',
  'utf8',
);
const messageText = fs.readFileSync(
  'src/features/chat/components/MessageText.tsx',
  'utf8',
);
const messageTimestamp = fs.readFileSync(
  'src/features/chat/components/MessageTimestamp.tsx',
  'utf8',
);
const dateSeparator = fs.readFileSync(
  'src/features/chat/components/MessageDateSeparator.tsx',
  'utf8',
);
const quickActionItem = fs.readFileSync(
  'src/features/chat/components/QuickActionMenuItem.tsx',
  'utf8',
);

test(
  'design system exposes paired font-size and line-height type scale',
  () => {
    for (const role of [
      'title',
      'heading',
      'body',
      'secondary',
      'caption',
      'micro',
    ]) {
      assert.match(
        typography,
        new RegExp(
          `${role}: \\{[\\s\\S]*?fontSize:[\\s\\S]*?lineHeight:`,
        ),
      );
    }
  },
);

test(
  'message typography consumes semantic type scale instead of raw metrics',
  () => {
    assert.match(messageText, /\.\.\.typeScale\.body/);
    assert.match(messageTimestamp, /\.\.\.typeScale\.micro/);
    assert.match(dateSeparator, /\.\.\.typeScale\.caption/);

    assert.doesNotMatch(
      messageText,
      /fontSize:\s*16|lineHeight:\s*23/,
    );
    assert.doesNotMatch(
      messageTimestamp,
      /fontSize:\s*11|lineHeight:\s*15/,
    );
    assert.doesNotMatch(
      dateSeparator,
      /fontSize:\s*12|lineHeight:\s*16/,
    );
  },
);

test(
  'quick action labels share the secondary text rhythm',
  () => {
    assert.match(
      quickActionItem,
      /\.\.\.typeScale\.secondary/,
    );
    assert.doesNotMatch(
      quickActionItem,
      /fontSize:\s*typography\.secondary/,
    );
  },
);
