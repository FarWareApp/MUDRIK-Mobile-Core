import type { AttachmentRecord } from '../../contracts/Attachment';

export type ChatRole = 'user' | 'assistant';

export type ChatAttachmentAvailability =
  | 'available'
  | 'missing';

export type ChatAttachment =
  AttachmentRecord & {
    availability:
      ChatAttachmentAvailability;
  };

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  createdAt: number;
  attachments?: ChatAttachment[];
};
