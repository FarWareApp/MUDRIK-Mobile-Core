export type AttachmentPermission =
  | 'camera'
  | 'media-library';

export class AttachmentPermissionError
  extends Error
{
  constructor(
    public readonly permission:
      AttachmentPermission,
  ) {
    super(
      `Attachment permission denied: ${permission}`,
    );

    this.name =
      'AttachmentPermissionError';
  }
}
