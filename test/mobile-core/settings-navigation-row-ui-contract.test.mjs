import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const row = fs.readFileSync(
  'src/features/settings/components/SettingsNavigationRow.tsx',
  'utf8',
);
const chevron = fs.readFileSync(
  'src/features/settings/components/SettingsNavigationChevronIcon.tsx',
  'utf8',
);

test(
  'settings navigation row keeps semantic button accessibility and stable chevron rendering',
  () => {
    assert.match(row, /accessibilityRole="button"/);
    assert.match(row, /accessibilityLabel=\{accessibilityLabel\}/);
    assert.match(row, /SettingsNavigationChevronIcon/);
    assert.doesNotMatch(row, /›/u);
    assert.match(
      chevron,
      /importantForAccessibility="no-hide-descendants"/,
    );
    assert.doesNotMatch(chevron, /<Text\b/);
  },
);

test(
  'settings navigation geometry uses semantic trailing spacing and mirrors in RTL',
  () => {
    assert.match(row, /const \{ isRTL \} = useLocale\(\)/);
    assert.match(row, /paddingEnd:\s*spacing\.md/);
    assert.doesNotMatch(row, /paddingRight:/);
    assert.match(row, /isRTL=\{isRTL\}/);
    assert.match(chevron, /isRTL/);
    assert.match(chevron, /scaleX:\s*-1/);
    assert.match(chevron, /rotate:\s*'45deg'/);
    assert.match(chevron, /rotate:\s*'-45deg'/);
  },
);
