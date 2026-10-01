import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const sendingIndicator = fs.readFileSync(
  'src/features/chat/components/SendingIndicator.tsx',
  'utf8',
);
const sendingDot = fs.readFileSync(
  'src/features/chat/components/SendingIndicatorDot.tsx',
  'utf8',
);
const emptyState = fs.readFileSync(
  'src/features/chat/components/EmptyChatState.tsx',
  'utf8',
);
const premiumHero = fs.readFileSync(
  'src/design-system/components/PremiumHeroSurface.tsx',
  'utf8',
);
const attachmentList = fs.readFileSync(
  'src/features/chat/components/MessageAttachmentList.tsx',
  'utf8',
);
const attachmentItem = fs.readFileSync(
  'src/features/chat/components/MessageAttachmentItem.tsx',
  'utf8',
);
const attachmentFormatter = fs.readFileSync(
  'src/features/chat/formatters/formatAttachmentBytes.ts',
  'utf8',
);
const chatTranslations = fs.readFileSync(
  'src/core/localization/chatTranslations.ts',
  'utf8',
);

test(
  'sending indicator uses a focused dot primitive, shared motion and reduced-motion support',
  () => {
    assert.match(
      sendingIndicator,
      /SendingIndicatorDot/,
    );
    assert.match(
      sendingIndicator,
      /AdaptiveGlassSurface/,
    );
    assert.match(
      sendingIndicator,
      /t\('responseInProgress'\)/,
    );
    assert.match(
      sendingDot,
      /useSharedValue/,
    );
    assert.match(
      sendingDot,
      /withRepeat/,
    );
    assert.match(
      sendingDot,
      /reducedMotion/,
    );
    assert.match(
      sendingDot,
      /motion\.duration\.fast/,
    );
  },
);

test(
  'empty chat state consumes the shared premium glass hierarchy and design tokens',
  () => {
    assert.match(
      emptyState,
      /PremiumHeroSurface/,
    );
    assert.match(
      premiumHero,
      /AdaptiveGlassSurface/,
    );
    assert.match(
      emptyState,
      /motion\.duration\.standard/,
    );
    assert.match(
      emptyState,
      /spacing\.xl/,
    );
    assert.match(
      emptyState,
      /HomeCommandTile/,
    );
    assert.match(
      emptyState,
      /typography\.hero/,
    );
  },
);

test(
  'message attachment list is orchestration-only and delegates presentation and formatting',
  () => {
    assert.match(
      attachmentList,
      /MessageAttachmentItem/,
    );
    assert.doesNotMatch(
      attachmentList,
      /\bImage\b/,
    );
    assert.doesNotMatch(
      attachmentList,
      /formatBytes/,
    );
    assert.match(
      attachmentFormatter,
      /formatAttachmentBytes/,
    );
  },
);

test(
  'message attachment images use Expo Image performance features and localized fallback states',
  () => {
    assert.match(
      attachmentItem,
      /from 'expo-image'/,
    );
    assert.match(
      attachmentItem,
      /cachePolicy="memory-disk"/,
    );
    assert.match(
      attachmentItem,
      /recyclingKey=\{attachment\.id\}/,
    );
    assert.match(
      attachmentItem,
      /transition=\{motion\.duration\.fast\}/,
    );
    assert.match(
      attachmentItem,
      /t\('attachmentUnavailable'\)/,
    );
    assert.match(
      attachmentItem,
      /t\('unavailableOnThisDevice'\)/,
    );

    for (const key of [
      'responseInProgress',
      'attachmentUnavailable',
      'unavailableOnThisDevice',
    ]) {
      const pattern = new RegExp(
        `^\\s*${key}:\\s`,
        'gm',
      );
      assert.equal(
        chatTranslations.match(pattern)?.length,
        3,
      );
    }
  },
);
