import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const chatScreen = fs.readFileSync(
  'src/features/chat/ChatScreen.tsx',
  'utf8',
);
const messageList = fs.readFileSync(
  'src/features/chat/components/MessageList.tsx',
  'utf8',
);
const conversationList = fs.readFileSync(
  'src/features/conversations/components/ConversationHistoryList.tsx',
  'utf8',
);
const projectList = fs.readFileSync(
  'src/features/projects/components/ProjectList.tsx',
  'utf8',
);
const premiumHero = fs.readFileSync(
  'src/design-system/components/PremiumHeroSurface.tsx',
  'utf8',
);
const motion = fs.readFileSync(
  'src/design-system/tokens/motion.ts',
  'utf8',
);
const voiceStatus = fs.readFileSync(
  'src/features/voice/components/VoiceRecorderStatus.tsx',
  'utf8',
);
const companionAvatar = fs.readFileSync(
  'src/features/companion/components/CompanionAvatar.tsx',
  'utf8',
);

test(
  'chat navigation callbacks remain stable so composer typing does not invalidate the message surface',
  () => {
    assert.match(
      chatScreen,
      /useCallback/,
    );
    for (const handler of [
      'handleVoice',
      'handleConversations',
      'handleProjects',
      'handleCompanion',
      'handleSettings',
      'handleNewConversation',
      'handleSend',
    ]) {
      assert.match(
        chatScreen,
        new RegExp(
          'const\\s+' + handler
          + '\\s*=\\s*useCallback',
        ),
      );
    }

    assert.match(
      chatScreen,
      /onVoice=\{handleVoice\}/,
    );
    assert.match(
      chatScreen,
      /onConversations=\{\s*handleConversations\s*\}/,
    );
    assert.match(
      chatScreen,
      /onProjects=\{\s*handleProjects\s*\}/,
    );
    assert.match(
      chatScreen,
      /onCompanion=\{\s*handleCompanion\s*\}/,
    );
    assert.match(
      chatScreen,
      /onSettings=\{\s*handleSettings\s*\}/,
    );
  },
);

test(
  'message conversation and project lists use bounded virtualization budgets',
  () => {
    assert.match(
      messageList,
      /MessageList\s*=\s*memo\(/,
    );
    assert.match(
      messageList,
      /initialNumToRender=\{18\}/,
    );
    assert.match(
      messageList,
      /maxToRenderPerBatch=\{12\}/,
    );
    assert.match(
      messageList,
      /updateCellsBatchingPeriod=\{40\}/,
    );
    assert.match(
      messageList,
      /windowSize=\{9\}/,
    );

    for (const source of [
      conversationList,
      projectList,
    ]) {
      assert.match(
        source,
        /initialNumToRender=\{12\}/,
      );
      assert.match(
        source,
        /maxToRenderPerBatch=\{10\}/,
      );
      assert.match(
        source,
        /updateCellsBatchingPeriod=\{40\}/,
      );
      assert.match(
        source,
        /windowSize=\{7\}/,
      );
      assert.match(
        source,
        /showsVerticalScrollIndicator=\{false\}/,
      );
    }
  },
);

test(
  'premium ambient motion stays semantic reduced-motion aware and UI-thread friendly',
  () => {
    assert.match(
      premiumHero,
      /active\?: boolean/,
    );
    assert.match(
      premiumHero,
      /useSharedValue/,
    );
    assert.match(
      premiumHero,
      /useAnimatedStyle/,
    );
    assert.match(
      premiumHero,
      /withRepeat/,
    );
    assert.match(
      premiumHero,
      /cancelAnimation/,
    );
    assert.match(
      premiumHero,
      /reducedMotion/,
    );
    assert.match(
      premiumHero,
      /if \(!active\)/,
    );
    assert.match(
      premiumHero,
      /motion\.duration\.ambient/,
    );
    assert.match(
      motion,
      /ambient:\s*1800/,
    );
    assert.doesNotMatch(
      premiumHero,
      /setInterval\s*\(/,
    );
    assert.doesNotMatch(
      premiumHero,
      /Math\.random/,
    );

    assert.match(
      voiceStatus,
      /<PremiumHeroSurface[\s\S]*?active=\{active\}/,
    );
    assert.match(
      companionAvatar,
      /<PremiumHeroSurface[\s\S]*?active=\{active\}/,
    );
  },
);
