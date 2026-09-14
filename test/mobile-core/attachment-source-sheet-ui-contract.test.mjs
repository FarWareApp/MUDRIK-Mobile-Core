import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const sheet = fs.readFileSync(
  'src/features/attachments/components/AttachmentSourceSheet.tsx',
  'utf8',
);
const action = fs.readFileSync(
  'src/features/attachments/components/AttachmentSourceAction.tsx',
  'utf8',
);
const chevron = fs.readFileSync(
  'src/features/attachments/components/AttachmentSourceChevronIcon.tsx',
  'utf8',
);

test(
  'attachment source sheet dismisses the keyboard and preserves modal accessibility semantics',
  () => {
    assert.match(sheet, /\bKeyboard\b/);
    assert.match(sheet, /onShow=\{Keyboard\.dismiss\}/);
    assert.match(sheet, /accessibilityViewIsModal/);
    assert.match(sheet, /accessibilityRole="header"/);
    assert.match(sheet, /onRequestClose=\{onDismiss\}/);
    assert.match(sheet, /reducedMotion \? 'none' : 'fade'/);
  },
);

test(
  'attachment source actions keep large targets and use a stable RTL-aware chevron primitive',
  () => {
    assert.match(action, /minHeight:\s*56/);
    assert.match(action, /actionRTL/);
    assert.match(action, /AttachmentSourceChevronIcon/);
    assert.doesNotMatch(action, /[‹›]/u);
    assert.match(chevron, /isRTL/);
    assert.match(chevron, /scaleX:\s*-1/);
    assert.match(
      chevron,
      /importantForAccessibility="no-hide-descendants"/,
    );
    assert.match(chevron, /rotate:\s*'45deg'/);
    assert.match(chevron, /rotate:\s*'-45deg'/);
  },
);

test(
  'attachment source sheet keeps safe-area bottom protection and localized cancellation',
  () => {
    assert.match(sheet, /useSafeAreaInsets/);
    assert.match(
      sheet,
      /Math\.max\([\s\S]*?insets\.bottom,[\s\S]*?spacing\.lg/,
    );
    assert.match(sheet, /accessibilityLabel=\{t\('cancel'\)\}/);
    assert.match(sheet, /minHeight:\s*52/);
  },
);
