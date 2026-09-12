import React, {
  useMemo,
  useState,
} from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { router } from 'expo-router';
import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import { AttachmentPicker } from '../../contracts/AttachmentPicker';
import { AttachmentRepository } from '../../contracts/AttachmentRepository';
import { ConversationRepository } from '../../contracts/ConversationRepository';
import { DraftRepository } from '../../contracts/DraftRepository';
import { MessageRepository } from '../../contracts/MessageRepository';
import { MessageTransport } from '../../contracts/MessageTransport';
import { useAppSettings } from '../../core/settings/AppSettingsProvider';
import { useTheme } from '../../design-system/theme/ThemeProvider';
import { AttachmentImportService } from '../attachments/AttachmentImportService';
import { AttachmentDraftTray } from '../attachments/components/AttachmentDraftTray';
import { useAttachmentDraftController } from '../attachments/hooks/useAttachmentDraftController';
import { AttachmentFileStore } from '../attachments/storage/AttachmentFileStore';
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
  attachmentRepository: AttachmentRepository;
  attachmentPicker: AttachmentPicker;
  attachmentImportService: AttachmentImportService;
  attachmentFileStore: AttachmentFileStore;
};

export function ChatScreen({
  transport,
  conversationRepository,
  messageRepository,
  draftRepository,
  attachmentRepository,
  attachmentPicker,
  attachmentImportService,
  attachmentFileStore,
}: Props) {
  const { colors } = useTheme();
  const { settings } = useAppSettings();

  const {
    activeConversationId,
    activateConversation,
  } = useActiveConversation();

  const [
    quickActionsOpen,
    setQuickActionsOpen,
  ] = useState(false);

  const effectiveDraftRepository =
    useMemo<DraftRepository>(() => {
      if (settings.saveDrafts) {
        return draftRepository;
      }

      return {
        get: async (conversationId) => {
          await draftRepository.clear(
            conversationId,
          );

          return null;
        },

        save: async () => {
          // Draft persistence is intentionally disabled.
        },

        clear: async (conversationId) => {
          await draftRepository.clear(
            conversationId,
          );
        },
      };
    }, [
      draftRepository,
      settings.saveDrafts,
    ]);

  const {
    conversationId,
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
    draftRepository:
      effectiveDraftRepository,
    attachmentRepository,
    attachmentFileStore,
    selectedConversationId:
      activeConversationId,
    onConversationActivated:
      activateConversation,
  });

  const attachmentDraft =
    useAttachmentDraftController({
      conversationId,
      picker: attachmentPicker,
      repository: attachmentRepository,
      importer: attachmentImportService,
      fileStore: attachmentFileStore,
    });

  const openAttachmentMenu = () => {
    Alert.alert(
      'Add attachment',
      undefined,
      [
        {
          text: 'Camera',
          onPress: () => {
            void attachmentDraft.takePhoto();
          },
        },
        {
          text: 'Photos & Videos',
          onPress: () => {
            void attachmentDraft.pickMedia();
          },
        },
        {
          text: 'Files',
          onPress: () => {
            void attachmentDraft.pickDocuments();
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
    );
  };

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

            {attachmentDraft.error && (
              <ChatErrorBanner
                message={
                  attachmentDraft.error
                }
                onDismiss={
                  attachmentDraft.dismissError
                }
              />
            )}

            <AttachmentDraftTray
              attachments={attachmentDraft.attachments}
              busy={attachmentDraft.busy}
              onRemove={(attachment) => {
                void attachmentDraft.remove(attachment);
              }}
            />

            <MessageComposer
              value={draft}
              sending={sending}
              onChangeText={setDraft}
              onSend={async (text) => {
                await send(
                  text,
                  attachmentDraft.attachments,
                );

                await attachmentDraft.reload();
              }}
              onStop={stop}
              onAttachmentsPress={openAttachmentMenu}
              attachmentCount={
                attachmentDraft.attachments.length
              }
              onVoicePress={() => {
                router.push('/voice');
              }}
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
