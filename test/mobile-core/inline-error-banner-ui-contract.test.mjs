import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const banner = fs.readFileSync(
  'src/shared/components/InlineErrorBanner.tsx',
  'utf8',
);
const dismissIcon = fs.readFileSync(
  'src/shared/components/InlineErrorDismissIcon.tsx',
  'utf8',
);

test(
  'inline error banner announces dynamic failures while preserving localized actions',
  () => {
    assert.match(banner, /accessibilityRole="alert"/);
    assert.match(
      banner,
      /accessibilityLiveRegion="assertive"/,
    );
    assert.match(banner, /t\('retry'\)/);
    assert.match(banner, /t\('dismissError'\)/);
    assert.match(banner, /minWidth:\s*44/);
    assert.match(banner, /minHeight:\s*44/);
  },
);

test(
  'inline error layout uses semantic RTL padding and a platform-stable dismiss primitive',
  () => {
    assert.match(banner, /paddingStart:\s*spacing\.md/);
    assert.doesNotMatch(banner, /paddingLeft:/);
    assert.match(banner, /InlineErrorDismissIcon/);
    assert.doesNotMatch(banner, /×/u);
    assert.match(
      dismissIcon,
      /importantForAccessibility="no-hide-descendants"/,
    );
    assert.match(dismissIcon, /rotate:\s*'45deg'/);
    assert.match(dismissIcon, /rotate:\s*'-45deg'/);
  },
);
