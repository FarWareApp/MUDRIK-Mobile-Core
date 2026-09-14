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

test(
  'chat header keeps a stable localized new conversation affordance',
  () => {
    assert.match(header, /accessibilityRole="button"/);
    assert.match(header, /t\('newConversation'\)/);
    assert.match(header, /width:\s*46/);
    assert.match(header, /height:\s*46/);
    assert.match(header, /ChatNewConversationIcon/);
    assert.doesNotMatch(header, />\s*\+\s*</);
    assert.match(
      icon,
      /importantForAccessibility="no-hide-descendants"/,
    );
    assert.doesNotMatch(icon, /<Text\b/);
  },
);

test(
  'chat header press feedback uses the shared motion contract',
  () => {
    assert.match(header, /motion\.press\.scale/);
    assert.doesNotMatch(header, /\?\s*0\.96/);
    assert.match(header, /surfacePressed/);
  },
);
