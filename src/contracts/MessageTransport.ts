export type MessageTransportInput = {
  id: string;
  conversationId: string;
  kind: 'text';
  text: string;
  createdAt: number;
};

export type MessageTransportOutput = {
  id: string;
  conversationId: string;
  kind: 'text';
  text: string;
  createdAt: number;
};

export type MessageTransportTask = {
  result: Promise<MessageTransportOutput>;
  cancel: () => void;
};

export interface MessageTransport {
  send(input: MessageTransportInput): MessageTransportTask;
}
