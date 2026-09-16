import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const provider = fs.readFileSync(
  'src/core/accessibility/AccessibilityProvider.tsx',
  'utf8',
);
const observer = fs.readFileSync(
  'src/core/accessibility/useSystemAccessibilityState.ts',
  'utf8',
);

test(
  'accessibility provider delegates native observation to one focused hook',
  () => {
    assert.match(
      provider,
      /useSystemAccessibilityState\(\)/,
    );
    assert.doesNotMatch(
      provider,
      /AccessibilityInfo/,
    );
    assert.doesNotMatch(
      provider,
      /\bPlatform\b/,
    );
    assert.doesNotMatch(
      provider,
      /useEffect/,
    );

    assert.match(
      observer,
      /AccessibilityInfo/,
    );
    assert.match(
      observer,
      /useWindowDimensions/,
    );
  },
);

test(
  'system accessibility queries contain rejection paths and fail toward reduced effects',
  () => {
    assert.match(
      observer,
      /isReduceMotionEnabled\(\)[\s\S]*?\.catch\(\(\) => \{[\s\S]*?commitReducedMotion\(true\);/,
    );
    assert.match(
      observer,
      /isReduceTransparencyEnabled\(\)[\s\S]*?\.catch\(\(\) => \{[\s\S]*?commitReducedTransparency\(true\);/,
    );
    assert.doesNotMatch(
      observer,
      /console\.(?:log|warn|error)/,
    );
  },
);

test(
  'system accessibility async state commits are mounted-guarded and subscriptions are removed',
  () => {
    const mountedGuards = observer.match(
      /if \(mounted\) \{/g,
    ) ?? [];
    const removals = observer.match(
      /subscription\.remove\(\);/g,
    ) ?? [];

    assert.equal(mountedGuards.length, 2);
    assert.equal(removals.length, 2);
    assert.match(
      observer,
      /return \(\) => \{\s*mounted = false;\s*subscription\.remove\(\);/,
    );
  },
);

test(
  'reduced transparency observation remains iOS-only while reduced motion is cross-platform',
  () => {
    assert.match(
      observer,
      /if \(Platform\.OS !== 'ios'\) \{\s*return;/,
    );
    assert.match(
      observer,
      /'reduceMotionChanged'/,
    );
    assert.match(
      observer,
      /'reduceTransparencyChanged'/,
    );
  },
);

test(
  'provider preserves user reduced-motion override and stable public accessibility shape',
  () => {
    assert.match(
      provider,
      /settings\s*\.reducedMotion\s*\|\|\s*systemReducedMotion/,
    );

    for (const field of [
      'reducedMotion',
      'systemReducedMotion',
      'reducedTransparency',
      'systemReducedTransparency',
      'hapticsEnabled',
      'fontScale',
    ]) {
      assert.match(
        provider,
        new RegExp(`\\b${field}\\b`),
      );
    }
  },
);
