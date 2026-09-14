import type {
  ProjectTranslationKey,
} from '../../core/localization/projectTranslations';
import type {
  ProjectDetailErrorCode,
} from './ProjectDetailErrorCode';

export function getProjectDetailErrorTranslationKey(
  code: ProjectDetailErrorCode,
): ProjectTranslationKey {
  switch (code) {
    case 'name-required':
      return 'projectNameRequired';
    case 'save-details-failed':
      return 'projectSaveDetailsFailed';
    case 'add-file-failed':
      return 'projectAddFileFailed';
    case 'open-media-failed':
      return 'projectOpenMediaFailed';
    case 'open-files-failed':
      return 'projectOpenFilesFailed';
    case 'camera-failed':
      return 'projectCameraFailed';
    case 'remove-file-failed':
      return 'projectRemoveFileFailed';
    case 'conversation-update-failed':
      return 'projectConversationUpdateFailed';
  }
}
