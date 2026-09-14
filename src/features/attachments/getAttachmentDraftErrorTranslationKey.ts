import type { AttachmentTranslationKey } from '../../core/localization/attachmentTranslations';
import type { AttachmentDraftErrorCode } from './AttachmentDraftErrorCode';

export function getAttachmentDraftErrorTranslationKey(
  error: AttachmentDraftErrorCode,
): AttachmentTranslationKey {
  switch (error) {
    case 'restore-failed':
      return 'attachmentRestoreFailed';
    case 'import-failed':
      return 'attachmentAddFailed';
    case 'media-picker-failed':
      return 'attachmentPhotosOpenFailed';
    case 'camera-failed':
      return 'attachmentCameraFailed';
    case 'document-picker-failed':
      return 'attachmentFilesOpenFailed';
    case 'remove-failed':
      return 'attachmentRemoveFailed';
  }
}
