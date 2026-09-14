import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const menu = fs.readFileSync(
  'src/features/chat/components/QuickActionMenu.tsx',
  'utf8',
);
const item = fs.readFileSync(
  'src/features/chat/components/QuickActionMenuItem.tsx',
  'utf8',
);
const conversationsIcon = fs.readFileSync(
  'src/features/chat/components/QuickActionConversationsIcon.tsx',
  'utf8',
);
const projectsIcon = fs.readFileSync(
  'src/features/chat/components/QuickActionProjectsIcon.tsx',
  'utf8',
);
const companionIcon = fs.readFileSync(
  'src/features/chat/components/QuickActionCompanionIcon.tsx',
  'utf8',
);
const settingsIcon = fs.readFileSync(
  'src/features/chat/components/QuickActionSettingsIcon.tsx',
  'utf8',
);

test(
  'quick actions use dedicated platform-stable icon primitives instead of font glyphs',
  () => {
    for (const component of [
      'QuickActionConversationsIcon',
      'QuickActionProjectsIcon',
      'QuickActionCompanionIcon',
      'QuickActionSettingsIcon',
    ]) {
      assert.match(menu, new RegExp(component));
    }

    assert.doesNotMatch(menu, /[☰□◎⚙]/u);
    assert.match(item, /icon:\s*ReactNode/);
    assert.match(item, /\{icon\}/);
    assert.doesNotMatch(item, /symbolText/);
  },
);

test(
  'quick action item keeps the icon supplemental and uses semantic RTL padding',
  () => {
    assert.match(
      item,
      /importantForAccessibility="no-hide-descendants"/,
    );
    assert.match(item, /paddingStart:\s*spacing\.lg/);
    assert.match(item, /paddingEnd:\s*spacing\.sm/);
    assert.doesNotMatch(item, /paddingLeft:/);
    assert.doesNotMatch(item, /paddingRight:/);
    assert.match(item, /flexDirection:\s*'row-reverse'/);
  },
);

test(
  'quick action icon primitives remain simple view geometry',
  () => {
    assert.match(conversationsIcon, /styles\.line/);
    assert.match(projectsIcon, /borderWidth:\s*2/);
    assert.match(companionIcon, /styles\.head/);
    assert.match(companionIcon, /styles\.shoulders/);
    assert.match(settingsIcon, /styles\.track/);
    assert.match(settingsIcon, /styles\.knob/);

    for (const source of [
      conversationsIcon,
      projectsIcon,
      companionIcon,
      settingsIcon,
    ]) {
      assert.doesNotMatch(source, /<Text\b/);
    }
  },
);
