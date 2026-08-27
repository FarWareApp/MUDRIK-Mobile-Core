import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { router } from 'expo-router';
import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import { ConversationRepository } from '../../contracts/ConversationRepository';
import { DraftRepository } from '../../contracts/DraftRepository';
import { MessageRepository } from '../../contracts/MessageRepository';
import { MessageTransport } from '../../contracts/MessageTransport';
import { useTheme } from '../../design-system/theme/ThemeProvider';
import { useActiveConversation } from '../conversations/ActiveConversationProvider';
import { ChatBootstrapState } from './components/ChatBootstrapState';
import { ChatErrorBanner } from './components/ChatErrorBanner';
import { ChatHeader } from './components/ChatHeader';
import { MessageComposer } from './components/MessageComposer';
import { MessageList } from './components/MessageList';
import { QuickActionButton } from './components/QuickActionButton';
import { QuickActionMenu } from './components/QuickActionMenu';
import { SendingIndicator } from './components/SendingIndicator';
import { useConversationController } from './hooks/useConversationController';

type Props = {
  transport: MessageTransport;
  conversationRepository: ConversationRepository;
  messageRepository: MessageRepository;
  draftRepository: DraftRepository;
};

export function ChatScreen({
  transport,
  conversationRepository,
  messageRepository,
  draftRepository,
}: Props) {
  const { colors } = useTheme();

  const {
    activeConversationId,
    activateConversation,
  } = useActiveConversation();

  const [
    quickActionsOpen,
    setQuickActionsOpen,
  ] = useState(false);

  const {
    messages,
    draft,
    sending,
    error,
    initializing,
    initializationFailed,

    setDraft,

    send,
    retry,
    stop,
    dismissError,

    newConversation,
    retryInitialization,
  } = useConversationController({
    transport,
    conversationRepository,
    messageRepository,
    draftRepository,
    selectedConversationId:
      activeConversationId,
    onConversationActivated:
      activateConversation,
  });

  const navigate = (
    route:
      | '/conversations'
      | '/projects'
      | '/companion'
      | '/settings',
  ) => {
    setQuickActionsOpen(false);
    router.push(route);
  };

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor: colors.background,
        },
      ]}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : 'height'
        }
      >
        <ChatHeader
          onNewConversation={() => {
            void newConversation();
          }}
        />

        {initializing ||
        initializationFailed ? (
          <ChatBootstrapState
            failed={initializationFailed}
            onRetry={() => {
              void retryInitialization();
            }}
          />
        ) : (
          <>
            <View style={styles.content}>
              <MessageList
                messages={messages}
              />

              {sending && (
                <SendingIndicator />
              )}

              <QuickActionMenu
                visible={quickActionsOpen}
                onConversations={() =>
                  navigate('/conversations')
                }
                onProjects={() =>
                  navigate('/projects')
                }
                onCompanion={() =>
                  navigate('/companion')
                }
                onSettings={() =>
                  navigate('/settings')
                }
              />

              <QuickActionButton
                expanded={quickActionsOpen}
                onPress={() => {
                  setQuickActionsOpen(
                    (value) => !value,
                  );
                }}
              />
            </View>

            {error && (
              <ChatErrorBanner
                message={error.message}
                onRetry={() => {
                  void retry();
                }}
                onDismiss={dismissError}
              />
            )}

            <MessageComposer
              value={draft}
              sending={sending}
              onChangeText={setDraft}
              onSend={send}
              onStop={stop}
            />
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  flex: {
    flex: 1,
  },

  content: {
    flex: 1,
  },
});
