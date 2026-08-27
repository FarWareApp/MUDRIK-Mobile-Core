import {
  AttachmentRecord,
} from './Attachment';

export interface AttachmentRepository {
  save(
    attachment: AttachmentRecord,
  ): Promise<void>;

  getById(
    id: string,
  ): Promise<AttachmentRecord | null>;

  listForMessage(
    messageId: string,
  ): Promise<AttachmentRecord[]>;

  listForDraft(
    conversationId: string,
  ): Promise<AttachmentRecord[]>;

  attachToMessage(
    messageId: string,
    attachmentIds: string[],
  ): Promise<void>;

  setDraftAttachments(
    conversationId: string,
    attachmentIds: string[],
  ): Promise<void>;

  moveDraftAttachmentsToMessage(
    conversationId: string,
    messageId: string,
  ): Promise<void>;

  delete(
    id: string,
  ): Promise<void>;

  listOrphans():
    Promise<AttachmentRecord[]>;
}
