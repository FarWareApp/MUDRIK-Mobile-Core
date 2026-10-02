import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const insetCard = fs.readFileSync(
  'src/design-system/components/InsetSurfaceCard.tsx',
  'utf8',
);
const premiumHero = fs.readFileSync(
  'src/design-system/components/PremiumHeroSurface.tsx',
  'utf8',
);
const depthTokens = fs.readFileSync(
  'src/design-system/tokens/depth.ts',
  'utf8',
);
const flagshipTokens = fs.readFileSync(
  'src/design-system/tokens/flagship.ts',
  'utf8',
);
const colorTokens = fs.readFileSync(
  'src/design-system/tokens/colors.ts',
  'utf8',
);
const flagshipBackdrop = fs.readFileSync(
  'src/design-system/components/FlagshipBackdrop.tsx',
  'utf8',
);
const flagshipSafeArea = fs.readFileSync(
  'src/design-system/components/FlagshipSafeAreaScreen.tsx',
  'utf8',
);
const flagshipHeaderIdentity = fs.readFileSync(
  'src/design-system/components/FlagshipHeaderIdentity.tsx',
  'utf8',
);
const homeCommandTile = fs.readFileSync(
  'src/features/chat/components/HomeCommandTile.tsx',
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
  'premium hero surfaces provide shared brand depth without expensive platform-only effects',
  () => {
    assert.match(premiumHero, /AdaptiveGlassSurface/);
    assert.match(premiumHero, /LinearGradient/);
    assert.match(premiumHero, /depth\.elevated/);
    assert.match(premiumHero, /styles\.accentRail/);
    assert.match(premiumHero, /styles\.auraOuter/);
    assert.match(premiumHero, /palette\.warmGlow/);
    assert.match(premiumHero, /pointerEvents="none"/);
    assert.match(depthTokens, /floating:/);
    assert.doesNotMatch(premiumHero, /Math\.random/);
  },
);

test(
  'primary surfaces use shared inset-card hierarchy rather than flat settings rows',
  () => {
    assert.match(insetCard, /AdaptiveGlassSurface/);
    assert.match(insetCard, /LinearGradient/);
    assert.match(insetCard, /palette\.card/);
    assert.match(insetCard, /borderRadius:\s*radius\.xl/);
    assert.match(insetCard, /depth\.subtle/);

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
    assert.match(emptyChat, /PremiumHeroSurface/);
    assert.match(emptyChat, /radius\.xxl/);
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
        /minHeight:\s*(?:72|82|84)/,
        file,
      );
      assert.match(
        source,
        /backgroundColor:\s*'transparent'/,
        file,
      );
    }
  },
);

test(
  'flagship route headers share one branded accessible identity primitive',
  () => {
    assert.match(
      flagshipHeaderIdentity,
      /accessibilityRole="header"/,
    );
    assert.match(
      flagshipHeaderIdentity,
      />\s*MUDRIK\s*</,
    );
    assert.match(
      flagshipHeaderIdentity,
      /LinearGradient/,
    );
    assert.match(
      flagshipHeaderIdentity,
      /palette\.metal/,
    );
    assert.match(
      flagshipHeaderIdentity,
      /colors\.accent/,
    );

    for (const file of [
      'src/features/settings/components/SettingsScreenHeader.tsx',
      'src/features/conversations/components/ConversationHistoryHeader.tsx',
      'src/features/projects/components/ProjectScreenHeader.tsx',
      'src/features/projects/components/ProjectDetailHeader.tsx',
      'src/features/companion/components/CompanionScreenHeader.tsx',
      'src/features/voice/components/VoiceScreenHeader.tsx',
      'src/features/diagnostics/components/DiagnosticsScreenHeader.tsx',
    ]) {
      const source = fs.readFileSync(
        file,
        'utf8',
      );
      assert.match(
        source,
        /FlagshipHeaderIdentity/,
        file,
      );
      assert.match(
        source,
        /minHeight:\s*84/,
        file,
      );
    }
  },
);

