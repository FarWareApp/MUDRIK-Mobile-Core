import {
  AttachmentRecord,
} from './Attachment';

export interface ProjectAttachmentRepository {
  setAttachments(
    projectId: string,
    attachmentIds: string[],
  ): Promise<void>;

  add(
    projectId: string,
    attachmentId: string,
  ): Promise<void>;

  remove(
    projectId: string,
    attachmentId: string,
  ): Promise<void>;

  list(
    projectId: string,
  ): Promise<AttachmentRecord[]>;
}
