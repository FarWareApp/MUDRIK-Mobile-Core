import {
  MessageTransport,
  MessageTransportInput,
  MessageTransportOutput,
  MessageTransportTask,
} from '../contracts/MessageTransport';
import { TransportCancelledError } from '../contracts/TransportCancelledError';

export class MockMessageTransport implements MessageTransport {
  send(input: MessageTransportInput): MessageTransportTask {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    let rejectTask: (reason: unknown) => void = () => {};

    const result = new Promise<MessageTransportOutput>(
      (resolve, reject) => {
        rejectTask = reject;

        timer = setTimeout(() => {
          if (settled) {
            return;
          }

          settled = true;
          timer = null;

          const trimmedText =
            input.text.trim();

          const attachmentSummary =
            input.attachments.length > 0
              ? ` (${input.attachments.length} attachment${
                  input.attachments.length === 1
                    ? ''
                    : 's'
                })`
              : '';

          resolve({
            id: `mock-${Date.now()}`,
            conversationId: input.conversationId,
            kind: 'text',
            text: trimmedText
              ? `[MOCK] ${trimmedText}${attachmentSummary}`
              : `[MOCK] Received${attachmentSummary}.`,
            createdAt: Date.now(),
          });
        }, 1200);
      },
    );

    return {
      result,

      cancel: () => {
        if (settled) {
          return;
        }

        settled = true;

        if (timer) {
          clearTimeout(timer);
          timer = null;
        }

        rejectTask(new TransportCancelledError());
      },
    };
  }
}