test(
  'companion controls share the MUDRIK switch palette',
  () => {
    const source = fs.readFileSync(
      'src/features/companion/components/CompanionToggleRow.tsx',
      'utf8',
    );

    assert.match(source, /trackColor=\{\{/);
    assert.match(source, /true:\s*colors\.accentSoft/);
    assert.match(source, /thumbColor=/);
    assert.match(source, /colors\.accent/);
  },
);

test(
  'attachment previews use drawn media primitives instead of text glyph icons',
  () => {
    const icon = fs.readFileSync(
      'src/features/attachments/components/AttachmentKindIcon.tsx',
      'utf8',
    );
    const message = fs.readFileSync(
      'src/features/chat/components/MessageAttachmentItem.tsx',
      'utf8',
    );
    const draft = fs.readFileSync(
      'src/features/attachments/components/AttachmentDraftItem.tsx',
      'utf8',
    );

    assert.match(icon, /videoFrame/);
    assert.match(icon, /playTriangle/);
    assert.match(icon, /fileFrame/);
    assert.match(message, /AttachmentKindIcon/);
    assert.match(draft, /AttachmentKindIcon/);
    assert.doesNotMatch(message, /[▶▤]/u);
    assert.doesNotMatch(draft, /[▶▤]/u);
  },
);

test(
  'project editor modal uses the themed overlay token',
  () => {
    const source = fs.readFileSync(
      'src/features/projects/components/ProjectEditorModal.tsx',
      'utf8',
    );

    assert.match(
      source,
      /backgroundColor:\s*colors\.overlay/,
    );
    assert.doesNotMatch(
      source,
      /rgba\(0,0,0,0\.48\)/,
    );
  },
);

test(
  'project empty state offers an intentional visual and the existing create flow',
  () => {
    const state = fs.readFileSync(
      'src/features/projects/components/ProjectListState.tsx',
      'utf8',
    );
    const commandCenter = fs.readFileSync(
      'src/features/projects/components/ProjectEmptyCommandCenter.tsx',
      'utf8',
    );
    const icon = fs.readFileSync(
      'src/features/projects/components/ProjectEmptyIcon.tsx',
      'utf8',
    );
    const screen = fs.readFileSync(
      'src/features/projects/ProjectsScreen.tsx',
      'utf8',
    );

    assert.match(state, /ProjectEmptyCommandCenter/);
    assert.match(state, /onCreateProject/);
    assert.match(commandCenter, /ProjectEmptyIcon/);
    assert.match(commandCenter, /FlagshipActionButton/);
    assert.match(commandCenter, /PremiumHeroSurface/);
    assert.match(commandCenter, /projectsEmptyTitle/);
    assert.match(commandCenter, /projectsEmptyFiles/);
    assert.match(commandCenter, /projectsEmptyConversations/);
    assert.match(commandCenter, /projectsEmptyArchive/);
    assert.doesNotMatch(commandCenter, /Math\.random/);
    assert.match(icon, /styles\.folder/);
    assert.match(icon, /styles\.plusHorizontal/);
    assert.match(icon, /styles\.plusVertical/);
    assert.doesNotMatch(icon, /<Text\b/);

    assert.match(
      screen,
      /stateMode === 'empty'[\s\S]*?setCreateOpen\(true\)/,
    );
  },
);

test(
  'companion avatar mark uses a clean presence silhouette rather than crossed orbit geometry',
  () => {
    const source = fs.readFileSync(
      'src/features/companion/components/CompanionAvatarMark.tsx',
      'utf8',
    );

    assert.match(source, /presenceHalo/);
    assert.match(source, /styles\.head/);
    assert.match(source, /styles\.shoulders/);
    assert.match(source, /presentation === 'female'/);
    assert.match(source, /activeDot/);
    assert.doesNotMatch(source, /styles\.orbit/);
    assert.doesNotMatch(source, /styles\.bridge/);
    assert.doesNotMatch(source, /<Text\b/);
  },
);

test(
  'empty chat is a real command center with routed capability surfaces',
  () => {
    const emptyState = fs.readFileSync(
      'src/features/chat/components/EmptyChatState.tsx',
      'utf8',
    );
    const messageList = fs.readFileSync(
      'src/features/chat/components/MessageList.tsx',
      'utf8',
    );
    const chatScreen = fs.readFileSync(
      'src/features/chat/ChatScreen.tsx',
      'utf8',
    );
    const tile = fs.readFileSync(
      'src/features/chat/components/HomeCommandTile.tsx',
      'utf8',
    );

    assert.match(emptyState, /HomeCommandTile/);
    assert.match(emptyState, /HomeVoiceIcon/);
    assert.match(emptyState, /QuickActionConversationsIcon/);
    assert.match(emptyState, /QuickActionProjectsIcon/);
    assert.match(emptyState, /QuickActionCompanionIcon/);
    assert.match(emptyState, /QuickActionSettingsIcon/);

    assert.match(messageList, /onVoice/);
    assert.match(messageList, /onConversations/);
    assert.match(messageList, /onProjects/);
    assert.match(messageList, /onCompanion/);
    assert.match(messageList, /onSettings/);

    for (const route of [
      '/voice',
      '/conversations',
      '/projects',
      '/companion',
      '/settings',
    ]) {
      assert.match(
        chatScreen,
        new RegExp(
          route.replace('/', '\\/'),
        ),
      );
    }

    assert.match(tile, /accessibilityHint=\{description\}/);
    assert.match(tile, /motion\.press[\s\S]*?\.subtleScale/);
    assert.match(tile, /minHeight:\s*136/);
    assert.match(tile, /LinearGradient/);
    assert.match(tile, /palette[\s\S]*?\.primaryAction/);
    assert.match(tile, /palette[\s\S]*?\.card/);
  },
);

test(
  'short conversations anchor toward the composer while empty home remains flexible',
  () => {
    const messageList = fs.readFileSync(
      'src/features/chat/components/MessageList.tsx',
      'utf8',
    );

    assert.match(messageList, /styles\.filledContent/);
    assert.match(messageList, /flexGrow:\s*1/);
    assert.match(messageList, /justifyContent:\s*'flex-end'/);
    assert.match(messageList, /styles\.emptyContent/);
  },
);


test(
  'flagship identity uses graphite emerald and warm metal without purple AI-neon cues',
  () => {
    const combined =
      flagshipTokens
      + colorTokens
      + premiumHero
      + flagshipBackdrop
      + homeCommandTile;

    assert.doesNotMatch(
      combined,
      /purple|violet/iu,
    );
    assert.doesNotMatch(
      combined,
      /106,92,255|118,100,255|#5A54E8|#755DEB/iu,
    );

    assert.match(
      flagshipTokens,
      /metal:/,
    );
    assert.match(
      flagshipTokens,
      /warmGlow:/,
    );
    assert.match(
      colorTokens,
      /accent:\s*'#59CBA4'/,
    );
    assert.match(
      flagshipBackdrop,
      /architecturalBeam/,
    );
    assert.match(
      flagshipBackdrop,
      /warmField/,
    );
  },
);

test(
  'major product routes share the flagship safe-area stage',
  () => {
    assert.match(
      flagshipSafeArea,
      /FlagshipScreen/,
    );
    assert.match(
      flagshipSafeArea,
      /backgroundColor:\s*'transparent'/,
    );

    for (const file of [
      'src/features/chat/ChatScreen.tsx',
      'src/features/settings/SettingsScreen.tsx',
      'src/features/voice/VoiceScreen.tsx',
      'src/features/companion/CompanionScreen.tsx',
      'src/features/projects/ProjectsScreen.tsx',
      'src/features/projects/ProjectDetailScreen.tsx',
      'src/features/conversations/ConversationsScreen.tsx',
      'src/features/diagnostics/DiagnosticsScreen.tsx',
      'src/features/capabilities/CapabilitiesScreen.tsx',
    ]) {
      const source = fs.readFileSync(
        file,
        'utf8',
      );

      assert.match(
        source,
        /FlagshipSafeAreaScreen/,
        file,
      );
    }
  },
);

test(
  'home presence deck exposes only real local-first product facts',
  () => {
    const deck = fs.readFileSync(
      'src/features/chat/components/HomePresenceDeck.tsx',
      'utf8',
    );
    const emptyState = fs.readFileSync(
      'src/features/chat/components/EmptyChatState.tsx',
      'utf8',
    );
    const voiceProfile = fs.readFileSync(
      'src/features/voice/VoiceRecordingProfile.ts',
      'utf8',
    );

    assert.match(emptyState, /HomePresenceDeck/);
    assert.match(deck, /MUDRIK_VOICE_SAMPLE_RATE/);
    assert.match(deck, /AR · DE · EN/);
    assert.match(deck, /flagshipPalette/);
    assert.match(deck, /LinearGradient/);
    assert.match(deck, /homePresenceLocal/);
    assert.match(deck, /homePresenceVoice/);
    assert.match(deck, /homePresenceLanguages/);
    assert.match(
      voiceProfile,
      /MUDRIK_VOICE_SAMPLE_RATE\s*=\s*48_000/,
    );

    assert.doesNotMatch(
      deck,
      /Math\.random|92%|127|fake|mock/i,
    );
  },
);

test(
  'home command hierarchy differentiates product domains without introducing off-brand colors',
  () => {
    const tile = fs.readFileSync(
      'src/features/chat/components/HomeCommandTile.tsx',
      'utf8',
    );
    const emptyState = fs.readFileSync(
      'src/features/chat/components/EmptyChatState.tsx',
      'utf8',
    );

    assert.match(tile, /'standard'/);
    assert.match(tile, /'metal'/);
    assert.match(tile, /'emerald'/);
    assert.match(tile, /palette\.metal/);
    assert.match(tile, /palette\.warmGlow/);
    assert.match(tile, /colors\.accentSoft/);
    assert.match(tile, /styles\.toneField/);

    assert.match(
      emptyState,
      /tone="metal"[\s\S]*?label=\{t\('projects'\)\}/,
    );
    assert.match(
      emptyState,
      /tone="emerald"[\s\S]*?label=\{t\('companion'\)\}/,
    );

    assert.doesNotMatch(
      tile,
      /#(?:7[0-9A-Fa-f]{5}|8[0-9A-Fa-f]{5}|9[0-9A-Fa-f]{5})/,
    );
  },
);
