import {
  AttachmentKind,
  PickedAttachment,
} from '../../contracts/Attachment';

const MB = 1024 * 1024;

const MAX_BYTES: Record<
  AttachmentKind,
  number
> = {
  image: 50 * MB,
  video: 1024 * MB,
  document: 250 * MB,
};

export class AttachmentValidationError
  extends Error
{
  constructor(
    public readonly code:
      | 'invalid-uri'
      | 'invalid-name'
      | 'empty-file'
      | 'file-too-large',
  ) {
    super(code);
    this.name = 'AttachmentValidationError';
  }
}

export function validatePickedAttachment(
  attachment: PickedAttachment,
): void {
  if (!attachment.sourceUri.trim()) {
    throw new AttachmentValidationError(
      'invalid-uri',
    );
  }

  if (!attachment.name.trim()) {
    throw new AttachmentValidationError(
      'invalid-name',
    );
  }

  if (
    attachment.sizeBytes !== null
    && attachment.sizeBytes <= 0
  ) {
    throw new AttachmentValidationError(
      'empty-file',
    );
  }

  if (
    attachment.sizeBytes !== null
    && attachment.sizeBytes >
      MAX_BYTES[attachment.kind]
  ) {
    throw new AttachmentValidationError(
      'file-too-large',
    );
  }
}

export function validateActualFileSize(
  kind: AttachmentKind,
  sizeBytes: number,
): void {
  if (sizeBytes <= 0) {
    throw new AttachmentValidationError(
      'empty-file',
    );
  }

  if (sizeBytes > MAX_BYTES[kind]) {
    throw new AttachmentValidationError(
      'file-too-large',
    );
  }
}
