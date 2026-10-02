import React, {
  useCallback,
  useMemo,
  useState,
} from 'react';
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

import { AttachmentPicker } from '../../contracts/AttachmentPicker';
import { AttachmentRepository } from '../../contracts/AttachmentRepository';
import { ConversationRepository } from '../../contracts/ConversationRepository';
import { DraftRepository } from '../../contracts/DraftRepository';
import { MessageRepository } from '../../contracts/MessageRepository';
import { MessageTransport } from '../../contracts/MessageTransport';
import { useLocale } from '../../core/localization/LocaleProvider';
import { useAppSettings } from '../../core/settings/AppSettingsProvider';
import { useTheme } from '../../design-system/theme/ThemeProvider';
import { InlineErrorBanner } from '../../shared/components/InlineErrorBanner';
import { AttachmentImportService } from '../attachments/AttachmentImportService';
import { AttachmentDraftTray } from '../attachments/components/AttachmentDraftTray';
import { AttachmentSourceSheet } from '../attachments/components/AttachmentSourceSheet';
import { getAttachmentDraftErrorTranslationKey } from '../attachments/getAttachmentDraftErrorTranslationKey';
import { useAttachmentDraftController } from '../attachments/hooks/useAttachmentDraftController';
import { AttachmentFileStore } from '../attachments/storage/AttachmentFileStore';
import { useActiveConversation } from '../conversations/ActiveConversationProvider';
import { createDraftPersistenceRepository } from './DraftPersistencePolicy';
import { ChatBootstrapState } from './components/ChatBootstrapState';
import { ChatHeader } from './components/ChatHeader';
import { MessageComposer } from './components/MessageComposer';
import { MessageList } from './components/MessageList';
import { QuickActionBackdrop } from './components/QuickActionBackdrop';
import { QuickActionButton } from './components/QuickActionButton';
import { QuickActionMenu } from './components/QuickActionMenu';
import { SendingIndicator } from './components/SendingIndicator';
import { getChatSendErrorTranslationKey } from './getChatSendErrorTranslationKey';
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

type QuickRoute =
  | '/conversations'
  | '/projects'
  | '/companion'
  | '/settings';

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
  const { t } = useLocale();
  const { settings } = useAppSettings();

  const {
    activeConversationId,
    activateConversation,
  } = useActiveConversation();

  const [
    quickActionsOpen,
    setQuickActionsOpen,
  ] = useState(false);

  const [
    attachmentSourceOpen,
    setAttachmentSourceOpen,
  ] = useState(false);

  const effectiveDraftRepository =
    useMemo<DraftRepository>(
      () =>
        createDraftPersistenceRepository(
          settings.saveDrafts,
          draftRepository,
        ),
      [
        draftRepository,
        settings.saveDrafts,
      ],
    );

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

  const {
    attachments:
      attachmentDraftAttachments,
    takePhoto:
      takeAttachmentPhoto,
    pickMedia:
      pickAttachmentMedia,
    pickDocuments:
      pickAttachmentDocuments,
    reload:
      reloadAttachmentDraft,
  } = attachmentDraft;

  const closeQuickActions =
    useCallback(() => {
      setQuickActionsOpen(false);
    }, []);

  const navigate =
    useCallback(
      (route: QuickRoute) => {
        setQuickActionsOpen(false);
        router.push(route);
      },
      [],
    );

  const openAttachmentSources =
    useCallback(() => {
      setQuickActionsOpen(false);
      setAttachmentSourceOpen(true);
    }, []);

  const takePhoto =
    useCallback(() => {
      setAttachmentSourceOpen(false);
      void takeAttachmentPhoto();
    }, [takeAttachmentPhoto]);

  const pickMedia =
    useCallback(() => {
      setAttachmentSourceOpen(false);
      void pickAttachmentMedia();
    }, [pickAttachmentMedia]);

  const pickFiles =
    useCallback(() => {
      setAttachmentSourceOpen(false);
      void pickAttachmentDocuments();
    }, [pickAttachmentDocuments]);

  const handleNewConversation =
    useCallback(() => {
      setQuickActionsOpen(false);
      void newConversation();
    }, [newConversation]);

  const handleRetryInitialization =
    useCallback(() => {
      void retryInitialization();
    }, [retryInitialization]);

  const handleVoice =
    useCallback(() => {
      setQuickActionsOpen(false);
      router.push('/voice');
    }, []);

  const handleConversations =
    useCallback(
      () => navigate('/conversations'),
      [navigate],
    );

  const handleProjects =
    useCallback(
      () => navigate('/projects'),
      [navigate],
    );

  const handleCompanion =
    useCallback(
      () => navigate('/companion'),
      [navigate],
    );

  const handleSettings =
    useCallback(
      () => navigate('/settings'),
      [navigate],
    );

  const toggleQuickActions =
    useCallback(() => {
      setQuickActionsOpen(
        (value) => !value,
      );
    }, []);

  const dismissAttachmentSource =
    useCallback(() => {
      setAttachmentSourceOpen(false);
    }, []);

  const handleRetrySend =
    useCallback(() => {
      void retry();
    }, [retry]);

  const handleSend =
    useCallback(
      async (text: string) => {
        await send(
          text,
          attachmentDraftAttachments,
        );

        await reloadAttachmentDraft();
      },
      [
        attachmentDraftAttachments,
        reloadAttachmentDraft,
        send,
      ],
    );

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
          onNewConversation={
            handleNewConversation
          }
        />

        {initializing ||
        initializationFailed ? (
          <ChatBootstrapState
            failed={initializationFailed}
            onRetry={
              handleRetryInitialization
            }
          />
        ) : (
          <>
            <View style={styles.content}>
              <MessageList
                messages={messages}
                onVoice={handleVoice}
                onConversations={
                  handleConversations
                }
                onProjects={
                  handleProjects
                }
                onCompanion={
                  handleCompanion
                }
                onSettings={
                  handleSettings
                }
              />

              {sending && (
                <SendingIndicator />
              )}

              {messages.length > 0 ? (
                <>
                  <QuickActionBackdrop
                    visible={quickActionsOpen}
                    onPress={closeQuickActions}
                  />

                  <QuickActionMenu
                    visible={quickActionsOpen}
                    onConversations={
                      handleConversations
                    }
                    onProjects={
                      handleProjects
                    }
                    onCompanion={
                      handleCompanion
                    }
                    onSettings={
                      handleSettings
                    }
                  />

                  <QuickActionButton
                    expanded={
                      quickActionsOpen
                    }
                    onPress={
                      toggleQuickActions
                    }
                  />
                </>
              ) : null}
            </View>

            {error && (
              <InlineErrorBanner
                message={t(
                  getChatSendErrorTranslationKey(
                    error.code,
                  ),
                )}
                onRetry={handleRetrySend}
                onDismiss={dismissError}
              />
            )}

            {attachmentDraft.error && (
              <InlineErrorBanner
                message={t(
                  getAttachmentDraftErrorTranslationKey(
                    attachmentDraft.error,
                  ),
                )}
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

            <AttachmentSourceSheet
              visible={attachmentSourceOpen}
              disabled={attachmentDraft.busy}
              onDismiss={
                dismissAttachmentSource
              }
              onCamera={takePhoto}
              onMedia={pickMedia}
              onFiles={pickFiles}
            />

            <MessageComposer
              value={draft}
              sending={sending}
              onChangeText={setDraft}
              onSend={handleSend}
              onStop={stop}
              onAttachmentsPress={
                openAttachmentSources
              }
              attachmentCount={
                attachmentDraft.attachments.length
              }
              onVoicePress={
                handleVoice
              }
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
