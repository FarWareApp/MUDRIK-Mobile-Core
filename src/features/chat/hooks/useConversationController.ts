import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { AttachmentRecord } from '../../../contracts/Attachment';
import { AttachmentRepository } from '../../../contracts/AttachmentRepository';
import {
  ConversationRepository,
} from '../../../contracts/ConversationRepository';
import {
  DraftRepository,
} from '../../../contracts/DraftRepository';
import {
  MessageRepository,
} from '../../../contracts/MessageRepository';
import {
  MessageTransport,
  MessageTransportTask,
} from '../../../contracts/MessageTransport';
import { TransportCancelledError } from '../../../contracts/TransportCancelledError';
import { diagnosticsService } from '../../../core/diagnostics/DiagnosticsService';
import { AttachmentFileStore } from '../../attachments/storage/AttachmentFileStore';
import { createConversationId } from '../../conversations/createConversationId';
import { deriveConversationTitle } from '../../conversations/deriveConversationTitle';
import { ChatMessage } from '../types';

type MessageIdentity = {
  id: string;
  createdAt: number;
};

export type ChatSendError = {
  message: string;
  failedText: string;
  failedAttachments: AttachmentRecord[];
  retryAppendUserMessage: boolean;
  failedMessageId: string;
  failedCreatedAt: number;
};

type Dependencies = {
  transport: MessageTransport;
  conversationRepository: ConversationRepository;
  messageRepository: MessageRepository;
  draftRepository: DraftRepository;
  attachmentRepository: AttachmentRepository;
  attachmentFileStore: AttachmentFileStore;
  selectedConversationId: string | null;
  onConversationActivated: (id: string) => void;
};

