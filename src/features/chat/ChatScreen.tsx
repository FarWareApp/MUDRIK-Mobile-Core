import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { MessageTransport } from '../../contracts/MessageTransport';
import { useTheme } from '../../design-system/theme/ThemeProvider';
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
};

export function ChatScreen({
  transport,
}: Props) {
  const { colors } = useTheme();

  const [quickActionsOpen, setQuickActionsOpen] =
    useState(false);

  const {
    messages,
    sending,
    error,
    send,
    retry,
    stop,
    dismissError,
    clear,
  } = useConversationController(transport);

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
          onNewConversation={clear}
        />

        <View style={styles.content}>
          <MessageList messages={messages} />

          {sending && <SendingIndicator />}

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
          sending={sending}
          onSend={send}
          onStop={stop}
        />
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
