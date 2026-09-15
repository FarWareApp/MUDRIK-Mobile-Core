import type {
  PermissionTranslationKey,
} from '../../core/localization/permissionTranslations';
import type {
  PermissionErrorCode,
} from './hooks/usePermissionController';

export function getPermissionErrorTranslationKey(
  error: PermissionErrorCode,
): PermissionTranslationKey {
  switch (error) {
    case 'load':
      return 'permissionsLoadFailed';
    case 'request':
      return 'permissionRequestFailed';
  }
}