export function useConversationController({
  transport,
  conversationRepository,
  messageRepository,
  draftRepository,
  attachmentRepository,
  attachmentFileStore,
  selectedConversationId,
  onConversationActivated,
}: Dependencies) {
  const activeTaskRef =
    useRef<MessageTransportTask | null>(null);

  const initializationGenerationRef =
    useRef(0);

  const [conversationId, setConversationId] =
    useState<string | null>(null);

  const [conversationTitle, setConversationTitle] =
    useState('');

  const [messages, setMessages] =
    useState<ChatMessage[]>([]);

  const [draft, setDraft] =
    useState('');

  const [sending, setSending] =
    useState(false);

  const [error, setError] =
    useState<ChatSendError | null>(null);

  const [initializing, setInitializing] =
    useState(true);

  const [
    initializationFailed,
    setInitializationFailed,
  ] = useState(false);

  const createFreshConversation =
    useCallback(async () => {
      const now = Date.now();

      const id = createConversationId();

      await conversationRepository.create({
        id,
        title: '',
        createdAt: now,
      });

      return id;
    }, [conversationRepository]);

  const initialize =
    useCallback(async () => {
      const generation =
        ++initializationGenerationRef.current;

      activeTaskRef.current?.cancel();
      activeTaskRef.current = null;

      setSending(false);
      setInitializing(true);
      setInitializationFailed(false);
      setError(null);

      diagnosticsService.record(
        'chat',
        'conversation-restore-start',
      );

      try {
        let conversation =
          selectedConversationId
            ? await conversationRepository.getById(
                selectedConversationId,
              )
            : await conversationRepository.getMostRecent();

        if (!conversation) {
          const id =
            await createFreshConversation();

          conversation =
            await conversationRepository.getById(id);

          if (conversation) {
            onConversationActivated(
              conversation.id,
            );
          }
        }

        if (!conversation) {
          throw new Error(
            'Conversation creation failed',
          );
        }

        const [storedMessages, storedDraft] =
          await Promise.all([
            messageRepository.listByConversation(
              conversation.id,
            ),

            draftRepository.get(
              conversation.id,
            ),
          ]);

        if (
          generation !==
          initializationGenerationRef.current
        ) {
          return;
        }

        const restoredMessages: ChatMessage[] =
          await Promise.all(
            storedMessages
              .filter(
                (message) =>
                  message.role === 'user' ||
                  message.role === 'assistant',
              )
              .map(async (message) => {
                const messageAttachments =
                  await attachmentRepository
                    .listForMessage(message.id);

                return {
                  id: message.id,
                  role: message.role as
                    | 'user'
                    | 'assistant',
                  text: message.text,
                  createdAt: message.createdAt,
                  attachments:
                    messageAttachments.map(
                      (attachment) => ({
                        ...attachment,
                        availability:
                          attachmentFileStore.exists(
                            attachment.localUri,
                          )
                            ? 'available' as const
                            : 'missing' as const,
                      }),
                    ),
                };
              }),
          );

        setConversationId(conversation.id);
        setConversationTitle(
          conversation.title,
        );
        setMessages(restoredMessages);
        setDraft(storedDraft?.text ?? '');

        diagnosticsService.record(
          'chat',
          'conversation-restore-complete',
        );
      } catch (caught) {
        diagnosticsService.record(
          'chat',
          caught instanceof Error
            ? `conversation-restore-failed:${caught.message}`
            : 'conversation-restore-failed:unknown',
          'error',
        );

        if (
          generation ===
          initializationGenerationRef.current
        ) {
          setInitializationFailed(true);
        }
      } finally {
        if (
          generation ===
          initializationGenerationRef.current
        ) {
          setInitializing(false);
        }
      }
    }, [
      attachmentFileStore,
      attachmentRepository,
      conversationRepository,
      createFreshConversation,
      draftRepository,
      messageRepository,
      onConversationActivated,
      selectedConversationId,
    ]);

  useEffect(() => {
    void initialize();

    return () => {
      activeTaskRef.current?.cancel();
      activeTaskRef.current = null;
    };
  }, [initialize]);

  useEffect(() => {
    if (
      initializing ||
      !conversationId
    ) {
      return;
    }

    const capturedConversationId =
      conversationId;

    const timer = setTimeout(() => {
      const persist = async () => {
        try {
          if (draft.length === 0) {
            await draftRepository.clear(
              capturedConversationId,
            );
          } else {
            await draftRepository.save({
              conversationId:
                capturedConversationId,
              text: draft,
              updatedAt: Date.now(),
            });
          }

          diagnosticsService.record(
            'chat',
            'draft-persisted',
          );
        } catch (caught) {
          diagnosticsService.record(
            'chat',
            caught instanceof Error
              ? `draft-persist-failed:${caught.message}`
              : 'draft-persist-failed:unknown',
            'error',
          );
        }
      };

      void persist();
    }, 250);

    return () => {
      clearTimeout(timer);
    };
  }, [
    conversationId,
    draft,
    draftRepository,
    initializing,
  ]);

  const performSend = useCallback(
    async (
      rawText: string,
      appendUserMessage: boolean,
      attachments: AttachmentRecord[] = [],
      identity?: MessageIdentity,
    ) => {
      const text = rawText.trim();

      if (
        (!text && attachments.length === 0) ||
        sending ||
        !conversationId
      ) {
        return;
      }

      setError(null);
      setSending(true);

      const createdAt =
        identity?.createdAt ?? Date.now();

      const userMessage: ChatMessage = {
        id:
          identity?.id ??
          `user-${createdAt}-${Math.random()
            .toString(36)
            .slice(2, 10)}`,
        role: 'user',
        text,
        createdAt,
        attachments:
          attachments.map(
            (attachment) => ({
              ...attachment,
              availability:
                'available' as const,
            }),
          ),
      };

      try {
        if (appendUserMessage) {
          await messageRepository.save({
            id: userMessage.id,
            conversationId,
            role: 'user',
            kind: 'text',
            text: userMessage.text,
            createdAt: userMessage.createdAt,
          });

          await attachmentRepository
            .moveDraftAttachmentsToMessage(
              conversationId,
              userMessage.id,
            );

          setMessages((current) => {
            const withoutExisting =
              current.filter(
                (message) =>
                  message.id !== userMessage.id,
              );

            return [
              ...withoutExisting,
              userMessage,
            ];
          });

          setDraft('');

          try {
            await draftRepository.clear(
              conversationId,
            );
          } catch (caught) {
            diagnosticsService.record(
              'chat',
              caught instanceof Error
                ? `draft-clear-after-send-failed:${caught.message}`
                : 'draft-clear-after-send-failed:unknown',
              'warning',
            );
          }

          try {
            if (!conversationTitle.trim()) {
              const title =
                deriveConversationTitle(
                  text ||
                  attachments[0]?.name ||
                  'Attachment',
                );

              await conversationRepository.rename(
                conversationId,
                title,
                createdAt,
              );

              setConversationTitle(title);
            } else {
              await conversationRepository.touch(
                conversationId,
                createdAt,
              );
            }
          } catch (caught) {
            diagnosticsService.record(
              'chat',
              caught instanceof Error
                ? `conversation-metadata-after-send-failed:${caught.message}`
                : 'conversation-metadata-after-send-failed:unknown',
              'warning',
            );
          }
        }

        diagnosticsService.record(
          'chat',
          'message-send-start',
        );

        const task = transport.send({
          id: userMessage.id,
          conversationId,
          kind: 'message',
          text,
          attachments: attachments.map(
            (attachment) => ({
              id: attachment.id,
              kind: attachment.kind,
              name: attachment.name,
              mimeType: attachment.mimeType,
              sizeBytes: attachment.sizeBytes,
              localUri: attachment.localUri,
              width: attachment.width,
              height: attachment.height,
              durationMs: attachment.durationMs,
            }),
          ),
          createdAt: userMessage.createdAt,
        });

        activeTaskRef.current = task;

        try {
          const output = await task.result;

          const assistantMessage: ChatMessage = {
            id: output.id,
            role: 'assistant',
            text: output.text,
            createdAt: output.createdAt,
          };

          await messageRepository.save({
            id: assistantMessage.id,
            conversationId,
            role: 'assistant',
            kind: 'text',
            text: assistantMessage.text,
            createdAt:
              assistantMessage.createdAt,
          });

          await conversationRepository.touch(
            conversationId,
            assistantMessage.createdAt,
          );

          setMessages((current) => [
            ...current,
            assistantMessage,
          ]);

          diagnosticsService.record(
            'chat',
            'message-send-complete',
          );
        } catch (caught) {
          if (
            caught instanceof
            TransportCancelledError
          ) {
            diagnosticsService.record(
              'chat',
              'message-send-cancelled',
            );

            return;
          }

          setError({
            message:
              'Unable to complete the message.',
            failedText: text,
            failedAttachments: attachments,
            retryAppendUserMessage: false,
            failedMessageId: userMessage.id,
            failedCreatedAt:
              userMessage.createdAt,
          });

          diagnosticsService.record(
            'chat',
            caught instanceof Error
              ? `message-send-failed:${caught.message}`
              : 'message-send-failed:unknown',
            'error',
          );
        } finally {
          if (
            activeTaskRef.current === task
          ) {
            activeTaskRef.current = null;
            setSending(false);
          }
        }
      } catch (caught) {
        setSending(false);

        setError({
          message:
            'Unable to save the message locally.',
          failedText: text,
          failedAttachments: attachments,
          retryAppendUserMessage: true,
          failedMessageId: userMessage.id,
          failedCreatedAt:
            userMessage.createdAt,
        });

        diagnosticsService.record(
          'chat',
          caught instanceof Error
            ? `message-persist-failed:${caught.message}`
            : 'message-persist-failed:unknown',
          'error',
        );
      }
    },
    [
      attachmentRepository,
      conversationId,
      conversationRepository,
      conversationTitle,
      draftRepository,
      messageRepository,
      sending,
      transport,
    ],
  );

  const send = useCallback(
    async (
      text: string,
      attachments: AttachmentRecord[] = [],
    ) => {
      await performSend(
        text,
        true,
        attachments,
      );
    },
    [performSend],
  );

  const retry = useCallback(async () => {
    if (!error) {
      return;
    }

    await performSend(
      error.failedText,
      error.retryAppendUserMessage,
      error.failedAttachments,
      {
        id: error.failedMessageId,
        createdAt:
          error.failedCreatedAt,
      },
    );
  }, [error, performSend]);

  const stop = useCallback(() => {
    activeTaskRef.current?.cancel();
    activeTaskRef.current = null;

    setSending(false);

    diagnosticsService.record(
      'chat',
      'message-stop-requested',
    );
  }, []);

  const dismissError = useCallback(() => {
    setError(null);
  }, []);

  const newConversation =
    useCallback(async () => {
      const generation =
        ++initializationGenerationRef.current;

      activeTaskRef.current?.cancel();
      activeTaskRef.current = null;

      setSending(false);
      setInitializing(true);
      setInitializationFailed(false);
      setError(null);

      try {
        const currentId =
          conversationId;

        if (currentId) {
          if (draft.length > 0) {
            await draftRepository.save({
              conversationId: currentId,
              text: draft,
              updatedAt: Date.now(),
            });
          } else {
            await draftRepository.clear(
              currentId,
            );
          }
        }

        const id =
          await createFreshConversation();

        if (
          generation !==
          initializationGenerationRef.current
        ) {
          return;
        }

        setConversationId(id);
        setConversationTitle('');
        setMessages([]);
        setDraft('');

        onConversationActivated(id);

        diagnosticsService.record(
          'chat',
          'new-conversation-created',
        );
      } catch (caught) {
        setInitializationFailed(true);

        diagnosticsService.record(
          'chat',
          caught instanceof Error
            ? `new-conversation-failed:${caught.message}`
            : 'new-conversation-failed:unknown',
          'error',
        );
      } finally {
        if (
          generation ===
          initializationGenerationRef.current
        ) {
          setInitializing(false);
        }
      }
    }, [
      conversationId,
      createFreshConversation,
      draft,
      draftRepository,
      onConversationActivated,
    ]);

  return {
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
    retryInitialization: initialize,
  };
}
