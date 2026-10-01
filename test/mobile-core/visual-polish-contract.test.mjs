import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const insetCard = fs.readFileSync(
  'src/design-system/components/InsetSurfaceCard.tsx',
  'utf8',
);
const settings = fs.readFileSync(
  'src/features/settings/SettingsScreen.tsx',
  'utf8',
);
const settingToggle = fs.readFileSync(
  'src/features/settings/components/SettingToggleRow.tsx',
  'utf8',
);
const emptyChat = fs.readFileSync(
  'src/features/chat/components/EmptyChatState.tsx',
  'utf8',
);
const quickAction = fs.readFileSync(
  'src/features/chat/components/QuickActionButton.tsx',
  'utf8',
);

const headers = [
  'src/features/chat/components/ChatHeader.tsx',
  'src/features/settings/components/SettingsScreenHeader.tsx',
  'src/features/conversations/components/ConversationHistoryHeader.tsx',
  'src/features/projects/components/ProjectScreenHeader.tsx',
  'src/features/projects/components/ProjectDetailHeader.tsx',
  'src/features/companion/components/CompanionScreenHeader.tsx',
  'src/features/voice/components/VoiceScreenHeader.tsx',
  'src/features/diagnostics/components/DiagnosticsScreenHeader.tsx',
].map((file) => [
  file,
  fs.readFileSync(file, 'utf8'),
]);

test(
  'primary surfaces use shared inset-card hierarchy rather than flat settings rows',
  () => {
    assert.match(insetCard, /AdaptiveGlassSurface/);
    assert.match(insetCard, /borderRadius:\s*radius\.xl/);
    assert.match(insetCard, /shadowRadius:\s*18/);

    assert.match(settings, /SettingsSectionCard/);
    assert.ok(
      (settings.match(/<SettingsSectionCard>/g) ?? [])
        .length >= 4,
    );
  },
);

test(
  'settings toggles use the MUDRIK accent palette instead of platform default colors',
  () => {
    assert.match(settingToggle, /trackColor=\{\{/);
    assert.match(settingToggle, /true:\s*colors\.accentSoft/);
    assert.match(settingToggle, /thumbColor=/);
    assert.match(settingToggle, /colors\.accent/);
  },
);

test(
  'home empty state has a centered elevated hero and the quick action remains reduced-motion aware',
  () => {
    assert.match(emptyChat, /styles\.hero/);
    assert.match(emptyChat, /alignItems:\s*'center'/);
    assert.match(emptyChat, /textAlign:\s*'center'/);
    assert.match(emptyChat, /logoHalo/);

    assert.match(quickAction, /useAccessibility/);
    assert.match(quickAction, /reducedMotion/);
    assert.match(quickAction, /colors\.surface/);
    assert.match(quickAction, /motion\.press\.scale/);
  },
);

test(
  'major screen headers keep a common professional height and surface hierarchy',
  () => {
    for (const [file, source] of headers) {
      assert.match(
        source,
        /minHeight:\s*(?:70|72)/,
        file,
      );
      assert.match(
        source,
        /backgroundColor:\s*colors\.background/,
        file,
      );
    }
  },
);
