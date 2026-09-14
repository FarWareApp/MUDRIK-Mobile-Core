import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const button = fs.readFileSync(
  'src/features/attachments/components/AttachmentRemoveButton.tsx',
  'utf8',
);
const icon = fs.readFileSync(
  'src/features/attachments/components/AttachmentRemoveIcon.tsx',
  'utf8',
);

test(
  'attachment remove action keeps an accessible 44 point target with localized semantics',
  () => {
    assert.match(button, /accessibilityRole="button"/);
    assert.match(button, /accessibilityLabel=\{t\('removeAttachment'\)\}/);
    assert.match(button, /accessibilityState=\{\{ disabled \}\}/);
    assert.match(button, /width:\s*44/);
    assert.match(button, /height:\s*44/);
  },
);

test(
  'attachment remove visual is platform stable and positioned on the semantic trailing edge',
  () => {
    assert.match(button, /AttachmentRemoveIcon/);
    assert.doesNotMatch(button, /×/u);
    assert.doesNotMatch(button, /<Text\b/);
    assert.match(button, /end:\s*-8/);
    assert.doesNotMatch(button, /right:\s*-8/);
    assert.match(
      icon,
      /importantForAccessibility="no-hide-descendants"/,
    );
    assert.match(icon, /rotate:\s*'45deg'/);
    assert.match(icon, /rotate:\s*'-45deg'/);
    assert.doesNotMatch(icon, /<Text\b/);
  },
);
