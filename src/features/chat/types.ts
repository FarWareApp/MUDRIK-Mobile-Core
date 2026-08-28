import type { AttachmentRecord } from '../../contracts/Attachment';

export type ChatRole = 'user' | 'assistant';

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  createdAt: number;
  attachments?: AttachmentRecord[];
};
