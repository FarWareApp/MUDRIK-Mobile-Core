import {
  useCallback,
  useMemo,
  useState,
} from 'react';

import { MessageTransport } from '../../../contracts/MessageTransport';
import { diagnosticsService } from '../../../core/diagnostics/DiagnosticsService';
import { ChatMessage } from '../types';

export function useConversationController(
  transport: MessageTransport,
) {
  const conversationId = useMemo(
    () => `conversation-${Date.now()}`,
    [],
  );

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);

  const send = useCallback(
    async (rawText: string) => {
      const text = rawText.trim();

      if (!text || sending) {
        return;
      }

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        text,
        createdAt: Date.now(),
      };

      setMessages((current) => [
        ...current,
        userMessage,
      ]);

      setSending(true);

      diagnosticsService.record(
        'chat',
        'message-send-start',
      );

      try {
        const output = await transport.send({
          id: userMessage.id,
          conversationId,
          kind: 'text',
          text,
          createdAt: userMessage.createdAt,
        });

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
      } catch {
        diagnosticsService.record(
          'chat',
          'message-send-failed',
          'error',
        );
      } finally {
        setSending(false);
      }
    },
    [conversationId, sending, transport],
  );

  const clear = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    sending,
    send,
    clear,
  };
}
