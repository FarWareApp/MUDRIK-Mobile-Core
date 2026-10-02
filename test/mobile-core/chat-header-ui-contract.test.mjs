import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const header = fs.readFileSync(
  'src/features/chat/components/ChatHeader.tsx',
  'utf8',
);
const icon = fs.readFileSync(
  'src/features/chat/components/ChatNewConversationIcon.tsx',
  'utf8',
);
const flagshipButton = fs.readFileSync(
  'src/design-system/components/FlagshipIconButton.tsx',
  'utf8',
);

test(
  'chat header keeps a stable localized flagship new conversation affordance',
  () => {
    assert.match(header, /FlagshipIconButton/);
    assert.match(header, /primary/);
    assert.match(header, /size=\{48\}/);
    assert.ok(header.includes("t('newConversation')"));
    assert.match(header, /ChatNewConversationIcon/);
    assert.ok(!header.includes('>+</'));

    assert.match(
      flagshipButton,
      /accessibilityRole="button"/,
    );
    assert.match(
      flagshipButton,
      /accessibilityLabel/,
    );

    assert.match(
      icon,
      /importantForAccessibility="no-hide-descendants"/,
    );
    assert.doesNotMatch(icon, /<Text/);
  },
);

test(
  'chat header press feedback is delegated to the shared flagship motion contract',
  () => {
    assert.match(
      flagshipButton,
      /motion\.press/,
    );
    assert.match(
      flagshipButton,
      /primaryActionPressed/,
    );
    assert.match(
      flagshipButton,
      /LinearGradient/,
    );
    assert.match(
      flagshipButton,
      /reducedMotion/,
    );
  },
);
