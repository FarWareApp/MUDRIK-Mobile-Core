import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const accessibility = fs.readFileSync(
  'src/core/accessibility/AccessibilityProvider.tsx',
  'utf8',
);
const systemAccessibility = fs.readFileSync(
  'src/core/accessibility/useSystemAccessibilityState.ts',
  'utf8',
);
const adaptiveGlass = fs.readFileSync(
  'src/design-system/components/AdaptiveGlassSurface.tsx',
  'utf8',
);
const motion = fs.readFileSync(
  'src/design-system/tokens/motion.ts',
  'utf8',
);
const quickActionItem = fs.readFileSync(
  'src/features/chat/components/QuickActionMenuItem.tsx',
  'utf8',
);
const quickActionBackdrop = fs.readFileSync(
  'src/features/chat/components/QuickActionBackdrop.tsx',
  'utf8',
);
const attachmentDraft = fs.readFileSync(
  'src/features/attachments/components/AttachmentDraftItem.tsx',
  'utf8',
);

test(
  'design runtime exposes centralized motion timing, stagger and press tokens',
  () => {
    assert.match(motion, /duration:\s*{/);
    assert.match(motion, /stagger:\s*{/);
    assert.match(motion, /spring:\s*{/);
    assert.match(motion, /press:\s*{/);
    assert.match(motion, /subtleScale:\s*0\.985/);
  },
);

test(
  'accessibility runtime tracks iOS reduce-transparency state through the dedicated system observer',
  () => {
    assert.match(
      systemAccessibility,
      /isReduceTransparencyEnabled\(\)/,
    );
    assert.match(
      systemAccessibility,
      /'reduceTransparencyChanged'/,
    );
    assert.match(
      systemAccessibility,
      /Platform\.OS !== 'ios'/,
    );
    assert.match(
      accessibility,
      /useSystemAccessibilityState\(\)/,
    );
    assert.match(
      accessibility,
      /reducedTransparency:/,
    );
    assert.match(
      accessibility,
      /systemReducedTransparency/,
    );
  },
);

test(
  'adaptive glass checks runtime support and always retains a regular View fallback',
  () => {
    assert.match(
      adaptiveGlass,
      /isGlassEffectAPIAvailable\(\)/,
    );
    assert.match(
      adaptiveGlass,
      /isLiquidGlassAvailable\(\)/,
    );
    assert.match(
      adaptiveGlass,
      /!reducedTransparency/,
    );
    assert.match(adaptiveGlass, /<GlassView/);
    assert.match(adaptiveGlass, /<View/);
  },
);

test(
  'quick actions consume shared motion and adaptive glass primitives',
  () => {
    assert.match(
      quickActionItem,
      /AdaptiveGlassSurface/,
    );
    assert.match(
      quickActionItem,
      /motion\.duration\.fast/,
    );
    assert.match(
      quickActionItem,
      /motion\.stagger\.compact/,
    );
    assert.match(
      quickActionBackdrop,
      /motion\.duration\.quick/,
    );
  },
);

test(
  'attachment draft images use Expo Image caching, recycling and shared transition timing',
  () => {
    assert.match(
      attachmentDraft,
      /from 'expo-image'/,
    );
    assert.match(
      attachmentDraft,
      /cachePolicy="memory-disk"/,
    );
    assert.match(
      attachmentDraft,
      /recyclingKey=\{attachment\.id\}/,
    );
    assert.match(
      attachmentDraft,
      /transition=\{motion\.duration\.fast\}/,
    );
    assert.doesNotMatch(
      attachmentDraft,
      /\bImage,\s*\n\s*StyleSheet/,
    );
  },
);
