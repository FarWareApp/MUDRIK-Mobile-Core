import React, {
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

  const openAttachmentSources = () => {
    setQuickActionsOpen(false);
    setAttachmentSourceOpen(true);
  };

  const takePhoto = () => {
    setAttachmentSourceOpen(false);
    void attachmentDraft.takePhoto();
  };

  const pickMedia = () => {
    setAttachmentSourceOpen(false);
    void attachmentDraft.pickMedia();
  };

  const pickFiles = () => {
    setAttachmentSourceOpen(false);
    void attachmentDraft.pickDocuments();
  };

  const navigate = (
    route: QuickRoute,
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
            setQuickActionsOpen(false);
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

              <QuickActionBackdrop
                visible={quickActionsOpen}
                onPress={() => {
                  setQuickActionsOpen(false);
                }}
              />

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
              <InlineErrorBanner
                message={t(
                  getChatSendErrorTranslationKey(
                    error.code,
                  ),
                )}
                onRetry={() => {
                  void retry();
                }}
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
              onDismiss={() => {
                setAttachmentSourceOpen(false);
              }}
              onCamera={takePhoto}
              onMedia={pickMedia}
              onFiles={pickFiles}
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
              onAttachmentsPress={
                openAttachmentSources
              }
              attachmentCount={
                attachmentDraft.attachments.length
              }
              onVoicePress={() => {
                setQuickActionsOpen(false);
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
