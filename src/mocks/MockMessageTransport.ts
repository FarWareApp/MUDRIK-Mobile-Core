import {
  MessageTransport,
  MessageTransportInput,
  MessageTransportOutput,
} from '../contracts/MessageTransport';

export class MockMessageTransport
  implements MessageTransport
{
  async send(
    input: MessageTransportInput,
  ): Promise<MessageTransportOutput> {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 350);
    });

    return {
      id: `mock-${Date.now()}`,
      conversationId: input.conversationId,
      kind: 'text',
      text: `[MOCK] ${input.text}`,
      createdAt: Date.now(),
    };
  }
}
