export type AttachmentKind =
  | 'image'
  | 'video'
  | 'document';

export type AttachmentSource =
  | 'library'
  | 'camera'
  | 'document';

export type AttachmentRecord = {
  id: string;
  kind: AttachmentKind;
  source: AttachmentSource;

  name: string;
  mimeType: string | null;
  sizeBytes: number | null;

  localUri: string;

  width: number | null;
  height: number | null;
  durationMs: number | null;

  createdAt: number;
};

export type PickedAttachment = {
  sourceUri: string;

  kind: AttachmentKind;
  source: AttachmentSource;

  name: string;
  mimeType: string | null;
  sizeBytes: number | null;

  width: number | null;
  height: number | null;
  durationMs: number | null;
};
