import type {
  AttachmentKind,
} from './Attachment';

export type MessageTransportAttachment = {
  id: string;
  kind: AttachmentKind;
  name: string;
  mimeType: string | null;
  sizeBytes: number | null;
  localUri: string;
  width: number | null;
  height: number | null;
  durationMs: number | null;
};

export type MessageTransportInput = {
  id: string;
  conversationId: string;
  kind: 'message';
  text: string;
  attachments:
    readonly MessageTransportAttachment[];
  createdAt: number;
};

export type MessageTransportOutput = {
  id: string;
  conversationId: string;
  kind: 'text';
  text: string;
  createdAt: number;
};

export type MessageTransportProgress = {
  id: string;
  conversationId: string;
  kind: 'text-delta';
  sequence: number;
  delta: string;
  createdAt: number;
};

export type MessageTransportTask = {
  result: Promise<MessageTransportOutput>;
  cancel: () => void;
  subscribe?: (
    listener: (
      progress: MessageTransportProgress,
    ) => void,
  ) => () => void;
};

export interface MessageTransport {
  send(input: MessageTransportInput): MessageTransportTask;
}
