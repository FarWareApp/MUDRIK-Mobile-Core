import type {
  ProjectTranslationKey,
} from '../../core/localization/projectTranslations';
import type {
  ProjectListErrorCode,
} from './ProjectListErrorCode';

export function getProjectListErrorTranslationKey(
  code: ProjectListErrorCode,
): ProjectTranslationKey {
  switch (code) {
    case 'name-required':
      return 'projectNameRequired';
    case 'create-failed':
      return 'projectCreateFailed';
    case 'archive-failed':
      return 'projectArchiveUpdateFailed';
    case 'delete-failed':
      return 'projectDeleteFailed';
  }
}
