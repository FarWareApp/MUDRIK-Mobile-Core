import {
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  MessageTransport,
  MessageTransportTask,
} from '../../../contracts/MessageTransport';
import { TransportCancelledError } from '../../../contracts/TransportCancelledError';
import { diagnosticsService } from '../../../core/diagnostics/DiagnosticsService';
import { ChatMessage } from '../types';

export type ChatSendError = {
  message: string;
  failedText: string;
};

export function useConversationController(
  transport: MessageTransport,
) {
  const conversationId = useMemo(
    () => `conversation-${Date.now()}`,
    [],
  );

  const activeTaskRef =
    useRef<MessageTransportTask | null>(null);

  const [messages, setMessages] =
    useState<ChatMessage[]>([]);

  const [sending, setSending] =
    useState(false);

  const [error, setError] =
    useState<ChatSendError | null>(null);

  const performSend = useCallback(
    async (
      rawText: string,
      appendUserMessage: boolean,
    ) => {
      const text = rawText.trim();

      if (!text || sending) {
        return;
      }

      setError(null);

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}-${Math.random()}`,
        role: 'user',
        text,
        createdAt: Date.now(),
      };

      if (appendUserMessage) {
        setMessages((current) => [
          ...current,
          userMessage,
        ]);
      }

      setSending(true);

      diagnosticsService.record(
        'chat',
        'message-send-start',
      );

      const task = transport.send({
        id: userMessage.id,
        conversationId,
        kind: 'text',
        text,
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

        setMessages((current) => [
          ...current,
          assistantMessage,
        ]);

        diagnosticsService.record(
          'chat',
          'message-send-complete',
        );
      } catch (caught) {
        if (caught instanceof TransportCancelledError) {
          diagnosticsService.record(
            'chat',
            'message-send-cancelled',
          );

          return;
        }

        setError({
          message: 'Unable to complete the message.',
          failedText: text,
        });

        diagnosticsService.record(
          'chat',
          'message-send-failed',
          'error',
        );
      } finally {
        activeTaskRef.current = null;
        setSending(false);
      }
    },
    [conversationId, sending, transport],
  );

  const send = useCallback(
    async (text: string) => {
      await performSend(text, true);
    },
    [performSend],
  );

  const retry = useCallback(async () => {
    if (!error) {
      return;
    }

    await performSend(error.failedText, false);
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

  const clear = useCallback(() => {
    activeTaskRef.current?.cancel();
    activeTaskRef.current = null;

    setMessages([]);
    setSending(false);
    setError(null);

    diagnosticsService.record(
      'chat',
      'conversation-cleared',
    );
  }, []);

  return {
    messages,
    sending,
    error,
    send,
    retry,
    stop,
    dismissError,
    clear,
  };
}
